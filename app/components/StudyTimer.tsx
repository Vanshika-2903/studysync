"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { updateStreak } from "@/lib/streak";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "focus" | "break";

// ─── Sound synthesis ──────────────────────────────────────────────────────────
// Generates soft tones using Web Audio API — no external files needed

function playSound(type: "focus" | "break") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const notes = type === "break"
      ? [523.25, 659.25, 783.99] // C5 E5 G5 — soft major chord (break = relaxing)
      : [783.99, 659.25, 523.25]; // G5 E5 C5 — descending (focus = alert)

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.5);
    });
  } catch {
    // Silent fallback if AudioContext isn't available
  }
}

// ─── SVG Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({
  progress,      // 0–1
  mode,
  timeDisplay,
  isRunning,
}: {
  progress: number;
  mode: Mode;
  timeDisplay: string;
  isRunning: boolean;
}) {
  const size = 240;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const focusGradientId = "focusGrad";
  const breakGradientId = "breakGrad";
  const gradientId = mode === "focus" ? focusGradientId : breakGradientId;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={focusGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id={breakGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>

      {/* Center display */}
      <div className="absolute flex flex-col items-center justify-center gap-1">
        {/* Pulsing dot when running */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            isRunning
              ? mode === "focus" ? "bg-violet-400 animate-pulse" : "bg-emerald-400 animate-pulse"
              : "bg-white/20"
          }`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            mode === "focus" ? "text-violet-400" : "text-emerald-400"
          }`}>
            {mode}
          </span>
        </div>

        {/* Time */}
        <span className="text-5xl font-black tabular-nums tracking-tight text-white">
          {timeDisplay}
        </span>

        <span className="text-[11px] text-white/25 font-medium mt-0.5">
          {isRunning ? "in progress" : "ready"}
        </span>
      </div>
    </div>
  );
}

// ─── Input stepper ────────────────────────────────────────────────────────────

function MinuteStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 120,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-1 py-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
        <span className="text-sm font-bold text-white w-8 text-center tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
      <span className="text-[10px] text-white/20">min</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudyTimer({ userId }: { userId?: string }) {
  // Settings
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  // Timer state
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Stats
  const [sessionsToday, setSessionsToday] = useState(0);
  const [focusMinutesToday, setFocusMinutesToday] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Total seconds for current mode (used to compute progress)
  const totalSeconds = mode === "focus" ? focusMinutes * 60 : breakMinutes * 60;
  const progress = (totalSeconds - secondsLeft) / totalSeconds;

  // Format mm:ss
  const timeDisplay = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  // ── Award XP ──
  const awardXp = useCallback(async (amount: number) => {
    if (!userId) return;
    setXpEarned((prev) => prev + amount);
    const { data } = await supabase.from("profiles").select("xp").eq("id", userId).single();
    const currentXp = (data as { xp: number } | null)?.xp ?? 0;
    await supabase.from("profiles").update({ xp: currentXp + amount }).eq("id", userId);
  }, [userId]);

  // ── Session complete handler ──
  const handleSessionComplete = useCallback(() => {
    if (mode === "focus") {
      // Focus → Break
      playSound("break");
      setSessionsToday((s) => s + 1);
      setFocusMinutesToday((m) => m + focusMinutes);
      awardXp(10);
      if (userId) updateStreak(userId); // 🔥 update streak on focus complete
      toast("Break Time ☕", {
        icon: "☕",
        duration: 4000,
        style: {
          background: "#0f2a1a",
          color: "#6ee7b7",
          border: "1px solid rgba(16,185,129,0.25)",
          fontSize: "14px",
          fontWeight: "600",
        },
      });
      setMode("break");
      setSecondsLeft(breakMinutes * 60);
    } else {
      // Break → Focus
      playSound("focus");
      toast("Focus Time 🔥", {
        icon: "🔥",
        duration: 4000,
        style: {
          background: "#1e1a2e",
          color: "#c4b5fd",
          border: "1px solid rgba(139,92,246,0.25)",
          fontSize: "14px",
          fontWeight: "600",
        },
      });
      setMode("focus");
      setSecondsLeft(focusMinutes * 60);
    }
  }, [mode, focusMinutes, breakMinutes, awardXp]);

  // ── Tick ──
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current!);
  }, [isRunning]);

  // ── Detect session end ──
  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      handleSessionComplete();
    }
  }, [secondsLeft, isRunning, handleSessionComplete]);

  // ── Sync timer when settings change (only if not running) ──
  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(mode === "focus" ? focusMinutes * 60 : breakMinutes * 60);
    }
  }, [focusMinutes, breakMinutes, mode, isRunning]);

  // ── Controls ──
  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setMode("focus");
    setSecondsLeft(focusMinutes * 60);
  };

  return (
    <div className="w-full max-w-md mx-auto">

      {/* Glassmorphism card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40">

        {/* Ambient glow */}
        <div className={`pointer-events-none absolute inset-0 transition-all duration-1000 ${
          mode === "focus"
            ? "bg-gradient-to-br from-violet-500/8 via-transparent to-indigo-500/5"
            : "bg-gradient-to-br from-emerald-500/8 via-transparent to-cyan-500/5"
        }`} />

        {/* Top bar */}
        <div className="relative px-6 pt-5 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-md transition-all duration-500 ${
              mode === "focus"
                ? "bg-gradient-to-br from-violet-500 to-indigo-500 shadow-violet-500/30"
                : "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-emerald-500/30"
            }`}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white/80 tracking-tight">Study Timer</span>
          </div>

          {/* XP badge */}
          {xpEarned > 0 && (
            <div className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/25 rounded-full px-2.5 py-1">
              <span className="text-[10px]">✨</span>
              <span className="text-[11px] font-bold text-violet-400">+{xpEarned} XP</span>
            </div>
          )}
        </div>

        {/* Progress ring */}
        <div className="relative flex justify-center pt-6 pb-2">
          <ProgressRing
            progress={progress}
            mode={mode}
            timeDisplay={timeDisplay}
            isRunning={isRunning}
          />
        </div>

        {/* Mode pills */}
        <div className="flex justify-center gap-2 mb-6">
          {(["focus", "break"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (!isRunning) {
                  setMode(m);
                  setSecondsLeft(m === "focus" ? focusMinutes * 60 : breakMinutes * 60);
                }
              }}
              disabled={isRunning}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-200 ${
                mode === m
                  ? m === "focus"
                    ? "bg-violet-500/20 border border-violet-500/40 text-violet-400"
                    : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : "bg-white/[0.04] border border-white/[0.08] text-white/25 hover:text-white/50 disabled:cursor-not-allowed"
              }`}
            >
              {m === "focus" ? "🎯 Focus" : "☕ Break"}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="px-6 flex items-center justify-center gap-3 mb-6">

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.09] transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Start / Pause — main button */}
          {!isRunning ? (
            <button
              onClick={handleStart}
              className={`flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] shadow-md ${
                mode === "focus"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-500/25 hover:shadow-violet-500/40"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 shadow-emerald-500/25 hover:shadow-emerald-500/40"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start {mode === "focus" ? "Focus" : "Break"}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
          )}
        </div>

        {/* Settings — focus + break time steppers */}
        <div className="px-6 pb-5">
          <div className="flex items-center justify-center gap-6 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <MinuteStepper
              label="Focus"
              value={focusMinutes}
              onChange={setFocusMinutes}
              disabled={isRunning}
            />
            <div className="w-px h-10 bg-white/[0.07]" />
            <MinuteStepper
              label="Break"
              value={breakMinutes}
              onChange={setBreakMinutes}
              min={1}
              max={30}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="px-6 pb-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Sessions", value: sessionsToday, icon: "🎯" },
              { label: "Focus min", value: focusMinutesToday, icon: "⏱️" },
              { label: "XP earned", value: xpEarned, icon: "⭐" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 px-2">
                <span className="text-sm">{icon}</span>
                <span className="text-base font-black text-white tabular-nums">{value}</span>
                <span className="text-[9px] text-white/25 font-medium uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
