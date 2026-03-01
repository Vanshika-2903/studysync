"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import type { Achievement } from "@/lib/achievementLogic";
import { ALL_BADGES, RARITY_CONFIG, fetchAchievements, checkAllBadges } from "@/lib/achievementLogic";
import AchievementGrid from "./components/AchievementGrid";

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href:"/dashboard",    label:"Dashboard",    s:"Home",   g:"from-violet-500 to-indigo-500",  glow:"shadow-violet-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
  { href:"/assignments",  label:"Assignments",  s:"Work",   g:"from-sky-500 to-blue-500",       glow:"shadow-sky-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg> },
  { href:"/labs",         label:"Labs",         s:"Labs",   g:"from-fuchsia-500 to-purple-500", glow:"shadow-fuchsia-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01-.659 1.591l-1.591 1.591M19.8 15l-3.346 3.346a2.25 2.25 0 01-1.591.659H9.137a2.25 2.25 0 01-1.591-.659L4.2 15m15.6 0H4.2" /></svg> },
  { href:"/calendar",     label:"Calendar",     s:"Cal",    g:"from-cyan-500 to-teal-500",      glow:"shadow-cyan-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
  { href:"/achievements", label:"Achievements", s:"Badges", g:"from-amber-500 to-orange-500",   glow:"shadow-amber-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" /></svg> },
  { href:"/exam-mode",    label:"Exams",        s:"Exams",  g:"from-red-500 to-orange-500",     glow:"shadow-red-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
  { href:"/timer",        label:"Timer",        s:"Timer",  g:"from-emerald-500 to-teal-500",   glow:"shadow-emerald-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

function NavPill({ current }: { current: string }) {
  return (
    <nav className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 gap-0.5 overflow-x-auto no-scrollbar">
      {NAV_ITEMS.map(item => {
        const active = current === item.href;
        return (
          <a key={item.href} href={item.href}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap group ${
              active ? `bg-gradient-to-r ${item.g} text-white shadow-lg ${item.glow}` : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
            }`}>
            <span className={active ? "text-white" : "text-white/40 group-hover:text-white/70"}>{item.icon}</span>
            <span className="hidden lg:inline">{item.label}</span>
            <span className="inline lg:hidden">{item.s}</span>
          </a>
        );
      })}
    </nav>
  );
}

// ─── Stats hero ───────────────────────────────────────────────────────────────
function StatsHero({ achievements, loading }: { achievements: Achievement[]; loading: boolean }) {
  const total    = ALL_BADGES.length;
  const unlocked = achievements.length;
  const pct      = total === 0 ? 0 : Math.round((unlocked / total) * 100);

  // Rarity counts
  const rarityCounts = (["legendary", "epic", "rare", "common"] as const).map(r => ({
    rarity: r,
    total: ALL_BADGES.filter(b => b.rarity === r).length,
    earned: achievements.filter(a => {
      const def = ALL_BADGES.find(b => b.key === a.badge_key);
      return def?.rarity === r;
    }).length,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative rounded-3xl overflow-hidden mb-8 border border-white/[0.07]"
      style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(234,88,12,0.09) 40%, rgba(20,20,40,0.4) 100%)" }}
    >
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full blur-3xl" style={{ background: "rgba(245,158,11,0.12)" }} />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full blur-3xl" style={{ background: "rgba(239,68,68,0.08)" }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)" }} />
      </div>

      <div className="relative px-6 py-7 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">

          {/* Left */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <motion.span
                animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                className="text-3xl"
              >🏆</motion.span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-0.5">Achievement Progress</p>
                <h2 className="text-2xl font-black text-white">
                  {loading ? "—" : `${unlocked} / ${total}`}
                  <span className="text-white/30 font-semibold text-lg ml-2">badges</span>
                </h2>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-64 max-w-full">
              <div className="h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/[0.06] mb-1.5">
                {!loading && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.5, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                    className="h-full rounded-full relative overflow-hidden"
                    style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a)" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: "2s" }} />
                  </motion.div>
                )}
              </div>
              <p className="text-xs text-white/30 font-semibold">{pct}% complete · {total - unlocked} remaining</p>
            </div>
          </div>

          {/* Right — rarity grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {rarityCounts.map(({ rarity, total: t, earned }) => {
              const cfg = RARITY_CONFIG[rarity];
              return (
                <div key={rarity} className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 border"
                  style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <div className="text-center min-w-[28px]">
                    <p className="text-lg font-black tabular-nums leading-none" style={{ color: cfg.color }}>{earned}</p>
                    <p className="text-[8px] text-white/20 font-semibold">/{t}</p>
                  </div>
                  <p className="text-[10px] font-bold capitalize" style={{ color: `${cfg.color}99` }}>{rarity}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 border border-white/[0.05] bg-white/[0.02] animate-pulse space-y-4"
          style={{ animationDelay: `${i * 40}ms` }}>
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06]" />
            <div className="h-5 w-16 rounded-full bg-white/[0.05]" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-white/[0.07] rounded-lg w-3/4" />
            <div className="h-3 bg-white/[0.04] rounded-lg w-full" />
            <div className="h-3 bg-white/[0.04] rounded-lg w-2/3" />
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="h-3 bg-white/[0.04] rounded-full w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AchievementsPage() {
  const router = useRouter();
  const [user,         setUser]         = useState<User | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);

      // Fetch user data to run badge checks
      const [
        { data: profile },
        { data: streakRow },
        achieved,
      ] = await Promise.all([
        supabase.from("profiles").select("xp").eq("id", user.id).single(),
        supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).single(),
        fetchAchievements(user.id),
      ]);

      const xp          = (profile as any)?.xp ?? 0;
      const streakDays  = (streakRow as any)?.current_streak ?? 0;

      // Run all badge checks on page load
      await checkAllBadges(user.id, { streakDays, xp });

      // Re-fetch after checks (new badges may have been unlocked)
      const fresh = await fetchAchievements(user.id);
      setAchievements(fresh);
      setLoading(false);
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">

      {/* ── Animated background ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/4 w-[800px] h-[500px] rounded-full blur-[180px]"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)" }}
        />
        <div className="absolute -bottom-20 left-0 w-[500px] h-[400px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.011]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>

      {/* ── Navbar ── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative z-20 border-b border-white/[0.05] bg-[#07070f]/90 backdrop-blur-2xl px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 gap-3"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/40">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
          </div>
          <span className="font-black text-sm tracking-tight hidden sm:block"
            style={{ background: "linear-gradient(90deg,#fff,rgba(255,255,255,0.4))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            StudySync
          </span>
        </div>

        <NavPill current="/achievements" />

        {user && (
          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-[11px] font-bold text-white">
            {user.email?.slice(0, 2).toUpperCase()}
          </div>
        )}
      </motion.header>

      {/* ── Content ── */}
      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="mb-7"
        >
          <h1 className="text-3xl font-black tracking-tight"
            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b,#ef4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Achievements
          </h1>
          <p className="text-white/30 text-sm mt-1">Your journey, milestones, and badges earned.</p>
        </motion.div>

        {/* Stats hero */}
        <StatsHero achievements={achievements} loading={loading} />

        {/* Grid */}
        {loading ? (
          <GridSkeleton />
        ) : (
          <AchievementGrid achievements={achievements} />
        )}
      </main>
    </div>
  );
}
