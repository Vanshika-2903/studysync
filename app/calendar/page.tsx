"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import CalendarView from "./components/CalendarView";
import type { CalendarEvent } from "./components/EventModal";

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href:"/dashboard",   label:"Dashboard", s:"Home",  g:"from-violet-500 to-indigo-500",  glow:"shadow-violet-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
  { href:"/assignments", label:"Assignments",s:"Work", g:"from-sky-500 to-blue-500",       glow:"shadow-sky-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg> },
  { href:"/labs",        label:"Labs",      s:"Labs",  g:"from-fuchsia-500 to-purple-500", glow:"shadow-fuchsia-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01-.659 1.591l-1.591 1.591M19.8 15l-3.346 3.346a2.25 2.25 0 01-1.591.659H9.137a2.25 2.25 0 01-1.591-.659L4.2 15m15.6 0H4.2" /></svg> },
  { href:"/calendar",    label:"Calendar",  s:"Cal",   g:"from-cyan-500 to-teal-500",      glow:"shadow-cyan-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
  { href:"/exam-mode",   label:"Exams",     s:"Exams", g:"from-red-500 to-orange-500",     glow:"shadow-red-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
  { href:"/timer",       label:"Timer",     s:"Timer", g:"from-emerald-500 to-teal-500",   glow:"shadow-emerald-500/30",
    icon:<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

function NavPill({ current }: { current: string }) {
  return (
    <nav className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 gap-0.5 overflow-x-auto no-scrollbar">
      {NAV_ITEMS.map((item) => {
        const active = current === item.href;
        return (
          <a key={item.href} href={item.href}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap group ${
              active ? `bg-gradient-to-r ${item.g} text-white shadow-lg ${item.glow}` : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
            }`}>
            <span className={active ? "text-white" : "text-white/40 group-hover:text-white/70 transition-colors"}>{item.icon}</span>
            <span className="hidden lg:inline">{item.label}</span>
            <span className="inline lg:hidden">{item.s}</span>
          </a>
        );
      })}
    </nav>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[80,100,90,110,70].map((w,i) => <div key={i} className="h-7 rounded-full bg-white/[0.06]" style={{width:w}} />)}
      </div>
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-white/[0.05] rounded-2xl" />
        <div className="h-6 w-40 bg-white/[0.04] rounded-xl" />
        <div className="h-8 w-36 bg-white/[0.05] rounded-2xl" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length:7}).map((_,i) => <div key={i} className="h-8 bg-white/[0.04] rounded-lg" />)}
        {Array.from({length:35}).map((_,i) => <div key={i} className="h-20 bg-white/[0.02] rounded-lg" />)}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const router = useRouter();
  const [user,    setUser]    = useState<User | null>(null);
  const [events,  setEvents]  = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      await fetchAllEvents(user.id);
    });
  }, [router]);

  const fetchAllEvents = async (uid: string) => {
    try {
      const [
        { data: tasks },
        { data: assignments },
        { data: labs },
        { data: exams },
      ] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", uid).not("deadline", "is", null),
        supabase.from("assignments").select("*").eq("user_id", uid),
        supabase.from("labs").select("*").eq("user_id", uid),
        supabase.from("exams").select("*").eq("user_id", uid),
      ]);

      const evts: CalendarEvent[] = [];

      // Tasks
      (tasks ?? []).forEach((t: any) => {
        if (!t.deadline) return;
        const d = new Date(t.deadline);
        evts.push({ id: `task-${t.id}`, title: t.title, start: d, end: d, type: "task", subject: t.subject_name ?? undefined, status: t.is_completed ? "completed" : "pending" });
      });

      // Assignments
      (assignments ?? []).forEach((a: any) => {
        const d = new Date(a.deadline);
        evts.push({ id: `asgn-${a.id}`, title: a.title, start: d, end: d, type: "assignment", subject: a.subject_name ?? undefined, status: a.status });
      });

      // Labs — exam date + submission date
      (labs ?? []).forEach((l: any) => {
        const examD = new Date(l.lab_exam_date);
        evts.push({ id: `lab-exam-${l.id}`, title: `${l.lab_name} — Exam`, start: examD, end: examD, type: "lab_exam", subject: l.subject_name ?? undefined, notes: l.notes ?? undefined, topics: l.topics ?? undefined, status: l.status });
        if (l.record_submission_date) {
          const subD = new Date(l.record_submission_date);
          evts.push({ id: `lab-sub-${l.id}`, title: `${l.lab_name} — Submission`, start: subD, end: subD, type: "lab_submission", subject: l.subject_name ?? undefined, status: l.status });
        }
      });

      // Exams
      (exams ?? []).forEach((e: any) => {
        const d = new Date(e.exam_date ?? e.date ?? e.created_at);
        evts.push({ id: `exam-${e.id}`, title: e.subject ?? e.title ?? "Exam", start: d, end: d, type: "exam", subject: e.subject ?? undefined, notes: e.notes ?? undefined, status: e.status });
      });

      setEvents(evts);
    } catch {
      toast.error("Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  const totalEvents = events.length;
  const upcoming    = events.filter(e => e.start >= new Date()).length;

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">

      {/* ── Animated background ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[800px] h-[500px] bg-cyan-900/12 blur-[160px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-teal-900/10 blur-[150px] rounded-full" />
        <div className="absolute -bottom-20 left-0 w-[500px] h-[400px] bg-violet-900/10 blur-[130px] rounded-full" />
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/3 w-[300px] h-[200px] bg-cyan-700/8 blur-[100px] rounded-full"
        />
        <div className="absolute inset-0 opacity-[0.012]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>

      {/* ── Navbar ── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative z-20 border-b border-white/[0.06] bg-[#07070f]/85 backdrop-blur-2xl px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 gap-3"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent hidden sm:block">StudySync</span>
        </div>

        <NavPill current="/calendar" />

        {user && (
          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-[11px] font-bold text-white">
            {user.email?.slice(0, 2).toUpperCase()}
          </div>
        )}
      </motion.header>

      {/* ── Content ── */}
      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="mb-7 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-black tracking-tight"
              style={{ background: "linear-gradient(135deg,#67e8f9,#22d3ee,#0891b2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Academic Calendar
            </h1>
            <p className="text-white/30 text-sm mt-1">
              All your deadlines, exams and submissions in one view
            </p>
          </div>

          {!loading && (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-cyan-400 tabular-nums">{totalEvents}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Total</p>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div className="text-center">
                <p className="text-2xl font-black text-teal-400 tabular-nums">{upcoming}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Upcoming</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Calendar container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5 }}
          className="bg-white/[0.025] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/40 relative overflow-hidden"
          style={{ minHeight: 680 }}
        >
          {/* Inner top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent rounded-t-3xl" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-20 bg-cyan-500/5 blur-3xl" />

          {loading ? (
            <CalendarSkeleton />
          ) : (
            <CalendarView events={events} />
          )}
        </motion.div>

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none mt-24"
          >
            <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-3xl">
              📅
            </div>
            <div className="text-center">
              <p className="text-white/40 font-bold">No events yet</p>
              <p className="text-white/20 text-sm mt-1">Add tasks, assignments, labs or exams to see them here.</p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
