import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderVariant =
  | "overdue"
  | "exam_urgent"
  | "assignment_urgent"
  | "lab_urgent"
  | "on_track"
  | "no_deadlines";

export type SmartReminder = {
  variant:    ReminderVariant;
  icon:       string;
  message:    string;
  subtext?:   string;
  href?:      string;
  linkLabel?: string;
};

// ─── Util ─────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

// ─── Main exported helper ─────────────────────────────────────────────────────

export async function getSmartReminder(userId: string): Promise<SmartReminder> {
  // Fetch all sources in parallel — each is wrapped so a missing table won't crash
  const [examsRes, assignmentsRes, labsRes, tasksRes] = await Promise.all([
    supabase.from("exams").select("subject, exam_date, status").eq("user_id", userId),
    supabase.from("assignments").select("title, deadline, status").eq("user_id", userId),
    supabase.from("labs").select("lab_name, lab_exam_date, record_submission_date, status").eq("user_id", userId),
    supabase.from("tasks").select("deadline, is_completed").eq("user_id", userId),
  ]);

  const exams       = (examsRes.data       ?? []) as any[];
  const assignments = (assignmentsRes.data ?? []) as any[];
  const labs        = (labsRes.data        ?? []) as any[];
  const tasks       = (tasksRes.data       ?? []) as any[];

  // ── PRIORITY 1: anything overdue ──────────────────────────────────────────

  const overdueCount =
    exams.filter(      e => e.exam_date          && daysUntil(e.exam_date)             < 0 && e.status !== "completed").length +
    assignments.filter(a => a.deadline            && daysUntil(a.deadline)              < 0 && a.status !== "completed").length +
    labs.filter(       l => l.record_submission_date && daysUntil(l.record_submission_date) < 0 && l.status !== "completed").length +
    tasks.filter(      t => t.deadline            && daysUntil(t.deadline)              < 0 && !t.is_completed).length;

  if (overdueCount > 0) {
    return {
      variant:   "overdue",
      icon:      "⚠️",
      message:   `You have ${overdueCount} overdue item${overdueCount > 1 ? "s" : ""}. Finish it today.`,
      subtext:   "Don't let it pile up — tackle the oldest one first.",
      href:      "/assignments",
      linkLabel: "View overdue",
    };
  }

  // ── PRIORITY 2: exam within 2 days ────────────────────────────────────────

  const urgentExam = exams
    .filter(e => e.exam_date && e.status !== "completed")
    .map(e => ({ ...e, diff: daysUntil(e.exam_date) }))
    .filter(e => e.diff >= 0 && e.diff <= 2)
    .sort((a, b) => a.diff - b.diff)[0];

  if (urgentExam) {
    const when = urgentExam.diff === 0 ? "today" : urgentExam.diff === 1 ? "tomorrow" : `in ${urgentExam.diff} days`;
    return {
      variant:   "exam_urgent",
      icon:      "🔥",
      message:   `${urgentExam.subject ?? "Exam"} exam ${when}. Revise now.`,
      subtext:   "Focus mode activated — close distractions and open your notes.",
      href:      "/exam-mode",
      linkLabel: "Exam mode",
    };
  }

  // ── PRIORITY 3: assignment within 2 days ─────────────────────────────────

  const urgentAssignment = assignments
    .filter(a => a.deadline && a.status !== "completed")
    .map(a => ({ ...a, diff: daysUntil(a.deadline) }))
    .filter(a => a.diff >= 0 && a.diff <= 2)
    .sort((a, b) => a.diff - b.diff)[0];

  if (urgentAssignment) {
    const when = urgentAssignment.diff === 0 ? "due today" : urgentAssignment.diff === 1 ? "due tomorrow" : `due in ${urgentAssignment.diff} days`;
    return {
      variant:   "assignment_urgent",
      icon:      "📝",
      message:   `"${urgentAssignment.title}" ${when}.`,
      subtext:   "Submit on time — a late penalty is not worth it.",
      href:      "/assignments",
      linkLabel: "View assignment",
    };
  }

  // ── PRIORITY 4: lab exam or submission within 3 days ──────────────────────

  const urgentLab = labs
    .filter(l => l.status !== "completed")
    .map(l => {
      const examDiff = l.lab_exam_date           ? daysUntil(l.lab_exam_date)           : Infinity;
      const subDiff  = l.record_submission_date  ? daysUntil(l.record_submission_date)  : Infinity;
      return { ...l, examDiff, subDiff, minDiff: Math.min(examDiff, subDiff) };
    })
    .filter(l => l.minDiff >= 0 && l.minDiff <= 3)
    .sort((a, b) => a.minDiff - b.minDiff)[0];

  if (urgentLab) {
    const isExam = urgentLab.examDiff <= urgentLab.subDiff;
    const diff   = urgentLab.minDiff;
    const when   = diff === 0 ? "today" : diff === 1 ? "tomorrow" : `in ${diff} days`;
    return {
      variant:   "lab_urgent",
      icon:      "🧪",
      message:   `${isExam ? "Lab exam" : "Lab submission"} for "${urgentLab.lab_name}" ${when}.`,
      subtext:   isExam ? "Review your lab notes and prepare your record." : "Complete and submit your lab record on time.",
      href:      "/labs",
      linkLabel: "View labs",
    };
  }

  // ── PRIORITY 5: has upcoming work but nothing urgent ──────────────────────

  const hasUpcoming =
    exams.some(      e => e.exam_date              && daysUntil(e.exam_date)             >= 0 && e.status !== "completed") ||
    assignments.some(a => a.deadline               && daysUntil(a.deadline)              >= 0 && a.status !== "completed") ||
    labs.some(       l => l.lab_exam_date          && daysUntil(l.lab_exam_date)         >= 0 && l.status !== "completed") ||
    tasks.some(      t => t.deadline               && daysUntil(t.deadline)              >= 0 && !t.is_completed);

  if (hasUpcoming) {
    return {
      variant:   "on_track",
      icon:      "✨",
      message:   "You're on track. Keep going.",
      subtext:   "No urgent deadlines — a great time to get ahead.",
      href:      "/calendar",
      linkLabel: "View calendar",
    };
  }

  // ── PRIORITY 6: nothing at all ────────────────────────────────────────────

  return {
    variant:   "no_deadlines",
    icon:      "📅",
    message:   "No upcoming deadlines. Plan ahead.",
    subtext:   "Add assignments, labs, or exams to stay organised.",
    href:      "/assignments",
    linkLabel: "Add work",
  };
}
