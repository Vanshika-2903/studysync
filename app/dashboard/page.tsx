"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { updateStreak, fetchStreak, type StreakData } from "@/lib/streak";
import { getSmartReminder, type SmartReminder } from "@/lib/smartReminder";
import SmartReminderBanner from "@/app/components/SmartReminderBanner";
import ThemeToggle from "@/app/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────
type Subject = { id: string; name: string; user_id: string };
type Task = { id: string; title: string; deadline: string | null; is_completed: boolean; subject_id: string; user_id: string };
type Subtask = { id: string; title: string; is_completed: boolean; task_id: string; user_id: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDeadline(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  return { formatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), diff };
}

function getProgressColor(pct: number) {
  if (pct === 100) return { from: "#10b981", to: "#34d399" };
  if (pct >= 60) return { from: "#7c3aed", to: "#6366f1" };
  if (pct >= 30) return { from: "#f59e0b", to: "#f97316" };
  return { from: "#ef4444", to: "#f43f5e" };
}

const PALETTE = [
  { accent: "#8b5cf6", glow: "#7c3aed22", dot: "#a78bfa", border: "rgba(139,92,246,0.2)", activeBg: "rgba(109,40,217,0.18)", text: "#c4b5fd" },
  { accent: "#38bdf8", glow: "#0ea5e922", dot: "#7dd3fc", border: "rgba(56,189,248,0.2)", activeBg: "rgba(14,165,233,0.18)", text: "#bae6fd" },
  { accent: "#f472b6", glow: "#ec489922", dot: "#f9a8d4", border: "rgba(244,114,182,0.2)", activeBg: "rgba(236,72,153,0.18)", text: "#fbcfe8" },
  { accent: "#34d399", glow: "#10b98122", dot: "#6ee7b7", border: "rgba(52,211,153,0.2)", activeBg: "rgba(16,185,129,0.18)", text: "#a7f3d0" },
  { accent: "#fbbf24", glow: "#f59e0b22", dot: "#fde68a", border: "rgba(251,191,36,0.2)", activeBg: "rgba(245,158,11,0.18)", text: "#fef3c7" },
  { accent: "#f87171", glow: "#ef444422", dot: "#fca5a5", border: "rgba(248,113,113,0.2)", activeBg: "rgba(239,68,68,0.18)", text: "#fee2e2" },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    href: "/dashboard", label: "Dashboard", s: "Home", g: "from-violet-500 to-indigo-500", glow: "shadow-violet-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
  },
  {
    href: "/assignments", label: "Assignments", s: "Tasks", g: "from-sky-500 to-blue-500", glow: "shadow-sky-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
  },
  {
    href: "/labs", label: "Labs", s: "Labs", g: "from-fuchsia-500 to-purple-500", glow: "shadow-fuchsia-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01-.659 1.591l-1.591 1.591M19.8 15l-3.346 3.346a2.25 2.25 0 01-1.591.659H9.137a2.25 2.25 0 01-1.591-.659L4.2 15m15.6 0H4.2" /></svg>
  },
  {
    href: "/calendar", label: "Calendar", s: "Cal", g: "from-cyan-500 to-teal-500", glow: "shadow-cyan-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
  },
  {
    href: "/achievements", label: "Achievements", s: "Badges", g: "from-amber-500 to-orange-500", glow: "shadow-amber-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" /></svg>
  },
  {
    href: "/exam-mode", label: "Exams", s: "Exams", g: "from-red-500 to-orange-500", glow: "shadow-red-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
  },
  {
    href: "/timer", label: "Timer", s: "Timer", g: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/30",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
];

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────
function SidebarLink({ item, active }: { item: typeof NAV_ITEMS[0]; active: boolean }) {
  return (
    <a href={item.href}
      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${active
        ? `bg-gradient-to-r ${item.g} text-white shadow-lg ${item.glow}`
        : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
        }`}>
      <span className={`shrink-0 ${active ? "text-white" : "text-white/35 group-hover:text-white/60"}`}>{item.icon}</span>
      <span className="truncate">{item.label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />}
    </a>
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 hover:bg-white/[0.06] px-3 py-2 rounded-2xl transition-all duration-200 group border border-transparent hover:border-white/[0.08]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/30">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-white/70 max-w-[110px] truncate">{user.email?.split("@")[0]}</p>
          <p className="text-[10px] text-white/25">Account</p>
        </div>
        <svg className={`w-3.5 h-3.5 text-white/20 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-[#0f0f1e] border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
              <div className="min-w-0"><p className="text-xs font-semibold text-white truncate">{user.email}</p><p className="text-[10px] text-white/30">StudySync</p></div>
            </div>
            <div className="p-1.5">
              <button onClick={() => { setOpen(false); onSignOut(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-all duration-150">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hero Header (XP + Streak) ────────────────────────────────────────────────
function HeroHeader({ user, xp, streak, streakLoading }: { user: User; xp: number; streak: StreakData; streakLoading: boolean }) {
  const level = Math.floor(xp / 100) + 1;
  const xpInto = xp % 100;
  const pct = xpInto;
  const name = user.email?.split("@")[0] ?? "Student";
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative rounded-3xl overflow-hidden mb-7 border border-white/[0.07]"
      style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.2) 0%, rgba(99,102,241,0.12) 40%, rgba(30,30,60,0.3) 100%)" }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-8 -left-8 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      </div>

      <div className="relative px-6 py-6 sm:py-7">
        <div className="flex flex-wrap items-start justify-between gap-5">

          {/* Left — greeting */}
          <div>
            <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-1">{greeting} ✦</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{displayName}</h1>
            <p className="text-white/35 text-sm mt-1.5">
              {streak.current_streak > 0
                ? `${streak.current_streak} day streak going strong 🔥`
                : "Start your streak today!"}
            </p>
          </div>

          {/* Right — badges */}
          <div className="flex items-center gap-3">
            {/* Level badge */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex flex-col items-center justify-center shadow-xl shadow-violet-500/40 border border-violet-400/20">
                <span className="text-[9px] font-bold text-violet-300/70 uppercase tracking-widest leading-none">LVL</span>
                <span className="text-2xl font-black text-white leading-none tabular-nums">{level}</span>
              </div>
              <div className="absolute -inset-1.5 rounded-3xl bg-violet-500/15 blur-lg -z-10" />
            </div>

            {/* Streak badge */}
            {streakLoading ? (
              <div className="w-14 h-14 rounded-2xl bg-white/[0.07] animate-pulse" />
            ) : (
              <div className="relative">
                <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600/25 to-red-600/25 border border-orange-500/30 flex flex-col items-center justify-center shadow-xl shadow-orange-500/20">
                  <span className="text-xl leading-none">🔥</span>
                  <span className="text-sm font-black text-orange-300 tabular-nums leading-tight">{streak.current_streak}</span>
                </motion.div>
                <div className="absolute -inset-1.5 rounded-3xl bg-orange-500/10 blur-lg -z-10" />
              </div>
            )}
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/30 font-semibold">XP Progress · Level {level}</span>
            <span className="text-xs font-black text-violet-300 tabular-nums">{xpInto} / 100</span>
          </div>
          <div className="relative h-3 bg-black/30 rounded-full overflow-hidden border border-white/[0.06]">
            <motion.div
              key={xpInto}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.4, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: "linear-gradient(90deg, #7c3aed, #6366f1, #a78bfa)" }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: "2s" }} />
            </motion.div>
          </div>
          <p className="text-[10px] text-white/20 mt-1.5">{100 - xpInto} XP to Level {level + 1} · {xp} total</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Overall Stats Bar ────────────────────────────────────────────────────────
function StatsBar({ totalSubjects, totalTasks, completedTasks }: { totalSubjects: number; totalTasks: number; completedTasks: number }) {
  const overallPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const col = getProgressColor(overallPct);

  const stats = [
    { label: "Subjects", val: totalSubjects, icon: "📚", color: "#8b5cf6" },
    { label: "Tasks", val: totalTasks, icon: "📋", color: "#60a5fa" },
    { label: "Completed", val: completedTasks, icon: "✅", color: "#34d399" },
    { label: "Progress", val: `${overallPct}%`, icon: "📈", color: col.from },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
      {stats.map(({ label, val, icon, color }, i) => (
        <motion.div key={label} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
          className="relative group bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-3.5 flex flex-col gap-1 overflow-hidden hover:border-white/15 transition-all duration-300"
          style={{ boxShadow: `0 0 0 0 ${color}` }}
          whileHover={{ y: -2 } as any}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
            style={{ background: `radial-gradient(circle at 30% 50%, ${color}08 0%, transparent 70%)` }} />
          <div className="flex items-center justify-between">
            <span className="text-base">{icon}</span>
            <span className="text-[10px] text-white/20 font-semibold uppercase tracking-wider">{label}</span>
          </div>
          <p className="text-2xl font-black tabular-nums" style={{ color }}>{val}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, tasks, isActive, colorIdx, onClick }: {
  subject: Subject; tasks: Task[]; isActive: boolean; colorIdx: number; onClick: () => void;
}) {
  const done = tasks.filter(t => t.is_completed).length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const pal = PALETTE[colorIdx % PALETTE.length];
  const col = getProgressColor(pct);

  return (
    <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="relative w-full text-left rounded-2xl p-4 border overflow-hidden transition-all duration-300 group"
      style={{
        background: isActive ? pal.activeBg : "rgba(255,255,255,0.02)",
        borderColor: isActive ? pal.border : "rgba(255,255,255,0.07)",
        boxShadow: isActive ? `0 8px 32px ${pal.glow}, inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
      }}>

      {/* Active glow blob */}
      {isActive && <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: `${pal.accent}18` }} />}

      {/* Top indicator */}
      {isActive && <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${pal.accent}70, transparent)` }} />}

      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: pal.dot, boxShadow: `0 0 6px ${pal.dot}60` }} />
            <span className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
              {subject.name}
            </span>
          </div>
          <span className="text-xs font-black shrink-0 tabular-nums" style={{ color: isActive ? pal.text : "rgba(255,255,255,0.25)" }}>
            {pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(0,0,0,0.3)" }}>
          <motion.div initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: isActive ? `linear-gradient(90deg, ${pal.accent}, ${pal.dot})` : `linear-gradient(90deg, ${col.from}, ${col.to})` }} />
        </div>

        <p className="text-[10px]" style={{ color: isActive ? `${pal.text}80` : "rgba(255,255,255,0.2)" }}>
          {done}/{tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, userId, onToggle, onEdit, onDelete, onXp, index, accentColor }: {
  task: Task; userId: string; index: number; accentColor: string;
  onToggle: (id: string, val: boolean) => void;
  onEdit: (id: string, title: string, deadline: string | null) => void;
  onDelete: (id: string) => void;
  onXp: (was: boolean, now: boolean, amt: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDL, setEditDL] = useState(task.deadline ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subsFetched, setSubsFetched] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showSubInput, setShowSubInput] = useState(false);
  const [newSub, setNewSub] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  const isDone = task.is_completed;
  const dl = formatDeadline(task.deadline);
  const isUrgent = dl && dl.diff >= 0 && dl.diff <= 2 && !isDone;

  const handleSaveEdit = async () => {
    setSaving(true);
    await onEdit(task.id, editTitle.trim(), editDL || null);
    setSaving(false);
    setEditing(false);
  };

  const fetchSubs = async () => {
    if (subsFetched) return;
    setLoadingSubs(true);
    const { data } = await supabase.from("subtasks").select("*").eq("task_id", task.id).order("created_at");
    setSubtasks((data as Subtask[]) ?? []);
    setSubsFetched(true);
    setLoadingSubs(false);
  };

  const handleExpand = () => { if (!expanded) fetchSubs(); setExpanded(v => !v); };
  const subDone = subtasks.filter(s => s.is_completed).length;
  const subPct = subtasks.length === 0 ? 0 : Math.round((subDone / subtasks.length) * 100);

  const handleSubToggle = async (id: string, val: boolean) => {
    setSubtasks(p => p.map(s => s.id === id ? { ...s, is_completed: val } : s));
    await supabase.from("subtasks").update({ is_completed: val }).eq("id", id);
  };
  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    setAddingSub(true);
    const { data } = await supabase.from("subtasks").insert({ title: newSub.trim(), is_completed: false, task_id: task.id, user_id: userId }).select().single();
    if (data) { setSubtasks(p => [...p, data as Subtask]); setNewSub(""); setShowSubInput(false); }
    setAddingSub(false);
  };

  if (editing) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-4 border-b border-white/[0.04] last:border-0">
      <div className="space-y-2.5 bg-white/[0.04] rounded-2xl p-4 border border-white/[0.08]">
        <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition-all" />
        <input type="date" value={editDL} onChange={e => setEditDL(e.target.value)}
          className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-sm text-white/60 outline-none focus:border-violet-500/40 transition-all" />
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 text-xs text-white/30 hover:text-white py-2.5 rounded-xl hover:bg-white/[0.05] transition-all">Cancel</button>
          <button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}
            className="flex-[2] text-xs font-bold py-2.5 rounded-xl disabled:opacity-40 text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors duration-150"
    >
      <div className="flex items-center gap-3 px-5 py-3.5">
        {/* Checkbox */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => { const was = isDone; onToggle(task.id, !isDone); onXp(was, !isDone, 10); }}
          className="shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300"
          style={{
            background: isDone ? accentColor : "transparent",
            borderColor: isDone ? accentColor : "rgba(255,255,255,0.15)",
            boxShadow: isDone ? `0 0 10px ${accentColor}50` : "none",
          }}>
          <AnimatePresence>
            {isDone && (
              <motion.svg initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate transition-all duration-300 ${isDone ? "line-through text-white/25" : "text-white/85"}`}>
            {task.title}
          </p>
          {dl && (
            <p className={`text-[10px] font-semibold mt-0.5 ${isDone ? "text-white/15" :
              dl.diff < 0 ? "text-white/20" :
                dl.diff === 0 ? "text-red-400" :
                  dl.diff <= 2 ? "text-red-400" :
                    dl.diff <= 7 ? "text-amber-400" : "text-white/25"
              }`}>
              {dl.diff < 0 ? "Overdue" : dl.diff === 0 ? "Due today!" : `Due ${dl.formatted}`}
              {isUrgent && !isDone && " ⚠"}
            </p>
          )}
        </div>

        {/* Subtask progress indicator */}
        {subsFetched && subtasks.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${subPct}%` }} transition={{ duration: 0.4 }}
                className="h-full rounded-full" style={{ background: accentColor }} />
            </div>
            <span className="text-[10px] text-white/25 tabular-nums">{subDone}/{subtasks.length}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
          <button onClick={handleExpand} title="Subtasks"
            className="w-7 h-7 flex items-center justify-center rounded-xl text-white/25 hover:text-white/70 hover:bg-white/[0.07] transition-all">
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
          <button onClick={() => setEditing(true)} title="Edit"
            className="w-7 h-7 flex items-center justify-center rounded-xl text-white/25 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
          </button>
          <button onClick={() => onDelete(task.id)} title="Delete"
            className="w-7 h-7 flex items-center justify-center rounded-xl text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
          </button>
        </div>
      </div>

      {/* Subtask progress strip */}
      {subsFetched && subtasks.length > 0 && (
        <div className="px-5 pb-1">
          <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div animate={{ width: `${subPct}%` }} transition={{ duration: 0.5 }}
              className="h-full rounded-full" style={{ background: accentColor }} />
          </div>
        </div>
      )}

      {/* Subtasks panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-5 pb-4 pt-2 border-t border-white/[0.04] space-y-1.5">
              {loadingSubs ? (
                <div className="flex gap-2 items-center py-1">
                  <div className="w-3.5 h-3.5 rounded bg-white/[0.07] animate-pulse" />
                  <div className="h-2.5 w-28 bg-white/[0.05] rounded animate-pulse" />
                </div>
              ) : subtasks.length === 0 && !showSubInput ? (
                <p className="text-[11px] text-white/20 py-1">No subtasks yet</p>
              ) : (
                subtasks.map((sub, i) => (
                  <motion.div key={sub.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-2 group/sub">
                    <button onClick={() => handleSubToggle(sub.id, !sub.is_completed)}
                      className="shrink-0 w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all duration-200"
                      style={{ background: sub.is_completed ? accentColor : "transparent", borderColor: sub.is_completed ? accentColor : "rgba(255,255,255,0.12)" }}>
                      {sub.is_completed && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <span className={`text-xs flex-1 transition-all ${sub.is_completed ? "line-through text-white/20" : "text-white/55"}`}>{sub.title}</span>
                    <button onClick={async () => { setSubtasks(p => p.filter(s => s.id !== sub.id)); await supabase.from("subtasks").delete().eq("id", sub.id); }}
                      className="w-4 h-4 flex items-center justify-center text-white/15 hover:text-rose-400 opacity-0 group-hover/sub:opacity-100 transition-all">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </motion.div>
                ))
              )}
              {showSubInput ? (
                <form onSubmit={handleAddSub} className="flex gap-1.5 pt-0.5">
                  <input autoFocus type="text" value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Subtask…"
                    className="flex-1 bg-white/[0.05] border border-white/[0.09] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition-all" />
                  <button type="button" onClick={() => { setShowSubInput(false); setNewSub(""); }} className="text-xs text-white/25 hover:text-white px-2 rounded-lg transition-all">✕</button>
                  <button type="submit" disabled={addingSub || !newSub.trim()}
                    className="text-xs text-white font-bold px-3 py-1 rounded-xl disabled:opacity-40 transition-all"
                    style={{ background: `${accentColor}cc` }}>{addingSub ? "…" : "Add"}</button>
                </form>
              ) : (
                <button onClick={() => setShowSubInput(true)} className="flex items-center gap-1 text-[11px] text-white/20 hover:text-violet-400 transition-colors py-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add subtask
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Add Task Form ────────────────────────────────────────────────────────────
function AddTaskForm({ subjectId, userId, onAdd, accentColor }: { subjectId: string; userId: string; onAdd: (t: Task) => void; accentColor: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dl, setDl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("tasks")
      .insert({ title: title.trim(), deadline: dl || null, is_completed: false, subject_id: subjectId, user_id: userId })
      .select().single();
    if (!error && data) { onAdd(data as Task); setTitle(""); setDl(""); setOpen(false); toast.success("Task added! ✨"); }
    else toast.error("Failed to add task");
    setLoading(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="group flex items-center gap-2.5 text-xs text-white/25 hover:text-white/70 transition-all duration-200 py-3 px-5 w-full rounded-xl hover:bg-white/[0.03]">
      <div className="w-5 h-5 rounded-lg border-2 border-dashed border-white/15 group-hover:border-white/30 flex items-center justify-center transition-colors">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      </div>
      Add task
    </button>
  );

  return (
    <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-2.5 bg-white/[0.03] rounded-2xl p-4 border border-white/[0.08] m-3">
      <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title…"
        className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition-all" />
      <input type="date" value={dl} onChange={e => setDl(e.target.value)}
        className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-sm text-white/60 outline-none focus:border-violet-500/40 transition-all" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 text-xs text-white/30 hover:text-white py-2.5 rounded-xl hover:bg-white/[0.05] transition-all">Cancel</button>
        <button type="submit" disabled={loading || !title.trim()}
          className="flex-[2] text-xs text-white font-bold py-2.5 rounded-xl disabled:opacity-40 transition-all shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, boxShadow: `0 4px 20px ${accentColor}30` }}>
          {loading ? "Adding…" : "Add Task"}
        </button>
      </div>
    </motion.form>
  );
}

// ─── Subject Delete Button ────────────────────────────────────────────────────
function SubjectDeleteButton({ subjectId, onDelete }: { subjectId: string; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 shrink-0">
      <span className="text-xs text-rose-400">Delete?</span>
      <button onClick={() => onDelete(subjectId)} className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors">Yes</button>
      <button onClick={() => setConfirm(false)} className="text-xs text-white/30 hover:text-white font-bold transition-colors">No</button>
    </motion.div>
  );
  return (
    <button onClick={() => setConfirm(true)}
      className="shrink-0 flex items-center gap-1.5 text-xs text-white/20 hover:text-rose-400 border border-white/[0.07] hover:border-rose-500/20 hover:bg-rose-500/10 px-3 py-2 rounded-xl transition-all duration-200">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
      Delete
    </button>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SidebarSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.05] space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.09]" />
            <div className="h-3 bg-white/[0.08] rounded-full flex-1" />
            <div className="h-3 w-8 bg-white/[0.06] rounded-full" />
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full" />
          <div className="h-2.5 w-16 bg-white/[0.04] rounded-full" />
        </div>
      ))}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="divide-y divide-white/[0.04]">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
          <div className="w-5 h-5 rounded-lg bg-white/[0.08] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-white/[0.07] rounded-full" style={{ width: `${40 + i * 15}%` }} />
            <div className="h-2.5 w-20 bg-white/[0.04] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [streakLoading, setStreakLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [reminder, setReminder] = useState<SmartReminder | null>(null);
  const [reminderLoading, setReminderLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      await Promise.all([fetchData(user.id), new Promise(r => setTimeout(r, 800))]);
      setLoading(false);
      // Fetch smart reminder after main data loads
      getSmartReminder(user.id).then(r => { setReminder(r); setReminderLoading(false); });
    };
    init();
  }, [router]);

  const fetchData = async (uid: string) => {
    const [{ data: subs, error: subErr }, { data: tsks, error: tskErr }, { data: prof }] = await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
      supabase.from("profiles").select("xp").eq("id", uid).single(),
    ]);
    if (subErr || tskErr) { toast.error("Failed to load data. Please refresh."); return; }
    const s = (subs as Subject[]) ?? [];
    setSubjects(s);
    setTasks((tsks as Task[]) ?? []);
    if (prof) setXp((prof as { xp: number }).xp ?? 0);
    if (s.length > 0) setSelectedSubjectId(s[0].id);
    fetchStreak(uid).then(str => { setStreak(str); setStreakLoading(false); });
  };

  const awardXpIfCompleted = async (was: boolean, now: boolean, amt: number) => {
    if (!user || was || !now) return;
    setXp(prev => { const next = prev + amt; supabase.from("profiles").update({ xp: next }).eq("id", user.id); return next; });
    toast(`+${amt} XP! ✨`, { style: { background: "#1a1530", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", fontSize: "13px" } });
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;
    setAddingSubject(true);
    const { data, error } = await supabase.from("subjects").insert({ name: newSubject.trim(), user_id: user.id }).select().single();
    if (!error && data) { const sub = data as Subject; setSubjects(p => [sub, ...p]); setSelectedSubjectId(sub.id); setNewSubject(""); setShowSubjectForm(false); toast.success(`"${sub.name}" added!`); }
    else toast.error("Failed to add subject");
    setAddingSubject(false);
  };

  const handleTaskToggle = async (taskId: string, val: boolean) => {
    const prev = tasks.find(t => t.id === taskId);
    const was = prev?.is_completed ?? false;
    setTasks(p => p.map(t => t.id === taskId ? { ...t, is_completed: val } : t));
    await supabase.from("tasks").update({ is_completed: val }).eq("id", taskId);
    if (!was && val && user) updateStreak(user.id).then(s => { if (s) setStreak(s); });
  };

  const handleTaskAdd = (t: Task) => setTasks(p => [...p, t]);
  const handleTaskEdit = async (id: string, title: string, deadline: string | null) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, title, deadline } : t));
    const { error } = await supabase.from("tasks").update({ title, deadline }).eq("id", id);
    if (!error) toast.success("Updated!"); else toast.error("Failed to update");
  };
  const handleTaskDelete = async (id: string) => {
    setTasks(p => p.filter(t => t.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) toast.success("Deleted"); else toast.error("Failed to delete");
  };
  const handleSubjectDelete = async (id: string) => {
    setTasks(p => p.filter(t => t.subject_id !== id));
    setSubjects(p => { const rem = p.filter(s => s.id !== id); setSelectedSubjectId(rem[0]?.id ?? null); return rem; });
    await supabase.from("tasks").delete().eq("subject_id", id);
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (!error) toast.success("Subject deleted"); else toast.error("Failed to delete");
  };
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/auth/login"); };

  const totalSubjects = subjects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) ?? null;
  const selectedTasks = tasks.filter(t => t.subject_id === selectedSubjectId);
  const selectedDone = selectedTasks.filter(t => t.is_completed).length;
  const selectedPct = selectedTasks.length === 0 ? 0 : Math.round((selectedDone / selectedTasks.length) * 100);
  const selIdx = subjects.findIndex(s => s.id === selectedSubjectId);
  const selPal = PALETTE[selIdx % PALETTE.length] ?? PALETTE[0];
  const selCol = getProgressColor(selectedPct);

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      {/* ── Animated ambient bg ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/4 w-[900px] h-[600px] rounded-full blur-[200px]"
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)" }} />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/3 -right-40 w-[700px] h-[600px] rounded-full blur-[180px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 left-1/4 w-[600px] h-[400px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.011]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>

      {/* ── Top header bar ── */}
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative z-20 border-b border-white/[0.05] bg-[#07070f]/90 backdrop-blur-2xl px-4 sm:px-6 h-14 flex items-center gap-3 shrink-0">

        {/* Mobile sidebar trigger */}
        <button onClick={() => setMobileSidebar(v => !v)}
          className="xl:hidden w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
          </div>
          <span className="font-black text-sm tracking-tight hidden sm:block" style={{ background: "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.4) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            StudySync
          </span>
        </div>

        <div className="flex-1" />
        <ThemeToggle />
        {user && <ProfileDropdown user={user} onSignOut={handleSignOut} />}
      </motion.header>

      {/* ── Body ── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileSidebar && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-20 bg-black/70 xl:hidden backdrop-blur-sm" onClick={() => setMobileSidebar(false)} />
          )}
        </AnimatePresence>

        {/* ── Left Sidebar ── */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}
          className={`fixed xl:static inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 ease-out top-14 xl:top-0
            ${mobileSidebar ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}`}
          style={{ width: 260, background: "rgba(9,9,20,0.95)", backdropFilter: "blur(32px)", borderRight: "1px solid rgba(255,255,255,0.05)" }}
          data-sidebar="main"
        >
          {/* Nav links */}
          <div className="px-3 pt-5 pb-3">
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest px-3.5 mb-2">Navigation</p>
            <div className="space-y-0.5">
              {NAV_ITEMS.map(item => (
                <SidebarLink key={item.href} item={item} active={item.href === "/dashboard"} />
              ))}
            </div>
          </div>

          <div className="h-px bg-white/[0.05] mx-4" />

          {/* Subject section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Subjects</p>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setShowSubjectForm(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 hover:bg-violet-500/25 transition-all">
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showSubjectForm ? "rotate-45" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </motion.button>
            </div>

            <AnimatePresence>
              {showSubjectForm && (
                <motion.form onSubmit={handleAddSubject} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-3 pb-3">
                  <div className="flex gap-2">
                    <input autoFocus type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject name…"
                      className="flex-1 bg-white/[0.05] border border-white/[0.09] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-all min-w-0" />
                    <button type="submit" disabled={addingSubject || !newSubject.trim()}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-40 transition-all shrink-0 shadow-md shadow-violet-500/20">
                      {addingSubject ? "…" : "Add"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 no-scrollbar">
              {loading ? <SidebarSkeleton /> : subjects.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-white/25 font-semibold">No subjects</p>
                    <button onClick={() => setShowSubjectForm(true)} className="text-xs text-violet-400/60 hover:text-violet-400 transition-colors mt-1">+ Add one</button>
                  </div>
                </div>
              ) : subjects.map((sub, idx) => (
                <SubjectCard key={sub.id} subject={sub} colorIdx={idx} isActive={selectedSubjectId === sub.id}
                  tasks={tasks.filter(t => t.subject_id === sub.id)}
                  onClick={() => { setSelectedSubjectId(sub.id); setMobileSidebar(false); }} />
              ))}
            </nav>
          </div>
        </motion.aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
              <div className="h-48 bg-white/[0.03] rounded-3xl border border-white/[0.05]" />
              <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl border border-white/[0.05]" />)}</div>
              <div className="h-64 bg-white/[0.03] rounded-3xl border border-white/[0.05]" />
            </div>
          ) : subjects.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4 text-center">
              {/* Illustration */}
              <div className="relative">
                <div className="w-28 h-28 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shadow-2xl">
                  <svg className="w-14 h-14 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-violet-500/5 blur-2xl" />
                {/* Floating dots */}
                <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-3 -right-3 w-4 h-4 rounded-full bg-violet-500/30 border border-violet-500/40" />
                <motion.div animate={{ y: [4, -4, 4] }} transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -bottom-3 -left-3 w-3 h-3 rounded-full bg-indigo-500/30 border border-indigo-500/40" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white/80 mb-2">No subjects yet</h2>
                <p className="text-white/30 max-w-sm text-sm leading-relaxed">
                  Add your first subject to start organizing your tasks, tracking progress, and leveling up your study game.
                </p>
              </div>

              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowSubjectForm(true)}
                className="flex items-center gap-2.5 text-sm font-bold text-white px-8 py-3.5 rounded-2xl shadow-2xl shadow-violet-500/30 transition-all"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add your first subject
              </motion.button>
            </motion.div>

          ) : selectedSubject ? (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

              {/* Smart Reminder Banner */}
              <SmartReminderBanner reminder={reminder} loading={reminderLoading} />

              {/* Hero header with XP + streak */}
              <HeroHeader user={user!} xp={xp} streak={streak} streakLoading={streakLoading} />

              {/* Stats bar */}
              <StatsBar totalSubjects={totalSubjects} totalTasks={totalTasks} completedTasks={completedTasks} />

              {/* Subject panel */}
              <AnimatePresence mode="wait">
                <motion.div key={selectedSubject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>

                  {/* Subject header */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: selPal.dot, boxShadow: `0 0 8px ${selPal.dot}70` }} />
                        <h2 className="text-2xl font-black tracking-tight text-white">{selectedSubject.name}</h2>
                      </div>
                      <p className="text-white/35 text-sm">
                        {selectedDone} of {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""} complete
                        {selectedPct === 100 && <span className="ml-2 text-emerald-400 font-bold">🎉 All done!</span>}
                      </p>
                    </div>
                    <SubjectDeleteButton subjectId={selectedSubject.id} onDelete={handleSubjectDelete} />
                  </div>

                  {/* Progress card */}
                  <div className="relative rounded-2xl p-5 mb-6 border overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${selPal.activeBg}, rgba(255,255,255,0.01))`, borderColor: selPal.border }}>
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${selPal.accent}40, transparent)` }} />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: `${selPal.text}80` }}>Progress</span>
                      <span className="text-xl font-black tabular-nums" style={{ color: selectedPct === 100 ? "#34d399" : selPal.text }}>{selectedPct}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <motion.div key={selectedSubjectId} initial={{ width: 0 }} animate={{ width: `${selectedPct}%` }}
                        transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                        className="h-full rounded-full relative overflow-hidden"
                        style={{ background: `linear-gradient(90deg, ${selCol.from}, ${selCol.to})` }}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: "2s" }} />
                      </motion.div>
                    </div>
                    {selectedPct > 0 && selectedPct < 100 && (
                      <p className="text-xs mt-2" style={{ color: `${selPal.text}50` }}>{selectedTasks.length - selectedDone} remaining</p>
                    )}
                  </div>

                  {/* Tasks card */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
                    className="rounded-3xl overflow-hidden border"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(255,255,255,0.07)",
                      boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                      backdropFilter: "blur(24px)",
                    }}>

                    {/* Card header */}
                    <div className="px-5 py-4 border-b flex items-center justify-between"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${selPal.accent}, ${selPal.dot})` }} />
                        <h3 className="text-sm font-bold text-white/70">Tasks</h3>
                      </div>
                      <span className="text-[10px] font-black tabular-nums" style={{ color: `${selPal.text}70` }}>
                        {selectedDone}/{selectedTasks.length}
                      </span>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={selectedSubjectId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {selectedTasks.length === 0 ? (
                          <div className="flex flex-col items-center gap-4 py-16 text-center px-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                              style={{ background: `${selPal.accent}10`, border: `1px solid ${selPal.border}` }}>
                              ✅
                            </div>
                            <div>
                              <p className="text-white/40 font-bold">No tasks yet</p>
                              <p className="text-white/20 text-xs mt-0.5">Add your first task below to get started</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {selectedTasks.map((task, i) => (
                              <TaskRow key={task.id} task={task} userId={user!.id} index={i}
                                accentColor={selPal.accent}
                                onToggle={handleTaskToggle} onEdit={handleTaskEdit}
                                onDelete={handleTaskDelete} onXp={awardXpIfCompleted} />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <AddTaskForm subjectId={selectedSubject.id} userId={user!.id} onAdd={handleTaskAdd} accentColor={selPal.accent} />
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
