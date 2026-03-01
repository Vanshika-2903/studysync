"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const STYLES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position: 200% center; }
}
@keyframes checkPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes pulseGlow {
  0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
  50%      { box-shadow: 0 0 16px 4px rgba(139,92,246,0.35); }
}
.fade-up   { animation: fadeUp  0.45s cubic-bezier(.22,1,.36,1) both; }
.fade-in   { animation: fadeIn  0.3s ease both; }
.scale-in  { animation: scaleIn 0.35s cubic-bezier(.22,1,.36,1) both; }
.card-hover { transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease; }
.card-hover:hover { transform: translateY(-3px) scale(1.005); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.shimmer-btn {
  background: linear-gradient(120deg, #7c3aed 0%, #6366f1 40%, #a78bfa 60%, #6366f1 80%, #7c3aed 100%);
  background-size: 200% auto;
  animation: shimmer 2.5s linear infinite;
}
.shimmer-btn:hover { animation: shimmer 1.2s linear infinite, pulseGlow 1.5s ease-in-out infinite; }
.check-pop { animation: checkPop 0.4s cubic-bezier(.34,1.56,.64,1) both; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "completed";

type Lab = {
  id: string;
  user_id: string;
  lab_name: string;
  subject_name: string;
  lab_exam_date: string;
  record_submission_date: string;
  topics: string[];
  notes: string;
  status: Status;
  created_at: string;
};

type View = "list" | "timeline";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysLeft(dateStr: string): number {
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - t.getTime()) / 86400000);
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Date badge ───────────────────────────────────────────────────────────────

function DateBadge({ dateStr, type }: { dateStr: string; type: "exam" | "submission" }) {
  const d = daysLeft(dateStr);
  const threshold = type === "exam" ? 3 : 2;

  if (d < 0) return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      type === "exam" ? "bg-white/[0.06] text-white/25" : "bg-red-500/10 text-red-400 border border-red-500/20"
    }`}>
      {type === "exam" ? "Exam Done" : "Submission Overdue"}
    </span>
  );
  if (d === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse">Today!</span>;
  if (d <= threshold) return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      type === "exam" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
    }`}>{d}d left</span>
  );
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/35">{d}d left</span>;
}

// ─── Nav pill ─────────────────────────────────────────────────────────────────

function NavPill({ current }: { current: string }) {
  const items = [
    { href: "/dashboard",   label: "Dashboard",   s: "Home",    g: "from-violet-500 to-indigo-500",  glow: "shadow-violet-500/25",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
    { href: "/assignments", label: "Assignments", s: "Work",    g: "from-sky-500 to-blue-500",       glow: "shadow-sky-500/25",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg> },
    { href: "/labs",        label: "Labs",        s: "Labs",    g: "from-fuchsia-500 to-purple-500", glow: "shadow-fuchsia-500/25",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01-.659 1.591l-1.591 1.591M19.8 15l-3.346 3.346a2.25 2.25 0 01-1.591.659H9.137a2.25 2.25 0 01-1.591-.659L4.2 15m15.6 0H4.2" /></svg> },
    { href: "/exam-mode",   label: "Exam Mode",   s: "Exams",   g: "from-red-500 to-orange-500",    glow: "shadow-red-500/25",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
    { href: "/timer",       label: "Timer",       s: "Timer",   g: "from-emerald-500 to-teal-500",  glow: "shadow-emerald-500/25",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];
  return (
    <nav className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 gap-0.5">
      {items.map((item) => {
        const active = current === item.href;
        return (
          <a key={item.href} href={item.href}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 group ${
              active ? `bg-gradient-to-r ${item.g} text-white shadow-md ${item.glow}` : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
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

// ─── Topic pill input ─────────────────────────────────────────────────────────

function TopicInput({ topics, onChange }: { topics: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = val.trim();
    if (!trimmed || topics.includes(trimmed)) return;
    onChange([...topics, trimmed]);
    setVal("");
    ref.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input ref={ref} type="text" value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a topic…"
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-fuchsia-500/50 transition-all duration-200" />
        <button type="button" onClick={add}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-fuchsia-500/15 border border-fuchsia-500/25 text-fuchsia-400 hover:bg-fuchsia-500/25 transition-all duration-200">
          + Add
        </button>
      </div>
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topics.map((t, i) => (
            <span key={i} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 scale-in">
              {t}
              <button type="button" onClick={() => onChange(topics.filter((_, ii) => ii !== i))}
                className="text-fuchsia-400/60 hover:text-fuchsia-300 ml-0.5 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lab Form ─────────────────────────────────────────────────────────────────

function LabForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<Lab>;
  onSave: (data: Omit<Lab, "id" | "user_id" | "created_at" | "status">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [labName,    setLabName]    = useState(initial?.lab_name    ?? "");
  const [subject,    setSubject]    = useState(initial?.subject_name ?? "");
  const [examDate,   setExamDate]   = useState(initial?.lab_exam_date ?? "");
  const [subDate,    setSubDate]    = useState(initial?.record_submission_date ?? "");
  const [topics,     setTopics]     = useState<string[]>(initial?.topics ?? []);
  const [notes,      setNotes]      = useState(initial?.notes ?? "");

  const inp = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-fuchsia-500/50 focus:bg-white/[0.06] transition-all duration-200";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName.trim() || !examDate) return;
    onSave({ lab_name: labName.trim(), subject_name: subject.trim(), lab_exam_date: examDate, record_submission_date: subDate, topics, notes: notes.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <input autoFocus type="text" value={labName} onChange={(e) => setLabName(e.target.value)}
            placeholder="Lab name *" className={inp} required />
        </div>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Chemistry)" className={inp} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-1.5">Exam Date</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={`${inp} text-white/60`} required />
          </div>
          <div>
            <label className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-1.5">Submission</label>
            <input type="date" value={subDate} onChange={(e) => setSubDate(e.target.value)} className={`${inp} text-white/60`} />
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block mb-1.5">Topics</label>
        <TopicInput topics={topics} onChange={setTopics} />
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes, observations, or reminders…" rows={3}
        className={`${inp} resize-none`} />

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 text-xs text-white/30 hover:text-white py-2.5 rounded-xl hover:bg-white/[0.05] transition-all duration-200">
          Cancel
        </button>
        <button type="submit" disabled={saving || !labName.trim() || !examDate}
          className="shimmer-btn flex-[3] text-xs text-white font-bold py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 tracking-wide">
          {saving ? "Saving…" : initial?.id ? "Save Changes" : "Add Lab ✦"}
        </button>
      </div>
    </form>
  );
}

// ─── Lab Card ─────────────────────────────────────────────────────────────────

function LabCard({ lab, onToggle, onEdit, onDelete, index }: {
  lab: Lab; index: number;
  onToggle: (id: string, s: Status) => void;
  onEdit:   (l: Lab) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const isDone = lab.status === "completed";
  const examDays = daysLeft(lab.lab_exam_date);
  const subDays  = lab.record_submission_date ? daysLeft(lab.record_submission_date) : null;
  const isUrgent = !isDone && examDays >= 0 && examDays <= 3;

  return (
    <div
      className={`card-hover relative group bg-white/[0.03] backdrop-blur-sm border rounded-2xl p-5 flex flex-col gap-4 fade-up ${
        isDone ? "border-white/[0.05] opacity-60" : isUrgent ? "border-red-500/20" : "border-white/[0.08]"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top glow strip for urgent */}
      {isUrgent && <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />}

      {/* Soft gradient overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-500/[0.03] to-transparent" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative">
        <div className="flex items-start gap-3 min-w-0">
          {/* Status toggle */}
          <button onClick={() => onToggle(lab.id, isDone ? "pending" : "completed")}
            className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
              isDone ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30"
                     : "border-white/20 hover:border-fuchsia-400 hover:shadow-sm hover:shadow-fuchsia-500/20"
            }`}>
            {isDone && (
              <svg className="w-2.5 h-2.5 text-white check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="min-w-0">
            <h3 className={`text-sm font-bold leading-snug transition-all duration-300 ${isDone ? "line-through text-white/25" : "text-white"}`}>
              {lab.lab_name}
            </h3>
            {lab.subject_name && (
              <p className="text-[10px] text-fuchsia-400/60 font-semibold mt-0.5">{lab.subject_name}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
          <button onClick={() => onEdit(lab)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all duration-150">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-0.5">
              <span className="text-[10px] text-rose-400">Sure?</span>
              <button onClick={() => onDelete(lab.id)} className="text-[10px] text-rose-400 font-bold hover:text-rose-300">Yes</button>
              <button onClick={() => setConfirmDel(false)} className="text-[10px] text-white/30 font-bold">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-xl p-2.5">
          <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider mb-1">Exam Date</p>
          <p className="text-xs text-white/60 font-medium mb-1.5">{fmt(lab.lab_exam_date)}</p>
          <DateBadge dateStr={lab.lab_exam_date} type="exam" />
        </div>
        {lab.record_submission_date && (
          <div className="bg-white/[0.03] rounded-xl p-2.5">
            <p className="text-[9px] text-white/25 font-semibold uppercase tracking-wider mb-1">Submission</p>
            <p className="text-xs text-white/60 font-medium mb-1.5">{fmt(lab.record_submission_date)}</p>
            <DateBadge dateStr={lab.record_submission_date} type="submission" />
          </div>
        )}
      </div>

      {/* Topics */}
      {lab.topics && lab.topics.length > 0 && (
        <div>
          <button onClick={() => setShowTopics((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-fuchsia-400 font-semibold uppercase tracking-wider transition-colors duration-150 mb-2">
            <svg className={`w-3 h-3 transition-transform duration-200 ${showTopics ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            {lab.topics.length} topic{lab.topics.length !== 1 ? "s" : ""}
          </button>
          {showTopics && (
            <div className="flex flex-wrap gap-1.5 scale-in">
              {lab.topics.map((t, i) => (
                <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/15 text-fuchsia-300/80">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {lab.notes && (
        <p className={`text-xs leading-relaxed border-t border-white/[0.05] pt-3 ${isDone ? "text-white/20" : "text-white/35"}`}>
          {lab.notes}
        </p>
      )}

      {/* Status pill */}
      <div className="flex justify-end">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all duration-300 ${
          isDone ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                 : "bg-white/[0.06] text-white/30 border border-white/[0.08]"
        }`}>
          {isDone ? "✓ Completed" : "Pending"}
        </span>
      </div>
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({ labs }: { labs: Lab[] }) {
  const sorted = [...labs].sort((a, b) =>
    new Date(a.lab_exam_date).getTime() - new Date(b.lab_exam_date).getTime()
  );

  return (
    <div className="relative pl-6 fade-in">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-fuchsia-500/40 via-violet-500/20 to-transparent" />

      <div className="space-y-6">
        {sorted.map((lab, i) => {
          const days = daysLeft(lab.lab_exam_date);
          const isDone = lab.status === "completed";
          const isUrgent = !isDone && days >= 0 && days <= 3;
          return (
            <div key={lab.id} className="relative fade-up" style={{ animationDelay: `${i * 70}ms` }}>
              {/* Dot */}
              <div className={`absolute -left-[21px] top-3.5 w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                isDone ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/40"
                : isUrgent ? "bg-red-500 border-red-500 shadow-sm shadow-red-500/40 animate-pulse"
                : "bg-fuchsia-500 border-fuchsia-500 shadow-sm shadow-fuchsia-500/30"
              }`} />

              {/* Card */}
              <div className={`bg-white/[0.03] border rounded-2xl p-4 transition-all duration-200 hover:bg-white/[0.05] ${
                isDone ? "border-white/[0.05] opacity-60" : isUrgent ? "border-red-500/20" : "border-white/[0.07]"
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className={`text-sm font-bold ${isDone ? "line-through text-white/25" : "text-white"}`}>{lab.lab_name}</p>
                    {lab.subject_name && <p className="text-[10px] text-fuchsia-400/60 font-semibold mt-0.5">{lab.subject_name}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DateBadge dateStr={lab.lab_exam_date} type="exam" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-white/30"
                    }`}>{isDone ? "Done" : "Pending"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/30">{fmt(lab.lab_exam_date)}</p>
                {lab.topics && lab.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {lab.topics.slice(0, 4).map((t, ii) => (
                      <span key={ii} className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300/70 border border-fuchsia-500/10">{t}</span>
                    ))}
                    {lab.topics.length > 4 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/25">+{lab.topics.length - 4}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3].map((i) => (
        <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="flex gap-3">
            <div className="w-4 h-4 rounded bg-white/[0.08] mt-0.5 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-white/[0.08] rounded-lg w-3/4" />
              <div className="h-2.5 bg-white/[0.05] rounded-lg w-1/3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 bg-white/[0.04] rounded-xl" />
            <div className="h-16 bg-white/[0.04] rounded-xl" />
          </div>
          <div className="flex gap-1.5">
            {[40,60,50].map((w,ii) => <div key={ii} className="h-5 bg-white/[0.05] rounded-full" style={{width:w}} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-6 text-center fade-up">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shadow-xl">
          <svg className="w-9 h-9 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01-.659 1.591l-1.591 1.591M19.8 15l-3.346 3.346a2.25 2.25 0 01-1.591.659H9.137a2.25 2.25 0 01-1.591-.659L4.2 15m15.6 0H4.2" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-fuchsia-500/10 blur-xl" />
      </div>
      <div>
        <p className="text-white/50 font-bold text-lg">No labs yet</p>
        <p className="text-white/20 text-sm mt-1 max-w-xs">Track your lab exams, submissions, and topics all in one place.</p>
      </div>
      <button onClick={onAdd}
        className="shimmer-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Add your first lab
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LabsPage() {
  const router = useRouter();
  const [user,   setUser]   = useState<User | null>(null);
  const [labs,   setLabs]   = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Lab | null>(null);
  const [saving, setSaving]  = useState(false);
  const [view, setView]     = useState<View>("list");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      fetchLabs(user.id);
    });
  }, [router]);

  // ── Fetch ──
  const fetchLabs = async (uid: string) => {
    const { data, error } = await supabase
      .from("labs").select("*").eq("user_id", uid)
      .order("lab_exam_date", { ascending: true });
    if (error) { toast.error("Failed to load labs"); return; }
    setLabs((data as Lab[]) ?? []);
    setLoading(false);
  };

  // ── Add ──
  const handleAdd = async (form: Omit<Lab, "id" | "user_id" | "created_at" | "status">) => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("labs").insert({ ...form, user_id: user.id, status: "pending" }).select().single();
    if (error) { toast.error("Failed to add lab"); }
    else {
      setLabs((prev) => [...prev, data as Lab].sort((a,b) =>
        new Date(a.lab_exam_date).getTime() - new Date(b.lab_exam_date).getTime()));
      setShowForm(false);
      toast("Lab added! 🧪", { icon: "✦", style: { background: "#1a1025", color: "#e879f9", border: "1px solid rgba(217,70,239,0.2)", fontSize: "13px" } });
    }
    setSaving(false);
  };

  // ── Edit ──
  const handleEdit = async (form: Omit<Lab, "id" | "user_id" | "created_at" | "status">) => {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase.from("labs").update(form).eq("id", editTarget.id);
    if (error) { toast.error("Failed to update"); }
    else {
      setLabs((prev) =>
        prev.map((l) => l.id === editTarget.id ? { ...l, ...form } : l)
            .sort((a,b) => new Date(a.lab_exam_date).getTime() - new Date(b.lab_exam_date).getTime()));
      setEditTarget(null);
      toast.success("Lab updated!");
    }
    setSaving(false);
  };

  // ── Toggle ──
  const handleToggle = async (id: string, status: Status) => {
    setLabs((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    await supabase.from("labs").update({ status }).eq("id", id);
    if (status === "completed")
      toast("Lab complete! 🎉", { icon: "✓", style: { background: "#0f2a1a", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)", fontSize: "13px" } });
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setLabs((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from("labs").delete().eq("id", id);
    if (error) toast.error("Failed to delete"); else toast.success("Lab deleted");
  };

  // ── Derived ──
  const filtered = labs.filter((l) => filter === "all" ? true : l.status === filter);
  const pending   = labs.filter((l) => l.status === "pending").length;
  const urgent    = labs.filter((l) => l.status === "pending" && daysLeft(l.lab_exam_date) <= 3 && daysLeft(l.lab_exam_date) >= 0).length;

  return (
    <>
      <style>{STYLES}</style>

      <div className="min-h-screen bg-[#08080f] text-white flex flex-col">

        {/* ── Background ── */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-fuchsia-700/7 blur-[130px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-700/6 blur-[110px] rounded-full" />
          <div className="absolute bottom-1/3 left-0 w-[300px] h-[300px] bg-indigo-700/5 blur-[90px] rounded-full" />
          <div className="absolute inset-0 opacity-[0.018]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        {/* ── Navbar ── */}
        <header className="relative z-20 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-md px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-md shadow-fuchsia-500/30">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01-.659 1.591l-1.591 1.591M19.8 15l-3.346 3.346a2.25 2.25 0 01-1.591.659H9.137a2.25 2.25 0 01-1.591-.659L4.2 15m15.6 0H4.2" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:block">StudySync</span>
          </div>

          <NavPill current="/labs" />

          {user && (
            <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white">
              {user.email?.slice(0,2).toUpperCase()}
            </div>
          )}
        </header>

        {/* ── Content ── */}
        <main className="relative flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">

          {/* Page header */}
          <div className="mb-8 fade-up">
            <h1 className="text-3xl font-black tracking-tight"
              style={{ background: "linear-gradient(135deg,#e879f9,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Lab Planner
            </h1>
            <p className="text-white/30 text-sm mt-1">
              {pending} pending{urgent > 0 && <span className="text-red-400 ml-1.5">· {urgent} urgent</span>}
            </p>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="mb-7 bg-white/[0.03] backdrop-blur-sm border border-fuchsia-500/15 rounded-2xl p-5 shadow-2xl shadow-black/30 scale-in">
              <h2 className="text-xs font-bold text-fuchsia-400/70 uppercase tracking-widest mb-4">New Lab</h2>
              <LabForm onSave={handleAdd} onCancel={() => setShowForm(false)} saving={saving} />
            </div>
          )}

          {/* Edit form */}
          {editTarget && (
            <div className="mb-7 bg-white/[0.03] backdrop-blur-sm border border-fuchsia-500/15 rounded-2xl p-5 shadow-2xl shadow-black/30 scale-in">
              <h2 className="text-xs font-bold text-fuchsia-400/70 uppercase tracking-widest mb-4">Edit Lab</h2>
              <LabForm initial={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} saving={saving} />
            </div>
          )}

          {/* Controls */}
          {!loading && labs.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-6 fade-up" style={{ animationDelay: "80ms" }}>
              {/* Stats */}
              <div className="flex items-center gap-3 mr-2">
                {[
                  { label: "Total",     val: labs.length,    c: "text-white/60"  },
                  { label: "Pending",   val: pending,         c: "text-amber-400" },
                  { label: "Done",      val: labs.length - pending, c: "text-emerald-400" },
                ].map(({ label, val, c }) => (
                  <div key={label} className="text-center">
                    <p className={`text-lg font-black tabular-nums ${c}`}>{val}</p>
                    <p className="text-[9px] text-white/20 uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex-1" />

              {/* Filter */}
              <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 gap-0.5">
                {(["all","pending","completed"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                      filter === f ? "bg-white/[0.09] text-white" : "text-white/30 hover:text-white/60"
                    }`}>{f}</button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 gap-0.5">
                {([["list","☰ List"],["timeline","⏱ Timeline"]] as [View, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      view === v ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/20" : "text-white/30 hover:text-white/60"
                    }`}>{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          {loading ? <Skeleton />
            : labs.length === 0 ? <EmptyState onAdd={() => setShowForm(true)} />
            : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-3 text-center fade-up">
                <p className="text-white/30 font-semibold">No {filter} labs</p>
                <button onClick={() => setFilter("all")} className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors">Clear filter</button>
              </div>
            ) : view === "timeline" ? (
              <TimelineView labs={filtered} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((lab, i) => (
                  <LabCard key={lab.id} lab={lab} index={i}
                    onToggle={handleToggle} onEdit={setEditTarget} onDelete={handleDelete} />
                ))}
              </div>
            )
          }
        </main>

        {/* FAB */}
        {!showForm && !editTarget && !loading && (
          <button onClick={() => setShowForm(true)}
            className="shimmer-btn fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-fuchsia-500/20 hover:scale-110 active:scale-95 transition-transform duration-200 fade-up"
            title="Add Lab">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
