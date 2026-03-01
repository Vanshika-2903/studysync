import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

// ─── Milestone definitions ────────────────────────────────────────────────────

const MILESTONES = [
  { days: 7,   label: "Bronze",  emoji: "🥉", color: "#cd7f32" },
  { days: 30,  label: "Silver",  emoji: "🥈", color: "#c0c0c0" },
  { days: 100, label: "Gold",    emoji: "🥇", color: "#ffd700" },
];

function checkMilestone(prev: number, next: number) {
  for (const m of MILESTONES) {
    // Only fires when crossing the threshold (not on every call)
    if (prev < m.days && next >= m.days) return m;
  }
  return null;
}

// ─── Core streak update ───────────────────────────────────────────────────────

export async function updateStreak(userId: string): Promise<StreakData | null> {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  // Fetch existing streak row
  const { data, error } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found — that's fine, we'll create it
    console.error("Streak fetch error:", error);
    return null;
  }

  const existing = data as StreakData | null;
  const lastActive = existing?.last_active_date ?? null;

  // ── Already active today — do nothing ──
  if (lastActive === today) {
    return existing;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const prevStreak = existing?.current_streak ?? 0;
  let newStreak: number;

  if (lastActive === yesterdayStr) {
    // Consecutive day → extend streak
    newStreak = prevStreak + 1;
  } else {
    // Missed a day or brand new → reset to 1
    newStreak = 1;
  }

  const newLongest = Math.max(existing?.longest_streak ?? 0, newStreak);

  const updated: StreakData = {
    current_streak: newStreak,
    longest_streak: newLongest,
    last_active_date: today,
  };

  // Upsert — insert if no row exists, update if it does
  const { error: upsertError } = await supabase
    .from("user_streaks")
    .upsert({ user_id: userId, ...updated }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("Streak upsert error:", upsertError);
    return null;
  }

  // ── Milestone toast ──
  const milestone = checkMilestone(prevStreak, newStreak);
  if (milestone) {
    toast(`${milestone.emoji} ${milestone.label} Streak! ${newStreak} days!`, {
      duration: 5000,
      style: {
        background: "#1a1a2e",
        color: "#fff",
        border: `1px solid ${milestone.color}40`,
        fontSize: "14px",
        fontWeight: "700",
      },
    });
  }

  return updated;
}

// ─── Fetch current streak (read-only) ────────────────────────────────────────

export async function fetchStreak(userId: string): Promise<StreakData> {
  const { data } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .single();

  return (data as StreakData) ?? { current_streak: 0, longest_streak: 0, last_active_date: null };
}

// ─── Milestone helpers (used by UI) ──────────────────────────────────────────

export function getMilestone(streak: number) {
  // Return the highest milestone achieved
  const achieved = MILESTONES.filter((m) => streak >= m.days);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
}

export function getNextMilestone(streak: number) {
  return MILESTONES.find((m) => streak < m.days) ?? null;
}
