"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Exam = {
  id: string;
  user_id: string;
  subject_name: string;
  exam_date: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  subject_id: string;
};

type Subject = {
  id: string;
  name: string;
};

type StudyPlan = {
  exam: Exam;
  daysLeft: number;
  incompleteTasks: Task[];
  tasksPerDay: number;
  subjectName: string;
};

type DailyFocus = {
  subjectName: string;
  examDate: string;
  daysLeft: number;
  suggestedTasks: Task[];
};

type WeeklyLoad = {
  day: string;
  date: string;
  count: number;
  isUrgent: boolean;
};

// ─── Helper: build the AI prompt from real data ───────────────────────────────

function buildAIPrompt(
  exams: Exam[],
  tasks: Task[],
  subjects: Subject[]
): string {
  const today = new Date().toISOString().split("T")[0];

  // Only upcoming exams, sorted by urgency
  const upcoming = exams
    .filter((e) => getDaysRemaining(e.exam_date) >= 0)
    .sort((a, b) => getDaysRemaining(a.exam_date) - getDaysRemaining(b.exam_date));

  // Return empty only if truly no upcoming exams
  if (upcoming.length === 0) return "";

  const examLines = upcoming
    .map((e) => `- Subject: ${e.subject_name}, Exam Date: ${e.exam_date} (${getDaysRemaining(e.exam_date)} days left), Difficulty: ${e.difficulty}`)
    .join("\n");

  // Build per-subject task list — include even if empty
  const taskLines = upcoming.map((exam) => {
    const subject = subjects.find(
      (s) => s.name.toLowerCase() === exam.subject_name.toLowerCase()
    );
    const incompleteTasks = subject
      ? tasks.filter((t) => t.subject_id === subject.id && !t.is_completed)
      : [];

    if (incompleteTasks.length === 0) {
      return `- ${exam.subject_name}: [ {title: "General revision", difficulty: "${exam.difficulty}"}, {title: "Practice problems", difficulty: "${exam.difficulty}"} ]`;
    }

    const taskList = incompleteTasks
      .map((t) => `  {title: "${t.title}", difficulty: "${exam.difficulty}"}`)
      .join(",\n");
    return `- ${exam.subject_name}: [\n${taskList}\n]`;
  }).join("\n");

  return `You are an AI-powered study assistant. Generate a professional, actionable daily study schedule for today that is clear, structured, and realistic.

Rules:
1. Prioritize urgent exams first based on days left.
2. Assign tasks topic-wise, splitting into Morning, Afternoon, and Evening sessions.
3. Estimate time for each task realistically (20–40 min depending on difficulty).
4. Include mini-revisions for previous topics if possible.
5. Highlight urgent topics in **bold**, completed topics in *italics*.
6. Split multiple tasks across sessions without overloading any single session.
7. Output ONLY the daily schedule in readable structured format. No code, no explanations.

Current Date: ${today}

Exams:
${examLines}

Tasks:
${taskLines}

Output format:
Morning:
- **Subject — Task** (Difficulty) — X min

Afternoon:
- Subject — Task (Difficulty) — X min

Evening:
- Subject — Task (Difficulty) — X min`;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getDaysRemaining(dateStr: string): number {
  const examDate = new Date(dateStr);
  examDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calculateStudyPlan(exams: Exam[], tasks: Task[], subjects: Subject[]): StudyPlan[] {
  return exams
    .filter((e) => getDaysRemaining(e.exam_date) > 0)
    .map((exam) => {
      const daysLeft = getDaysRemaining(exam.exam_date);
      const subject = subjects.find((s) => s.name.toLowerCase() === exam.subject_name.toLowerCase());
      const incompleteTasks = subject
        ? tasks.filter((t) => t.subject_id === subject.id && !t.is_completed)
        : [];
      const tasksPerDay = incompleteTasks.length === 0 || daysLeft === 0
        ? 0
        : Math.ceil(incompleteTasks.length / daysLeft);
      return { exam, daysLeft, incompleteTasks, tasksPerDay, subjectName: exam.subject_name };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function getDailyFocus(exams: Exam[], tasks: Task[], subjects: Subject[]): DailyFocus | null {
  const upcoming = exams
    .filter((e) => getDaysRemaining(e.exam_date) >= 0)
    .sort((a, b) => getDaysRemaining(a.exam_date) - getDaysRemaining(b.exam_date));
  if (upcoming.length === 0) return null;
  const urgent = upcoming[0];
  const subject = subjects.find((s) => s.name.toLowerCase() === urgent.subject_name.toLowerCase());
  const suggestedTasks = subject
    ? tasks.filter((t) => t.subject_id === subject.id && !t.is_completed).slice(0, 3)
    : [];
  return { subjectName: urgent.subject_name, examDate: urgent.exam_date, daysLeft: getDaysRemaining(urgent.exam_date), suggestedTasks };
}

function getWeeklyLoad(exams: Exam[]): WeeklyLoad[] {
  const days: WeeklyLoad[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    const count = exams.filter((e) => e.exam_date === iso).length;
    days.push({ day: label, date: iso, count, isUrgent: count > 1 });
  }
  return days;
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function urgencyColor(days: number) {
  if (days <= 0) return { text: "text-white/30", bg: "bg-white/[0.05]", border: "border-white/[0.07]", bar: "bg-white/20", badge: "text-white/30 bg-white/[0.06]" };
  if (days <= 2) return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", bar: "bg-gradient-to-r from-red-500 to-rose-400", badge: "text-red-400 bg-red-500/15 border border-red-500/25" };
  if (days <= 7) return { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", bar: "bg-gradient-to-r from-orange-500 to-amber-400", badge: "text-orange-400 bg-orange-500/15 border border-orange-500/25" };
  return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15", bar: "bg-gradient-to-r from-emerald-500 to-teal-400", badge: "text-emerald-400 bg-emerald-500/15 border border-emerald-500/25" };
}

// ─── Schedule renderer ────────────────────────────────────────────────────────
// Parses the raw AI markdown text into styled Morning/Afternoon/Evening blocks

function ScheduleRenderer({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");

  return (
    <div className="space-y-5">
      {(() => {
        const sections: { heading: string; items: string[] }[] = [];
        let current: { heading: string; items: string[] } | null = null;

        for (const line of lines) {
          const trimmed = line.trim();
          // Section headings like "Morning:", "Afternoon:", "Evening:"
          if (/^(morning|afternoon|evening|🌅|☀️|🌙)/i.test(trimmed)) {
            if (current) sections.push(current);
            current = { heading: trimmed.replace(":", ""), items: [] };
          } else if (trimmed.startsWith("-") && current) {
            current.items.push(trimmed.slice(1).trim());
          } else if (trimmed && current) {
            // loose line — treat as item
            current.items.push(trimmed);
          }
        }
        if (current) sections.push(current);

        const sessionIcons: Record<string, string> = {
          morning: "🌅", afternoon: "☀️", evening: "🌙",
        };
        const sessionColors: Record<string, string> = {
          morning: "text-amber-400 border-amber-500/20 bg-amber-500/5",
          afternoon: "text-orange-400 border-orange-500/20 bg-orange-500/5",
          evening: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
        };

        return sections.map((section, si) => {
          const key = section.heading.toLowerCase().trim();
          const icon = sessionIcons[key] ?? "📚";
          const colorClass = sessionColors[key] ?? "text-white/60 border-white/10 bg-white/[0.03]";

          return (
            <div key={si} className={`border rounded-2xl overflow-hidden ${colorClass}`}>
              {/* Session header */}
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-bold tracking-wide capitalize">{section.heading}</span>
              </div>

              {/* Tasks */}
              <div className="divide-y divide-white/[0.04]">
                {section.items.map((item, ii) => {
                  // Parse: **bold** = urgent, *italic* = done
                  const isUrgent = /\*\*.*\*\*/.test(item);
                  const isDone = /\*[^*].*[^*]\*/.test(item) && !isUrgent;

                  // Clean markdown markers for display
                  const cleaned = item
                    .replace(/\*\*(.+?)\*\*/g, "$1")
                    .replace(/\*(.+?)\*/g, "$1");

                  // Extract time estimate e.g. "— 40 min"
                  const timeMatch = cleaned.match(/—\s*(\d+\s*min)/i);
                  const timeLabel = timeMatch ? timeMatch[1] : null;
                  const label = cleaned.replace(/—\s*\d+\s*min/i, "").replace(/—\s*$/, "").trim();

                  return (
                    <div key={ii} className={`flex items-center gap-3 px-4 py-3 ${isDone ? "opacity-50" : ""}`}>
                      {/* Urgency dot */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUrgent ? "bg-red-400" : isDone ? "bg-emerald-400" : "bg-white/20"}`} />

                      {/* Label */}
                      <p className={`flex-1 text-sm leading-snug ${isUrgent ? "text-white font-semibold" : isDone ? "text-white/35 line-through" : "text-white/70"}`}>
                        {label}
                      </p>

                      {/* Time badge */}
                      {timeLabel && (
                        <span className="shrink-0 text-[10px] font-semibold text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full tabular-nums">
                          {timeLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#13131f] border border-white/[0.10] rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-white/50 mb-0.5">{label}</p>
      <p className="text-white font-bold">{payload[0].value} exam{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-white/[0.08] rounded-xl ${className ?? ""}`} style={style} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48" /><Skeleton className="h-48" />
      </div>
      <Skeleton className="h-56 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      {["Morning", "Afternoon", "Evening"].map((s) => (
        <div key={s} className="border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03]">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-4 space-y-2.5">
            {[1, 2].map((i) => <Skeleton key={i} className="h-8" style={{ width: `${55 + i * 15}%` }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdvancedExamPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [dailyFocus, setDailyFocus] = useState<DailyFocus | null>(null);
  const [weeklyLoad, setWeeklyLoad] = useState<WeeklyLoad[]>([]);
  const [focusResult, setFocusResult] = useState<DailyFocus | null>(null);
  const [focusGenerated, setFocusGenerated] = useState(false);

  // AI schedule state
  const [aiSchedule, setAiSchedule] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // ── Auth + fetch ──
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);

      const [
        { data: examsData },
        { data: tasksData },
        { data: subjectsData },
      ] = await Promise.all([
        supabase.from("exams").select("id, user_id, subject_name, exam_date, difficulty").eq("user_id", user.id).order("exam_date", { ascending: true }),
        supabase.from("tasks").select("id, title, is_completed, subject_id").eq("user_id", user.id),
        supabase.from("subjects").select("id, name").eq("user_id", user.id),
      ]);

      const e = (examsData as Exam[]) ?? [];
      const t = (tasksData as Task[]) ?? [];
      const s = (subjectsData as Subject[]) ?? [];

      setExams(e);
      setTasks(t);
      setSubjects(s);
      setStudyPlans(calculateStudyPlan(e, t, s));
      setDailyFocus(getDailyFocus(e, t, s));
      setWeeklyLoad(getWeeklyLoad(e));
      setLoading(false);
    };
    init();
  }, [router]);

  // ── AI Schedule Generator ──
  const handleGenerateSchedule = useCallback(async () => {
    const prompt = buildAIPrompt(exams, tasks, subjects);
    if (!prompt) {
      toast("Add at least one upcoming exam first!", { icon: "📭" });
      return;
    }

    setAiLoading(true);
    setAiGenerated(true);
    setAiSchedule("");

    try {
      const response = await fetch("/api/ai-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      const text = data.text ?? "";

      setAiSchedule(text || "Could not generate schedule. Please try again.");
      if (text) {
        toast("Schedule generated! 🗓️", {
          icon: "✨",
          style: { background: "#1e1a2e", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", fontSize: "13px" },
        });
      }
    } catch (err) {
      console.error("Schedule generation error:", err);
      toast.error("Failed to generate schedule. Check your API key in .env.local");
      setAiGenerated(false);
    } finally {
      setAiLoading(false);
    }
  }, [exams, tasks, subjects]);

  // ── What to Study handler ──
  const handleWhatToStudy = useCallback(() => {
    const focus = getDailyFocus(exams, tasks, subjects);
    setFocusResult(focus);
    setFocusGenerated(true);

    if (!focus) {
      toast("No upcoming exams found!", { icon: "📭" });
      return;
    }
    if (focus.suggestedTasks.length === 0) {
      toast(`Study ${focus.subjectName} — all tasks done! 🎉`, {
        icon: "✅",
        style: { background: "#1e2a1e", color: "#6ee7b7", border: "1px solid rgba(110,231,183,0.2)", fontSize: "13px" },
      });
      return;
    }
    toast(`Focus: ${focus.subjectName} — ${focus.suggestedTasks[0].title}`, {
      icon: "🔥",
      duration: 4000,
      style: { background: "#1e1a2e", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)", fontSize: "13px" },
    });
  }, [exams, tasks, subjects]);

  const upcomingCount = exams.filter((e) => getDaysRemaining(e.exam_date) >= 0).length;

  return (
    <div className="min-h-screen bg-[#08080f] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[300px] bg-amber-700/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-700/6 blur-[100px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-md px-4 sm:px-8 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/exam-mode")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors duration-200 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">Exam Mode</span>
          </button>
          <span className="text-white/15 shrink-0">·</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight truncate">Advanced Study Planner</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleWhatToStudy}
            disabled={upcomingCount === 0 || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="hidden sm:inline">What to Study?</span>
          </button>

          <button
            onClick={handleGenerateSchedule}
            disabled={upcomingCount === 0 || loading || aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 hover:border-violet-500/40 text-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {aiLoading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Generating…</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>AI Schedule</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {loading ? <PageSkeleton /> : (
          <>
            {/* ── AI Schedule Section ── */}
            {aiGenerated && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold tracking-tight">AI Daily Schedule</h2>
                  <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                  {!aiLoading && aiSchedule && (
                    <button
                      onClick={handleGenerateSchedule}
                      className="ml-auto text-[11px] text-white/30 hover:text-violet-400 flex items-center gap-1 transition-colors duration-150"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Regenerate
                    </button>
                  )}
                </div>

                <div className="bg-white/[0.02] border border-violet-500/15 rounded-2xl overflow-hidden">
                  {/* Header bar */}
                  <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2 bg-violet-500/5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <span className="text-[11px] text-white/25 ml-2">Generated by Claude · Today&apos;s Plan</span>
                  </div>

                  <div className="p-5">
                    {aiLoading ? (
                      <ScheduleSkeleton />
                    ) : (
                      <ScheduleRenderer text={aiSchedule} />
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ── Daily Focus (shows before AI is generated) ── */}
            {dailyFocus && !focusGenerated && !aiGenerated && (
              <section>
                <div className={`relative overflow-hidden rounded-2xl border p-5 ${urgencyColor(dailyFocus.daysLeft).border} bg-white/[0.03]`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🔥</span>
                    <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest">Most Urgent Exam</h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ml-auto ${urgencyColor(dailyFocus.daysLeft).badge}`}>
                      {dailyFocus.daysLeft <= 0 ? "Today!" : `${dailyFocus.daysLeft}d left`}
                    </span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{dailyFocus.subjectName}</p>
                  <p className="text-xs text-white/30 mt-0.5">Exam on {formatShortDate(dailyFocus.examDate)}</p>
                  <p className="text-xs text-white/20 mt-3">Click "AI Schedule" for a full day plan →</p>
                </div>
              </section>
            )}

            {/* ── Focus Result (from "What to Study?" button) ── */}
            {focusGenerated && focusResult && (
              <section>
                <div className={`relative overflow-hidden rounded-2xl border p-5 ${urgencyColor(focusResult.daysLeft).border} bg-white/[0.03]`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔥</span>
                      <h2 className="text-sm font-bold text-white uppercase tracking-widest">Focus Today</h2>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ml-auto ${urgencyColor(focusResult.daysLeft).badge}`}>
                        {focusResult.daysLeft <= 0 ? "Today!" : `${focusResult.daysLeft}d left`}
                      </span>
                    </div>
                    <p className="text-xl font-bold tracking-tight mb-1">{focusResult.subjectName}</p>
                    <p className="text-xs text-white/35 mb-4">Exam on {formatShortDate(focusResult.examDate)}</p>
                    {focusResult.suggestedTasks.length === 0 ? (
                      <p className="text-sm text-emerald-400 font-medium">🎉 All tasks done for this subject!</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Suggested Tasks</p>
                        {focusResult.suggestedTasks.map((t, i) => (
                          <div key={t.id} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                            <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-amber-500/25 text-amber-400" : "bg-white/[0.07] text-white/30"}`}>{i + 1}</span>
                            <span className="text-sm text-white/80">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ── Weekly Load Chart ── */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold tracking-tight">Weekly Exam Load</h2>
                <span className="text-xs bg-white/[0.07] text-white/40 px-2 py-0.5 rounded-full">Next 7 days</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5">
                {weeklyLoad.every((d) => d.count === 0) ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <p className="text-white/30 text-sm">No exams in the next 7 days</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyLoad} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.30)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.20)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {weeklyLoad.map((entry, index) => (
                          <Cell key={`cell-${index}`}
                            fill={entry.count === 0 ? "rgba(255,255,255,0.05)" : entry.isUrgent ? "rgba(239,68,68,0.70)" : "rgba(139,92,246,0.65)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-violet-500/65" /><span className="text-[10px] text-white/30">1 exam</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/70" /><span className="text-[10px] text-white/30">Multiple exams</span></div>
                </div>
              </div>
            </section>

            {/* ── Auto Study Plans ── */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold tracking-tight">Auto Study Plans</h2>
                <span className="text-xs bg-white/[0.07] text-white/40 px-2 py-0.5 rounded-full">{studyPlans.length} upcoming</span>
              </div>
              {studyPlans.length === 0 ? (
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-8 text-center">
                  <p className="text-white/30 text-sm">No upcoming exams with tasks found.</p>
                  <p className="text-white/15 text-xs mt-1">Add exams and tasks to generate study plans.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studyPlans.map((plan) => {
                    const uc = urgencyColor(plan.daysLeft);
                    return (
                      <div key={plan.exam.id} className={`bg-white/[0.02] border ${uc.border} rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/[0.04] transition-all duration-200`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-base tracking-tight">{plan.subjectName}</h3>
                            <p className="text-xs text-white/30 mt-0.5">Exam on {formatShortDate(plan.exam.exam_date)}</p>
                          </div>
                          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${uc.badge}`}>{plan.daysLeft}d left</span>
                        </div>

                        {plan.incompleteTasks.length === 0 ? (
                          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
                            <span className="text-emerald-400 text-sm">🎉</span>
                            <p className="text-sm text-emerald-400 font-medium">All tasks complete!</p>
                          </div>
                        ) : (
                          <div className={`${uc.bg} border ${uc.border} rounded-xl px-3.5 py-2.5`}>
                            <p className="text-xs text-white/40 mb-0.5">Daily target</p>
                            <p className={`text-lg font-black ${uc.text}`}>{plan.tasksPerDay} task{plan.tasksPerDay !== 1 ? "s" : ""} / day</p>
                            <p className="text-[11px] text-white/25 mt-0.5">{plan.incompleteTasks.length} tasks across {plan.daysLeft} day{plan.daysLeft !== 1 ? "s" : ""}</p>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between text-[10px] text-white/25 mb-1.5">
                            <span>{plan.incompleteTasks.length} remaining</span>
                            <span>{plan.tasksPerDay > 0 ? `${plan.tasksPerDay}/day` : "done"}</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${uc.bar}`}
                              style={{ width: plan.incompleteTasks.length === 0 ? "100%" : `${Math.min(100, (plan.tasksPerDay / Math.max(plan.incompleteTasks.length, 1)) * 100 * plan.daysLeft)}%` }} />
                          </div>
                        </div>

                        {plan.incompleteTasks.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-white/25 uppercase font-semibold tracking-wider">Up next</p>
                            {plan.incompleteTasks.slice(0, plan.tasksPerDay).map((t) => (
                              <div key={t.id} className="flex items-center gap-2.5 py-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                <span className="text-xs text-white/55 truncate">{t.title}</span>
                              </div>
                            ))}
                            {plan.incompleteTasks.length > plan.tasksPerDay && (
                              <p className="text-[10px] text-white/20 pl-4">+{plan.incompleteTasks.length - plan.tasksPerDay} more tasks</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Stats row ── */}
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Upcoming Exams", value: exams.filter((e) => getDaysRemaining(e.exam_date) >= 0).length, color: "text-violet-400" },
                  { label: "Total Tasks", value: tasks.length, color: "text-white/70" },
                  { label: "Completed", value: tasks.filter((t) => t.is_completed).length, color: "text-emerald-400" },
                  { label: "Remaining", value: tasks.filter((t) => !t.is_completed).length, color: "text-amber-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 text-center hover:bg-white/[0.04] transition-all duration-200">
                    <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
                    <p className="text-[10px] text-white/25 mt-1 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </section>

          </>
        )}
      </div>
    </div>
  );
}
