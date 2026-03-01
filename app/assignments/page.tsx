"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "completed";

type Assignment = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  subject_name: string;
  deadline: string;
  status: Status;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(deadline: string): number {
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function DeadlineBadge({ deadline, status }: { deadline: string; status: Status }) {
  const days = getDaysLeft(deadline);
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        ✓ Done
      </span>
    );
  }
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-white/25 border border-white/[0.07]">
      Overdue
    </span>
  );
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse">
      Due Today
    </span>
  );
  if (days <= 2) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
      {days}d left
    </span>
  );
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
      {days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/35 border border-white/[0.08]">
      {days}d left
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-36 bg-white/[0.08] rounded-lg" />
        <div className="h-4 w-14 bg-white/[0.05] rounded-full" />
      </div>
      <div className="h-3 w-20 bg-white/[0.05] rounded-lg" />
      <div className="h-3 w-full bg-white/[0.04] rounded-lg" />
      <div className="h-3 w-3/4 bg-white/[0.04] rounded-lg" />
    </div>
  );
}

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

function AssignmentForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Assignment>;
  onSave: (data: Omit<Assignment, "id" | "user_id" | "created_at" | "status">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subjectName, setSubjectName] = useState(initial?.subject_name ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");

  const isEdit = !!initial?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;
    onSave({ title: title.trim(), description: description.trim(), subject_name: subjectName.trim(), deadline });
  };

  const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all duration-200";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title *"
            className={inputClass}
            required
          />
        </div>
        <input
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="Subject (e.g. Physics)"
          className={inputClass}
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={`${inputClass} text-white/60`}
          required
        />
        <div className="sm:col-span-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes or description (optional)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-xs text-white/30 hover:text-white py-2 rounded-xl hover:bg-white/[0.05] transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim() || !deadline}
          className="flex-[3] text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold py-2 rounded-xl transition-all duration-200 shadow-md shadow-violet-500/20"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Assignment"}
        </button>
      </div>
    </form>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  onComplete,
  onEdit,
  onDelete,
}: {
  assignment: Assignment;
  onComplete: (id: string, status: Status) => void;
  onEdit: (a: Assignment) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = getDaysLeft(assignment.deadline);
  const isUrgent = days <= 2 && days >= 0 && assignment.status === "pending";
  const isOverdue = days < 0 && assignment.status === "pending";
  const isDone = assignment.status === "completed";

  return (
    <div className={`group relative bg-white/[0.02] border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 ${
      isDone
        ? "border-white/[0.05] opacity-60"
        : isUrgent
        ? "border-red-500/20 hover:border-red-500/30"
        : isOverdue
        ? "border-white/[0.05]"
        : "border-white/[0.07] hover:border-white/[0.12]"
    }`}>

      {/* Urgent glow strip */}
      {isUrgent && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent rounded-t-2xl" />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Complete checkbox */}
          <button
            onClick={() => onComplete(assignment.id, isDone ? "pending" : "completed")}
            className={`mt-0.5 w-4.5 h-4.5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
              isDone
                ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30"
                : "border-white/20 hover:border-violet-400 hover:shadow-sm hover:shadow-violet-500/20"
            }`}
            style={{ width: 18, height: 18 }}
          >
            {isDone && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="min-w-0">
            <h3 className={`text-sm font-semibold leading-snug truncate transition-all duration-200 ${isDone ? "line-through text-white/30" : "text-white/90"}`}>
              {assignment.title}
            </h3>
            {assignment.subject_name && (
              <span className="text-[10px] text-white/30 font-medium">{assignment.subject_name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <DeadlineBadge deadline={assignment.deadline} status={assignment.status} />

          {/* Actions — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-1">
            <button
              onClick={() => onEdit(assignment)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-150"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-0.5">
                <span className="text-[10px] text-rose-400">Sure?</span>
                <button onClick={() => onDelete(assignment.id)} className="text-[10px] text-rose-400 font-bold hover:text-rose-300">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-white/30 font-bold hover:text-white">No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {assignment.description && (
        <p className={`text-xs leading-relaxed transition-colors duration-200 ${isDone ? "text-white/20" : "text-white/35"}`}>
          {assignment.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span className="text-[10px] text-white/20">
          Due {formatDate(assignment.deadline)}
        </span>
        {isOverdue && !isDone && (
          <span className="text-[10px] text-white/20 italic">Overdue</span>
        )}
      </div>
    </div>
  );
}

// ─── Nav pill (same pattern as dashboard) ─────────────────────────────────────

function NavPill({ current }: { current: string }) {
  const items = [
    {
      href: "/dashboard", label: "Dashboard", shortLabel: "Home",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
      gradient: "from-violet-500 to-indigo-500", glow: "shadow-violet-500/25",
    },
    {
      href: "/assignments", label: "Assignments", shortLabel: "Work",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
      gradient: "from-sky-500 to-blue-500", glow: "shadow-sky-500/25",
    },
    {
      href: "/exam-mode", label: "Exam Mode", shortLabel: "Exams",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
      gradient: "from-red-500 to-orange-500", glow: "shadow-red-500/25",
    },
    {
      href: "/exam/advanced", label: "Advanced", shortLabel: "AI Plan",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
      gradient: "from-amber-500 to-orange-500", glow: "shadow-amber-500/25",
    },
    {
      href: "/timer", label: "Timer", shortLabel: "Timer",
      icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      gradient: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/25",
    },
  ];

  return (
    <nav className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 gap-0.5">
      {items.map((item) => {
        const active = current === item.href;
        return (
          <a key={item.href} href={item.href}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 group ${
              active
                ? `bg-gradient-to-r ${item.gradient} text-white shadow-md ${item.glow}`
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
            }`}
          >
            <span className={active ? "text-white" : "text-white/40 group-hover:text-white/70 transition-colors"}>{item.icon}</span>
            <span className="hidden lg:inline">{item.label}</span>
            <span className="inline lg:hidden">{item.shortLabel}</span>
          </a>
        );
      })}
    </nav>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      fetchAssignments(user.id);
    });
  }, [router]);

  // ── Fetch ──
  const fetchAssignments = async (userId: string) => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", userId)
      .order("deadline", { ascending: true });
    if (error) { toast.error("Failed to load assignments"); return; }
    setAssignments((data as Assignment[]) ?? []);
    setLoading(false);
  };

  // ── Add ──
  const handleAdd = async (formData: Omit<Assignment, "id" | "user_id" | "created_at" | "status">) => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("assignments")
      .insert({ ...formData, user_id: user.id, status: "pending" })
      .select()
      .single();
    if (error) { toast.error("Failed to add assignment"); }
    else {
      setAssignments((prev) =>
        [...prev, data as Assignment].sort((a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        )
      );
      setShowForm(false);
      toast.success("Assignment added!");
    }
    setSaving(false);
  };

  // ── Edit ──
  const handleEdit = async (formData: Omit<Assignment, "id" | "user_id" | "created_at" | "status">) => {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase
      .from("assignments")
      .update(formData)
      .eq("id", editTarget.id);
    if (error) { toast.error("Failed to update"); }
    else {
      setAssignments((prev) =>
        prev
          .map((a) => (a.id === editTarget.id ? { ...a, ...formData } : a))
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      );
      setEditTarget(null);
      toast.success("Assignment updated!");
    }
    setSaving(false);
  };

  // ── Toggle status ──
  const handleComplete = async (id: string, status: Status) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await supabase.from("assignments").update({ status }).eq("id", id);
    if (status === "completed") toast("Assignment done! 🎉", { icon: "✅", style: { background: "#0f2a1a", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)", fontSize: "13px" } });
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else toast.success("Deleted");
  };

  // ── Derived ──
  const filtered = assignments.filter((a) => filter === "all" ? true : a.status === filter);
  const pending = assignments.filter((a) => a.status === "pending").length;
  const urgent = assignments.filter((a) => a.status === "pending" && getDaysLeft(a.deadline) <= 2 && getDaysLeft(a.deadline) >= 0).length;
  const done = assignments.filter((a) => a.status === "completed").length;

  return (
    <div className="min-h-screen bg-[#08080f] text-white flex flex-col">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[280px] bg-sky-700/6 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 left-0 w-[350px] h-[350px] bg-indigo-700/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-md px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight hidden sm:block">StudySync</span>
        </div>

        <NavPill current="/assignments" />

        {/* User avatar */}
        {user && (
          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
            {user.email?.slice(0, 2).toUpperCase()}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="relative flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
            <p className="text-white/30 text-sm mt-0.5">
              {pending} pending{urgent > 0 && <span className="text-red-400 ml-1.5">· {urgent} urgent</span>}
            </p>
          </div>

          {!showForm && !editTarget && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 hover:scale-105 active:scale-100 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add Assignment</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="mb-6 bg-white/[0.03] border border-violet-500/15 rounded-2xl p-5 shadow-xl shadow-black/20">
            <h2 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">New Assignment</h2>
            <AssignmentForm
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        )}

        {/* Stats row */}
        {!loading && assignments.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total", value: assignments.length, color: "text-white/70" },
              { label: "Pending", value: pending, color: "text-amber-400" },
              { label: "Completed", value: done, color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-3 text-center">
                <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
                <p className="text-[10px] text-white/25 mt-0.5 font-medium uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        {!loading && assignments.length > 0 && (
          <div className="flex items-center gap-1 mb-5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
            {(["all", "pending", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                  filter === f
                    ? "bg-white/[0.09] text-white shadow-sm"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <svg className="w-7 h-7 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <div>
              <p className="text-white/40 font-semibold">
                {filter === "all" ? "No assignments yet" : `No ${filter} assignments`}
              </p>
              <p className="text-white/20 text-sm mt-0.5">
                {filter === "all" ? "Click \"Add Assignment\" to get started" : "Try a different filter"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((a) =>
              editTarget?.id === a.id ? (
                <div key={a.id} className="bg-white/[0.03] border border-violet-500/15 rounded-2xl p-5 sm:col-span-2 shadow-xl shadow-black/20">
                  <h2 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">Edit Assignment</h2>
                  <AssignmentForm
                    initial={editTarget}
                    onSave={handleEdit}
                    onCancel={() => setEditTarget(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  onComplete={handleComplete}
                  onEdit={setEditTarget}
                  onDelete={handleDelete}
                />
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
