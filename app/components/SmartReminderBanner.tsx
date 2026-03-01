"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SmartReminder } from "@/lib/smartReminder";

// ─── Per-variant visual config ────────────────────────────────────────────────

const CONFIG = {
  overdue: {
    bg:          "rgba(239,68,68,0.09)",
    border:      "rgba(239,68,68,0.25)",
    topLine:     "#ef4444",
    textColor:   "#fca5a5",
    subColor:    "rgba(252,165,165,0.50)",
    btnBg:       "rgba(239,68,68,0.16)",
    btnBorder:   "rgba(239,68,68,0.32)",
    btnText:     "#fca5a5",
    glow:        "0 4px 28px rgba(239,68,68,0.14)",
    pulse:       true,
  },
  exam_urgent: {
    bg:          "rgba(249,115,22,0.09)",
    border:      "rgba(249,115,22,0.25)",
    topLine:     "#f97316",
    textColor:   "#fdba74",
    subColor:    "rgba(253,186,116,0.50)",
    btnBg:       "rgba(249,115,22,0.16)",
    btnBorder:   "rgba(249,115,22,0.32)",
    btnText:     "#fdba74",
    glow:        "0 4px 28px rgba(249,115,22,0.14)",
    pulse:       true,
  },
  assignment_urgent: {
    bg:          "rgba(234,179,8,0.08)",
    border:      "rgba(234,179,8,0.22)",
    topLine:     "#eab308",
    textColor:   "#fde047",
    subColor:    "rgba(253,224,71,0.45)",
    btnBg:       "rgba(234,179,8,0.14)",
    btnBorder:   "rgba(234,179,8,0.28)",
    btnText:     "#fde047",
    glow:        "0 4px 24px rgba(234,179,8,0.10)",
    pulse:       false,
  },
  lab_urgent: {
    bg:          "rgba(139,92,246,0.09)",
    border:      "rgba(139,92,246,0.24)",
    topLine:     "#8b5cf6",
    textColor:   "#c4b5fd",
    subColor:    "rgba(196,181,253,0.45)",
    btnBg:       "rgba(139,92,246,0.15)",
    btnBorder:   "rgba(139,92,246,0.28)",
    btnText:     "#c4b5fd",
    glow:        "0 4px 24px rgba(139,92,246,0.12)",
    pulse:       false,
  },
  on_track: {
    bg:          "rgba(56,189,248,0.07)",
    border:      "rgba(56,189,248,0.18)",
    topLine:     "#38bdf8",
    textColor:   "#7dd3fc",
    subColor:    "rgba(125,211,252,0.40)",
    btnBg:       "rgba(56,189,248,0.12)",
    btnBorder:   "rgba(56,189,248,0.22)",
    btnText:     "#7dd3fc",
    glow:        "0 4px 20px rgba(56,189,248,0.08)",
    pulse:       false,
  },
  no_deadlines: {
    bg:          "rgba(255,255,255,0.03)",
    border:      "rgba(255,255,255,0.08)",
    topLine:     "rgba(255,255,255,0.18)",
    textColor:   "rgba(255,255,255,0.40)",
    subColor:    "rgba(255,255,255,0.22)",
    btnBg:       "rgba(255,255,255,0.07)",
    btnBorder:   "rgba(255,255,255,0.12)",
    btnText:     "rgba(255,255,255,0.40)",
    glow:        "none",
    pulse:       false,
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  reminder:  SmartReminder | null;
  loading?:  boolean;
};

export default function SmartReminderBanner({ reminder, loading }: Props) {
  const [dismissed, setDismissed] = useState(false);

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-[52px] rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse mb-6" />
    );
  }

  if (!reminder || dismissed) return null;

  const cfg = CONFIG[reminder.variant];

  return (
    <AnimatePresence>
      <motion.div
        key={reminder.variant}
        initial={{ opacity: 0, y: -12, scaleY: 0.88 }}
        animate={{ opacity: 1,  y: 0,   scaleY: 1    }}
        exit={{    opacity: 0,  y: -8,  scaleY: 0.94  }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ originY: 0 }}
        className="relative mb-6 rounded-2xl overflow-hidden"
      >
        {/* Outer card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background:  cfg.bg,
            border:      `1px solid ${cfg.border}`,
            boxShadow:   cfg.glow,
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${cfg.topLine}80, transparent)` }}
          />

          {/* Pulsing ring for urgent variants */}
          {cfg.pulse && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: [
                  `inset 0 0 0 1px ${cfg.topLine}00`,
                  `inset 0 0 0 1px ${cfg.topLine}35`,
                  `inset 0 0 0 1px ${cfg.topLine}00`,
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Content row */}
          <div className="relative flex items-center gap-3 px-4 py-3 sm:px-5">

            {/* Icon — pulses on urgent */}
            <motion.span
              className="text-xl shrink-0 leading-none select-none"
              animate={cfg.pulse ? { scale: [1, 1.18, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {reminder.icon}
            </motion.span>

            {/* Text block */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-bold leading-snug truncate"
                style={{ color: cfg.textColor }}
              >
                {reminder.message}
              </p>
              {reminder.subtext && (
                <p
                  className="text-[11px] font-medium mt-0.5 truncate hidden sm:block"
                  style={{ color: cfg.subColor }}
                >
                  {reminder.subtext}
                </p>
              )}
            </div>

            {/* View button */}
            {reminder.href && reminder.linkLabel && (
              <a
                href={reminder.href}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 hover:brightness-125 hover:scale-105 active:scale-95"
                style={{
                  background: cfg.btnBg,
                  border:     `1px solid ${cfg.btnBorder}`,
                  color:      cfg.btnText,
                }}
              >
                {reminder.linkLabel}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            )}

            {/* Dismiss ✕ */}
            <button
              onClick={() => setDismissed(true)}
              title="Dismiss"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/[0.08] hover:scale-110 active:scale-95"
              style={{ color: cfg.subColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
