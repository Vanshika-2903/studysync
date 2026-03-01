"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "task" | "assignment" | "lab_exam" | "lab_submission" | "exam";
  subject?: string;
  notes?: string;
  status?: string;
  topics?: string[];
};

const TYPE_CONFIG = {
  task:            { label: "Task",            color: "#60a5fa", bg: "from-blue-600/20 to-blue-500/10",   border: "border-blue-500/30",  icon: "✅", glow: "shadow-blue-500/20"   },
  assignment:      { label: "Assignment",      color: "#a78bfa", bg: "from-violet-600/20 to-violet-500/10", border: "border-violet-500/30", icon: "📋", glow: "shadow-violet-500/20" },
  lab_exam:        { label: "Lab Exam",        color: "#f87171", bg: "from-red-600/20 to-red-500/10",     border: "border-red-500/30",   icon: "🧪", glow: "shadow-red-500/20"    },
  lab_submission:  { label: "Lab Submission",  color: "#fb923c", bg: "from-orange-600/20 to-orange-500/10",border:"border-orange-500/30",icon: "📤", glow: "shadow-orange-500/20" },
  exam:            { label: "Exam",            color: "#f472b6", bg: "from-pink-600/20 to-pink-500/10",   border: "border-pink-500/30",  icon: "📝", glow: "shadow-pink-500/20"   },
};

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function daysLeft(d: Date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export default function EventModal({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <AnimatePresence>
      {event && (() => {
        const cfg = TYPE_CONFIG[event.type];
        const days = daysLeft(event.start);
        return (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md bg-[#0d0d1a] border ${cfg.border} rounded-3xl overflow-hidden shadow-2xl ${cfg.glow}`}
            >
              {/* Top glow strip */}
              <div className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}60, transparent)` }} />

              {/* Ambient glow blob */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl opacity-30"
                style={{ background: cfg.color }} />

              {/* Header */}
              <div className={`relative px-6 pt-7 pb-5 bg-gradient-to-b ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1 block"
                        style={{ color: `${cfg.color}99` }}>{cfg.label}</span>
                      <h2 className="text-lg font-black text-white leading-snug">{event.title}</h2>
                      {event.subject && (
                        <p className="text-sm mt-0.5" style={{ color: `${cfg.color}80` }}>{event.subject}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={onClose}
                    className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all duration-150 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">

                {/* Date */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}20` }}>
                    📅
                  </div>
                  <div>
                    <p className="text-xs text-white/30 font-semibold uppercase tracking-wide">Date</p>
                    <p className="text-sm text-white/80 font-medium">{fmt(event.start)}</p>
                  </div>
                </div>

                {/* Days left */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}20` }}>
                    ⏳
                  </div>
                  <div>
                    <p className="text-xs text-white/30 font-semibold uppercase tracking-wide">Countdown</p>
                    {days < 0 ? (
                      <p className="text-sm font-bold text-white/30">{Math.abs(days)} days ago</p>
                    ) : days === 0 ? (
                      <p className="text-sm font-black text-red-400 animate-pulse">Due Today!</p>
                    ) : (
                      <p className="text-sm font-bold" style={{ color: days <= 3 ? "#f87171" : days <= 7 ? "#fb923c" : "#a3a3a3" }}>
                        {days} day{days !== 1 ? "s" : ""} left
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                {event.status && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                      style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}20` }}>
                      🏷️
                    </div>
                    <div>
                      <p className="text-xs text-white/30 font-semibold uppercase tracking-wide">Status</p>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        event.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                          : "bg-white/[0.07] text-white/50 border border-white/[0.1]"
                      }`}>
                        {event.status === "completed" ? "✓ Completed" : "Pending"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Topics */}
                {event.topics && event.topics.length > 0 && (
                  <div>
                    <p className="text-xs text-white/30 font-semibold uppercase tracking-wide mb-2">Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {event.topics.map((t, i) => (
                        <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                          style={{ background: `${cfg.color}12`, color: `${cfg.color}cc`, border: `1px solid ${cfg.color}20` }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {event.notes && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                    <p className="text-xs text-white/30 font-semibold uppercase tracking-wide mb-2">Notes</p>
                    <p className="text-sm text-white/50 leading-relaxed">{event.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <button onClick={onClose}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white/60 hover:text-white border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200">
                  Close
                </button>
              </div>

              {/* Bottom glow */}
              <div className="absolute inset-x-0 bottom-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}40, transparent)` }} />
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
