"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "Easy" | "Medium" | "Hard";

type Exam = {
  id: string;
  user_id: string;
  subject_name: string;
  exam_date: string;
  difficulty: Difficulty;
  created_at: string;
};

type SyllabusTopic = {
  id: string;
  exam_id: string;
  user_id: string;
  topic: string;
  is_done: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysRemaining(dateStr: string): number {
  const examDate = new Date(dateStr);
  examDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type UrgencyStyle = {
  glow: string;
  badge: string;
  border: string;
  bar: string;
  days: string;
  label: string;
};

function getUrgencyStyle(days: number): UrgencyStyle {
  if (days < 0) return {
    glow: "",
    badge: "bg-white/[0.06] text-white/30",
    border: "border-white/[0.07]",
    bar: "bg-white/20",
    days: "text-white/30",
    label: "Completed",
  };
  if (days <= 3) return {
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    border: "border-red-500/25",
    bar: "bg-gradient-to-r from-red-500 to-rose-400",
    days: "text-red-400",
    label: days === 0 ? "Today!" : `${days}d left`,
  };
  if (days <= 7) return {
    glow: "shadow-[0_0_30px_rgba(249,115,22,0.12)]",
    badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    border: "border-orange-500/20",
    bar: "bg-gradient-to-r from-orange-500 to-amber-400",
    days: "text-orange-400",
    label: `${days}d left`,
  };
  if (days <= 14) return {
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.10)]",
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    border: "border-yellow-500/20",
    bar: "bg-gradient-to-r from-yellow-500 to-amber-300",
    days: "text-yellow-400",
    label: `${days}d left`,
  };
  return {
    glow: "",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    border: "border-emerald-500/15",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
    days: "text-emerald-400",
    label: `${days}d left`,
  };
}

function getDifficultyStyle(d: Difficulty) {
  if (d === "Easy") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
  if (d === "Medium") return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
  return "bg-red-500/15 text-red-400 border border-red-500/25";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-white/[0.10] rounded-lg" />
          <div className="h-3 w-24 bg-white/[0.07] rounded-lg" />
        </div>
        <div className="h-7 w-16 bg-white/[0.08] rounded-full" />
      </div>
      <div className="h-1.5 w-full bg-white/[0.07] rounded-full" />
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-white/[0.06] rounded-lg" />
        <div className="h-3 w-12 bg-white/[0.06] rounded-lg" />
      </div>
    </div>
  );
}

// ─── Exam Card ────────────────────────────────────────────────────────────────

function ExamCard({ exam, userId, onDelete, onXp }: { exam: Exam; userId: string; onDelete: (id: string) => void; onXp: (wasCompleted: boolean, isNowCompleted: boolean, amount: number) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [topicsFetched, setTopicsFetched] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);

  const days = getDaysRemaining(exam.exam_date);
  const urgency = getUrgencyStyle(days);
  const isPast = days < 0;
  const totalWindow = 30;
  const barWidth = isPast ? 100 : Math.max(5, Math.round(((totalWindow - Math.min(days, totalWindow)) / totalWindow) * 100));
  const doneTopic = topics.filter((t) => t.is_done).length;
  const syllabusProgress = topics.length > 0 ? Math.round((doneTopic / topics.length) * 100) : 0;

  const handleSyllabusToggle = async () => {
    setSyllabusOpen((v) => !v);
    if (!topicsFetched) {
      setLoadingTopics(true);
      const { data } = await supabase
        .from("syllabus_topics")
        .select("*")
        .eq("exam_id", exam.id)
        .order("created_at", { ascending: true });
      setTopics((data as SyllabusTopic[]) ?? []);
      setTopicsFetched(true);
      setLoadingTopics(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setAddingTopic(true);
    const { data, error } = await supabase
      .from("syllabus_topics")
      .insert({ topic: newTopic.trim(), is_done: false, exam_id: exam.id, user_id: userId })
      .select()
      .single();
    if (!error && data) {
      setTopics((prev) => [...prev, data as SyllabusTopic]);
      setNewTopic("");
      setShowTopicInput(false);
    } else {
      toast.error("Failed to add topic");
    }
    setAddingTopic(false);
  };

  const handleTopicToggle = async (topicId: string, val: boolean) => {
    const prevTopic = topics.find((t) => t.id === topicId);
    const wasCompleted = prevTopic?.is_done ?? false;
    setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, is_done: val } : t));
    await supabase.from("syllabus_topics").update({ is_done: val }).eq("id", topicId);
    onXp(wasCompleted, val, 5); // only awards if false → true
  };

  const handleTopicDelete = async (topicId: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    await supabase.from("syllabus_topics").delete().eq("id", topicId);
  };

  return (
    <div className={`group relative bg-white/[0.03] border ${urgency.border} rounded-2xl flex flex-col transition-all duration-300 hover:bg-white/[0.05] ${urgency.glow} ${isPast ? "opacity-60" : ""}`}>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`font-bold text-lg tracking-tight truncate ${isPast ? "text-white/40 line-through" : "text-white"}`}>
              {exam.subject_name}
            </h3>
            <p className="text-xs text-white/35 mt-0.5">{formatDate(exam.exam_date)}</p>
          </div>
          <span className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full ${urgency.badge}`}>
            {urgency.label}
          </span>
        </div>

        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${urgency.bar}`} style={{ width: `${barWidth}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyStyle(exam.difficulty)}`}>
              {exam.difficulty}
            </span>
            {!isPast && (
              <span className={`text-xs font-medium ${urgency.days}`}>
                {days === 0 ? "Exam is today!" : `${days} day${days !== 1 ? "s" : ""} remaining`}
              </span>
            )}
            {isPast && <span className="text-xs text-white/25 italic">Past exam</span>}
          </div>

          {confirming ? (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-2.5 py-1.5 shrink-0">
              <span className="text-xs text-red-400">Delete?</span>
              <button onClick={() => onDelete(exam.id)} className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors">Yes</button>
              <button onClick={() => setConfirming(false)} className="text-xs text-white/30 hover:text-white font-bold transition-colors">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Syllabus toggle button */}
      <button
        onClick={handleSyllabusToggle}
        className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.05] text-xs text-white/35 hover:text-white/70 hover:bg-white/[0.03] transition-all duration-200 rounded-b-2xl"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="font-medium">Syllabus</span>
          {topicsFetched && topics.length > 0 && (
            <span className="bg-white/[0.08] text-white/40 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
              {doneTopic}/{topics.length}
            </span>
          )}
        </div>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${syllabusOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Syllabus panel */}
      {syllabusOpen && (
        <div className="px-5 pb-4 space-y-2 border-t border-white/[0.04] pt-3">
          {topicsFetched && topics.length > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-white/25 mb-1.5">
                <span>Syllabus coverage</span>
                <span>{syllabusProgress}%</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${syllabusProgress === 100 ? "bg-emerald-400" : "bg-violet-500"}`}
                  style={{ width: `${syllabusProgress}%` }}
                />
              </div>
            </div>
          )}

          {loadingTopics ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white/[0.07] animate-pulse shrink-0" />
                  <div className="h-3 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${40 + i * 15}%` }} />
                </div>
              ))}
            </div>
          ) : topics.length === 0 && !showTopicInput ? (
            <p className="text-xs text-white/20 italic py-1">No topics yet — add your syllabus below</p>
          ) : (
            topics.map((topic) => (
              <div key={topic.id} className="flex items-center gap-2.5 py-1 group/topic">
                <button
                  onClick={() => handleTopicToggle(topic.id, !topic.is_done)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${topic.is_done ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-violet-400"}`}
                >
                  {topic.is_done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-xs transition-all duration-200 ${topic.is_done ? "line-through text-white/25" : "text-white/65"}`}>
                  {topic.topic}
                </span>
                <button
                  onClick={() => handleTopicDelete(topic.id)}
                  className="opacity-0 group-hover/topic:opacity-100 w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}

          {showTopicInput ? (
            <form onSubmit={handleAddTopic} className="flex gap-1.5 pt-1">
              <input
                autoFocus
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. Chapter 3 — Calculus…"
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-all duration-200"
              />
              <button type="button" onClick={() => { setShowTopicInput(false); setNewTopic(""); }}
                className="text-xs text-white/30 hover:text-white px-2 rounded-lg hover:bg-white/[0.05] transition-all">✕</button>
              <button type="submit" disabled={addingTopic || !newTopic.trim()}
                className="text-xs bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 text-white font-semibold px-2.5 py-1 rounded-lg transition-all">
                {addingTopic ? "…" : "Add"}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowTopicInput(true)}
              className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-violet-400 transition-colors duration-150 py-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add topic
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Exam Form (dropdown) ─────────────────────────────────────────────────

function AddExamForm({ userId, onAdd }: { userId: string; onAdd: (exam: Exam) => void }) {
  const [open, setOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !examDate) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("exams")
      .insert({ subject_name: subjectName.trim(), exam_date: examDate, difficulty, user_id: userId })
      .select()
      .single();
    if (!error && data) {
      onAdd(data as Exam);
      setSubjectName("");
      setExamDate("");
      setDifficulty("Medium");
      setOpen(false);
      toast.success(`${(data as Exam).subject_name} exam added!`);
    } else {
      toast.error("Failed to add exam. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="relative" ref={ref}>

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
          open
            ? "bg-white/[0.07] text-white/50"
            : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
        }`}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-45" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {open ? "Cancel" : "Add Exam"}
      </button>

      {/* Dropdown — opens below the button */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 bg-[#13131f] border border-violet-500/20 rounded-2xl shadow-2xl shadow-black/60">
          <div className="px-5 pt-4 pb-3 border-b border-white/[0.05]">
            <h3 className="text-sm font-bold text-white tracking-tight">New Exam</h3>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">
                Subject Name
              </label>
              <input
                autoFocus
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Mathematics, Physics…"
                className="w-full bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">
                Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white/70 outline-none transition-all duration-200"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                      difficulty === d
                        ? d === "Easy"
                          ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-400"
                          : d === "Medium"
                          ? "bg-amber-500/25 border-amber-500/40 text-amber-400"
                          : "bg-red-500/25 border-red-500/40 text-red-400"
                        : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.07]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !subjectName.trim() || !examDate}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              {submitting ? "Adding…" : "Add Exam"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExamModePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      const [{ data, error }, { data: profileData }] = await Promise.all([
        supabase.from("exams").select("*").eq("user_id", user.id).order("exam_date", { ascending: true }),
        supabase.from("profiles").select("xp").eq("id", user.id).single(),
      ]);
      if (error) toast.error("Failed to load exams.");
      else setExams((data as Exam[]) ?? []);
      if (profileData) setXp((profileData as { xp: number }).xp ?? 0);
      setLoading(false);
    };
    init();
  }, [router]);

  // ── XP helper — only awards on false → true transition ──
  const awardXpIfCompleted = async (wasCompleted: boolean, isNowCompleted: boolean, amount: number) => {
    if (!user) return;
    if (wasCompleted || !isNowCompleted) return;
    setXp((prev) => {
      const newXp = prev + amount;
      supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);
      return newXp;
    });
    toast(`+${amount} XP!`, { icon: "✨", style: { background: "#1e1a2e", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)", fontSize: "13px" } });
  };

  const handleAdd = (exam: Exam) =>
    setExams((prev) =>
      [...prev, exam].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
    );

  const handleDelete = async (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (!error) toast.success("Exam removed");
    else toast.error("Failed to delete exam");
  };

  const upcomingExams = exams.filter((e) => getDaysRemaining(e.exam_date) >= 0);
  const pastExams = exams.filter((e) => getDaysRemaining(e.exam_date) < 0);
  const nextExam = upcomingExams[0] ?? null;
  const nextDays = nextExam ? getDaysRemaining(nextExam.exam_date) : null;

  return (
    <div className="min-h-screen bg-[#08080f] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-red-700/6 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-violet-700/8 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
      </div>

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-md px-4 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </button>
          <span className="text-white/15">·</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md shadow-red-500/30">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight">Exam Mode</span>
          </div>
        </div>
        {user && <AddExamForm userId={user.id} onAdd={handleAdd} />}
      </header>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-8">

        {loading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-white/[0.08] rounded-xl animate-pulse" />
              <div className="h-4 w-64 bg-white/[0.05] rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          </div>

        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <svg className="w-9 h-9 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-red-500/8 blur-xl" />
            </div>
            <div>
              <p className="text-white/60 font-semibold text-lg">No exams scheduled</p>
              <p className="text-white/25 text-sm mt-1 max-w-xs">Click "Add Exam" in the top right to schedule your first exam.</p>
            </div>
          </div>

        ) : (
          <div className="space-y-10">

            {/* Hero banner — next exam */}
            {nextExam && nextDays !== null && (
              <div className={`relative overflow-hidden rounded-2xl border p-6 ${getUrgencyStyle(nextDays).border} bg-white/[0.03] ${getUrgencyStyle(nextDays).glow}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-1">Next Exam</p>
                    <h2 className="text-2xl font-bold tracking-tight">{nextExam.subject_name}</h2>
                    <p className="text-white/40 text-sm mt-1">{formatDate(nextExam.exam_date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-5xl font-black tabular-nums ${getUrgencyStyle(nextDays).days}`}>{nextDays}</p>
                    <p className="text-white/30 text-xs font-medium mt-0.5">days remaining</p>
                  </div>
                </div>
                <div className="relative mt-5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getUrgencyStyle(nextDays).bar}`}
                    style={{ width: `${Math.max(5, Math.round(((30 - Math.min(nextDays, 30)) / 30) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upcoming exams */}
            {upcomingExams.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold tracking-tight">Upcoming</h2>
                  <span className="text-xs bg-white/[0.07] text-white/40 px-2 py-0.5 rounded-full font-medium">
                    {upcomingExams.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingExams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} userId={user!.id} onDelete={handleDelete} onXp={awardXpIfCompleted} />
                  ))}
                </div>
              </section>
            )}

            {/* Past exams */}
            {pastExams.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold tracking-tight text-white/40">Completed</h2>
                  <span className="text-xs bg-white/[0.05] text-white/25 px-2 py-0.5 rounded-full font-medium">
                    {pastExams.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastExams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} userId={user!.id} onDelete={handleDelete} onXp={awardXpIfCompleted} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
