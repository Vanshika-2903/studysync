import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeKey =
  | "streak_7"   | "streak_30"   | "streak_100"
  | "tasks_10"   | "tasks_50"    | "tasks_100"
  | "focus_5"    | "focus_20"    | "focus_50"
  | "subjects_5"
  | "level_5";

export type Achievement = {
  id: string;
  user_id: string;
  badge_key: BadgeKey;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
};

// ─── Master badge catalogue ───────────────────────────────────────────────────
// This is the single source of truth for ALL badges.
// Locked badges are derived by diffing this against the user's unlocked set.

export type BadgeDef = {
  key: BadgeKey;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "tasks" | "focus" | "subjects" | "xp";
  rarity: "common" | "rare" | "epic" | "legendary";
  gradient: string;   // tailwind gradient classes for unlocked glow
  glowColor: string;  // hex for box-shadow
};

export const ALL_BADGES: BadgeDef[] = [
  // ── Streak ──
  {
    key: "streak_7",
    title: "Bronze Streak",
    description: "Maintain a 7-day study streak.",
    icon: "🔥",
    category: "streak",
    rarity: "common",
    gradient: "from-amber-700/40 to-orange-600/30",
    glowColor: "#f59e0b",
  },
  {
    key: "streak_30",
    title: "Silver Streak",
    description: "Maintain a 30-day study streak.",
    icon: "⚡",
    category: "streak",
    rarity: "rare",
    gradient: "from-slate-400/30 to-zinc-300/20",
    glowColor: "#94a3b8",
  },
  {
    key: "streak_100",
    title: "Gold Streak",
    description: "Maintain a 100-day study streak.",
    icon: "🏆",
    category: "streak",
    rarity: "legendary",
    gradient: "from-yellow-500/40 to-amber-400/30",
    glowColor: "#fbbf24",
  },

  // ── Tasks ──
  {
    key: "tasks_10",
    title: "Getting Started",
    description: "Complete 10 tasks.",
    icon: "✅",
    category: "tasks",
    rarity: "common",
    gradient: "from-emerald-600/35 to-teal-500/25",
    glowColor: "#10b981",
  },
  {
    key: "tasks_50",
    title: "Taskmaster",
    description: "Complete 50 tasks.",
    icon: "💪",
    category: "tasks",
    rarity: "rare",
    gradient: "from-emerald-500/40 to-green-400/30",
    glowColor: "#34d399",
  },
  {
    key: "tasks_100",
    title: "Century Club",
    description: "Complete 100 tasks. You're unstoppable.",
    icon: "💯",
    category: "tasks",
    rarity: "epic",
    gradient: "from-green-400/40 to-emerald-300/30",
    glowColor: "#6ee7b7",
  },

  // ── Focus ──
  {
    key: "focus_5",
    title: "First Focus",
    description: "Complete 5 Pomodoro focus sessions.",
    icon: "⏱",
    category: "focus",
    rarity: "common",
    gradient: "from-sky-600/35 to-blue-500/25",
    glowColor: "#3b82f6",
  },
  {
    key: "focus_20",
    title: "Deep Work",
    description: "Complete 20 focus sessions.",
    icon: "🎯",
    category: "focus",
    rarity: "rare",
    gradient: "from-blue-500/40 to-indigo-400/30",
    glowColor: "#6366f1",
  },
  {
    key: "focus_50",
    title: "Flow State",
    description: "Complete 50 focus sessions. True mastery.",
    icon: "🧠",
    category: "focus",
    rarity: "epic",
    gradient: "from-violet-500/40 to-purple-400/30",
    glowColor: "#8b5cf6",
  },

  // ── Subjects ──
  {
    key: "subjects_5",
    title: "Scholar",
    description: "Create 5 subjects to study.",
    icon: "📚",
    category: "subjects",
    rarity: "common",
    gradient: "from-fuchsia-600/35 to-pink-500/25",
    glowColor: "#ec4899",
  },

  // ── XP / Level ──
  {
    key: "level_5",
    title: "Level Up",
    description: "Reach Level 5 by earning XP.",
    icon: "⭐",
    category: "xp",
    rarity: "epic",
    gradient: "from-rose-500/40 to-pink-400/30",
    glowColor: "#f43f5e",
  },
];

export const RARITY_CONFIG = {
  common:    { label: "Common",    color: "#6b7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.25)" },
  rare:      { label: "Rare",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.25)"  },
  epic:      { label: "Epic",      color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.25)"  },
  legendary: { label: "Legendary", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)"  },
};

// ─── Fetch user achievements ───────────────────────────────────────────────────

export async function fetchAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    console.error("fetchAchievements error:", error);
    return [];
  }
  return (data as Achievement[]) ?? [];
}

// ─── Core unlock function ─────────────────────────────────────────────────────

async function unlockBadge(userId: string, def: BadgeDef): Promise<boolean> {
  // Check if already unlocked to prevent duplicates
  const { data: existing } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_key", def.key)
    .single();

  if (existing) return false; // Already unlocked

  const { error } = await supabase.from("achievements").insert({
    user_id:     userId,
    badge_key:   def.key,
    title:       def.title,
    description: def.description,
    icon:        def.icon,
    unlocked_at: new Date().toISOString(),
  });

  if (error) {
    console.error("unlockBadge error:", error);
    return false;
  }

  // Show toast
  const rarityCol = RARITY_CONFIG[def.rarity].color;
  toast(
    `${def.icon}  ${def.title} unlocked!`,
    {
      duration: 5000,
      style: {
        background: "#0f0f1e",
        color: "#fff",
        border: `1px solid ${rarityCol}50`,
        fontSize: "13px",
        fontWeight: "700",
        padding: "12px 16px",
      },
      icon: "🏆",
    }
  );

  return true;
}

// ─── Check streak badges ───────────────────────────────────────────────────────

export async function checkStreakBadges(userId: string, streakDays: number) {
  const milestones: Array<{ days: number; key: BadgeKey }> = [
    { days: 7,   key: "streak_7"   },
    { days: 30,  key: "streak_30"  },
    { days: 100, key: "streak_100" },
  ];
  for (const m of milestones) {
    if (streakDays >= m.days) {
      const def = ALL_BADGES.find(b => b.key === m.key)!;
      await unlockBadge(userId, def);
    }
  }
}

// ─── Check task completion badges ─────────────────────────────────────────────

export async function checkTaskBadges(userId: string) {
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", true);

  const completed = count ?? 0;
  const milestones: Array<{ threshold: number; key: BadgeKey }> = [
    { threshold: 10,  key: "tasks_10"  },
    { threshold: 50,  key: "tasks_50"  },
    { threshold: 100, key: "tasks_100" },
  ];
  for (const m of milestones) {
    if (completed >= m.threshold) {
      const def = ALL_BADGES.find(b => b.key === m.key)!;
      await unlockBadge(userId, def);
    }
  }
}

// ─── Check focus session badges ───────────────────────────────────────────────

export async function checkFocusBadges(userId: string) {
  // We track focus sessions in a 'focus_sessions' table.
  // Gracefully handle if table doesn't exist yet.
  const { count, error } = await supabase
    .from("focus_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return; // Table may not exist yet

  const sessions = count ?? 0;
  const milestones: Array<{ threshold: number; key: BadgeKey }> = [
    { threshold: 5,  key: "focus_5"  },
    { threshold: 20, key: "focus_20" },
    { threshold: 50, key: "focus_50" },
  ];
  for (const m of milestones) {
    if (sessions >= m.threshold) {
      const def = ALL_BADGES.find(b => b.key === m.key)!;
      await unlockBadge(userId, def);
    }
  }
}

// ─── Check subject badges ─────────────────────────────────────────────────────

export async function checkSubjectBadges(userId: string) {
  const { count } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total >= 5) {
    const def = ALL_BADGES.find(b => b.key === "subjects_5")!;
    await unlockBadge(userId, def);
  }
}

// ─── Check XP / Level badges ──────────────────────────────────────────────────

export async function checkXpBadges(userId: string, xp: number) {
  const level = Math.floor(xp / 100) + 1;
  if (level >= 5) {
    const def = ALL_BADGES.find(b => b.key === "level_5")!;
    await unlockBadge(userId, def);
  }
}

// ─── Master check — call this after any significant action ────────────────────

export async function checkAllBadges(userId: string, opts: {
  streakDays?: number;
  xp?: number;
}) {
  const checks: Promise<void>[] = [
    checkTaskBadges(userId),
    checkFocusBadges(userId),
    checkSubjectBadges(userId),
  ];
  if (opts.streakDays !== undefined) checks.push(checkStreakBadges(userId, opts.streakDays));
  if (opts.xp         !== undefined) checks.push(checkXpBadges(userId, opts.xp));
  await Promise.all(checks);
}
