"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "./EventModal";
import EventModal from "./EventModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const EVENT_COLORS: Record<CalendarEvent["type"], { bg: string; text: string; dot: string }> = {
  task:           { bg: "rgba(37,99,235,0.75)",  text: "#bfdbfe", dot: "#3b82f6" },
  assignment:     { bg: "rgba(109,40,217,0.75)", text: "#ddd6fe", dot: "#8b5cf6" },
  lab_exam:       { bg: "rgba(185,28,28,0.80)",  text: "#fecaca", dot: "#ef4444" },
  lab_submission: { bg: "rgba(154,52,18,0.80)",  text: "#fed7aa", dot: "#f97316" },
  exam:           { bg: "rgba(157,23,77,0.80)",  text: "#fbcfe8", dot: "#ec4899" },
};

const LEGEND = [
  { type: "task"           as const, label: "Tasks"           },
  { type: "assignment"     as const, label: "Assignments"     },
  { type: "lab_exam"       as const, label: "Lab Exams"       },
  { type: "lab_submission" as const, label: "Lab Submissions" },
  { type: "exam"           as const, label: "Exams"           },
];

type View = "month" | "week" | "day";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function getCalendarGrid(current: Date): Date[] {
  const year    = current.getFullYear();
  const month   = current.getMonth();
  const first   = new Date(year, month, 1);
  const total   = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  const cells: Date[] = [];

  for (let i = leading - 1; i >= 0; i--) {
    cells.push(new Date(year, month, -i));
  }
  for (let i = 1; i <= total; i++) {
    cells.push(new Date(year, month, i));
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month + 1, i));
  }
  return cells;
}

// ─── Event Pill ───────────────────────────────────────────────────────────────

function EventPill({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const col = EVENT_COLORS[event.type];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-left truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight transition-all duration-150 hover:brightness-125 hover:-translate-y-px active:scale-95"
      style={{ background: col.bg, color: col.text }}
      title={event.title}
    >
      {event.title}
    </button>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ current, events, today, onEventClick }: {
  current: Date; events: CalendarEvent[]; today: Date;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const grid = getCalendarGrid(current);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.07]" style={{ background: "rgba(255,255,255,0.02)" }}>
        {DAYS.map(d => (
          <div key={d} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/25 border-r border-white/[0.05] last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7">
        {grid.map((d, i) => {
          const isThisMonth = d.getMonth() === current.getMonth();
          const isToday     = isSameDay(d, today);
          const dayEvents   = events.filter(ev => isSameDay(new Date(ev.start), d));
          const shown       = dayEvents.slice(0, 2);
          const extra       = dayEvents.length - 2;

          return (
            <div key={i}
              className="relative flex flex-col border-b border-r border-white/[0.05] last:border-r-0 transition-colors duration-150 hover:bg-white/[0.025]"
              style={{
                minHeight: 90,
                background: isThisMonth ? "transparent" : "rgba(0,0,0,0.18)",
              }}>

              {/* Date number */}
              <div className="flex justify-end p-1.5">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold transition-all
                  ${isToday
                    ? "bg-violet-500 text-white shadow-md shadow-violet-500/50"
                    : isThisMonth
                      ? "text-white/55"
                      : "text-white/18"
                  }`}>
                  {d.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-0.5 px-1 pb-1.5">
                {shown.map(ev => (
                  <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
                ))}
                {extra > 0 && (
                  <span className="text-[9px] font-bold px-1" style={{ color: "#a78bfa90" }}>
                    +{extra} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ current, events, today, onEventClick }: {
  current: Date; events: CalendarEvent[]; today: Date;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - current.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
      {/* Headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.07]" style={{ background: "rgba(255,255,255,0.02)" }}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className="text-center py-3 border-r border-white/[0.05] last:border-r-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-1">{DAYS[i]}</p>
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mx-auto
                ${isToday ? "bg-violet-500 text-white shadow-md shadow-violet-500/40" : "text-white/55"}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-7" style={{ minHeight: 400 }}>
        {days.map((d, i) => {
          const dayEvents = events.filter(ev => isSameDay(new Date(ev.start), d));
          const isToday   = isSameDay(d, today);
          return (
            <div key={i}
              className="border-r border-white/[0.05] last:border-r-0 p-1.5 space-y-1"
              style={{ background: isToday ? "rgba(139,92,246,0.04)" : "transparent" }}>
              {dayEvents.map(ev => (
                <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ current, events, today, onEventClick }: {
  current: Date; events: CalendarEvent[]; today: Date;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const dayEvents = events.filter(ev => isSameDay(new Date(ev.start), current));
  const isToday   = isSameDay(current, today);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
      {/* Header */}
      <div className="text-center py-6 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">{DAYS[current.getDay()]}</p>
        <div className={`w-14 h-14 flex items-center justify-center rounded-2xl text-2xl font-black mx-auto mb-1
          ${isToday ? "bg-violet-500 text-white shadow-lg shadow-violet-500/40" : "text-white/70 bg-white/[0.05]"}`}>
          {current.getDate()}
        </div>
        <p className="text-xs text-white/30">{MONTHS[current.getMonth()]} {current.getFullYear()}</p>
      </div>

      {/* Events */}
      <div className="p-5" style={{ minHeight: 400 }}>
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-40">
            <span className="text-4xl">📅</span>
            <p className="text-sm text-white/40 font-semibold">No events this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(ev => {
              const col = EVENT_COLORS[ev.type];
              return (
                <button key={ev.id} onClick={() => onEventClick(ev)}
                  className="w-full text-left rounded-2xl p-4 border transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.99]"
                  style={{ background: col.bg, borderColor: `${col.dot}30` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dot }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${col.text}90` }}>
                      {ev.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: col.text }}>{ev.title}</p>
                  {ev.subject && (
                    <p className="text-xs mt-0.5" style={{ color: `${col.text}70` }}>{ev.subject}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [view,          setView]          = useState<View>("month");
  const [current,       setCurrent]       = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [direction,     setDirection]     = useState(1);

  const navigate = (dir: "prev" | "next" | "today") => {
    if (dir === "today") { setCurrent(new Date()); return; }
    const delta = dir === "next" ? 1 : -1;
    setDirection(delta);
    const d = new Date(current);
    if (view === "month")      d.setMonth(d.getMonth() + delta);
    else if (view === "week")  d.setDate(d.getDate() + delta * 7);
    else                       d.setDate(d.getDate() + delta);
    setCurrent(d);
  };

  const title = (() => {
    if (view === "month") return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === "week") {
      const sun = new Date(current); sun.setDate(current.getDate() - current.getDay());
      const sat = new Date(sun);     sat.setDate(sun.getDate() + 6);
      const sLabel = `${MONTHS[sun.getMonth()].slice(0,3)} ${sun.getDate()}`;
      const eLabel = `${MONTHS[sat.getMonth()].slice(0,3)} ${sat.getDate()}, ${sat.getFullYear()}`;
      return `${sLabel} – ${eLabel}`;
    }
    return `${DAYS[current.getDay()]}, ${MONTHS[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`;
  })();

  return (
    <>
      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {LEGEND.map(({ type, label }) => {
          const col = EVENT_COLORS[type];
          return (
            <motion.div key={type}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: LEGEND.findIndex(l => l.type === type) * 0.05 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ background: `${col.dot}15`, borderColor: `${col.dot}30`, color: col.dot }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dot }} />
              {label}
            </motion.div>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Nav */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1">
          <button onClick={() => navigate("prev")}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.07] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button onClick={() => navigate("today")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all">
            Today
          </button>
          <button onClick={() => navigate("next")}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.07] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.h2 key={title}
            initial={{ opacity: 0, x: direction * 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -14 }}
            transition={{ duration: 0.18 }}
            className="text-base font-black text-white/80 tracking-tight flex-1">
            {title}
          </motion.h2>
        </AnimatePresence>

        {/* View toggle */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1 gap-0.5">
          {(["month", "week", "day"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                view === v
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                  : "text-white/35 hover:text-white/70"
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar body ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${view}-${title}`}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {view === "month" && (
            <MonthView current={current} events={events} today={today} onEventClick={setSelectedEvent} />
          )}
          {view === "week" && (
            <WeekView current={current} events={events} today={today} onEventClick={setSelectedEvent} />
          )}
          {view === "day" && (
            <DayView current={current} events={events} today={today} onEventClick={setSelectedEvent} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Modal ── */}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
