"use client";

import { motion } from "framer-motion";
import type { Achievement } from "@/lib/achievementLogic";
import { ALL_BADGES, RARITY_CONFIG } from "@/lib/achievementLogic";

type Props = {
  badgeKey: string;
  unlocked?: Achievement;
  index: number;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function AchievementCard({ badgeKey, unlocked, index }: Props) {
  const def     = ALL_BADGES.find(b => b.key === badgeKey);
  if (!def) return null;

  const isUnlocked = !!unlocked;
  const rarity     = RARITY_CONFIG[def.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.055, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={isUnlocked ? { y: -5, scale: 1.02 } : { scale: 1.01 }}
      className="relative group rounded-2xl p-5 border flex flex-col gap-4 overflow-hidden transition-shadow duration-300"
      style={{
        background: isUnlocked
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.015)",
        borderColor: isUnlocked
          ? `${def.glowColor}35`
          : "rgba(255,255,255,0.06)",
        boxShadow: isUnlocked
          ? `0 0 0 0 ${def.glowColor}00`
          : "none",
      }}
    >
      {/* ── Unlocked top glow line ── */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${def.glowColor}70, transparent)` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── Ambient glow blob (unlocked only) ── */}
      {isUnlocked && (
        <motion.div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${def.glowColor}18 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ── Header: icon + rarity ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-all duration-300"
          style={{
            background: isUnlocked
              ? `radial-gradient(circle, ${def.glowColor}22 0%, ${def.glowColor}08 100%)`
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${isUnlocked ? `${def.glowColor}30` : "rgba(255,255,255,0.07)"}`,
            filter: isUnlocked ? "none" : "grayscale(1) opacity(0.3)",
            boxShadow: isUnlocked ? `0 4px 20px ${def.glowColor}20` : "none",
          }}
        >
          {def.icon}

          {/* Lock overlay */}
          {!isUnlocked && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <svg className="w-5 h-5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          )}
        </div>

        {/* Rarity pill */}
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
          style={{
            background: isUnlocked ? rarity.bg : "rgba(255,255,255,0.04)",
            color: isUnlocked ? rarity.color : "rgba(255,255,255,0.2)",
            border: `1px solid ${isUnlocked ? rarity.border : "rgba(255,255,255,0.07)"}`,
          }}
        >
          {rarity.label}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex-1">
        <h3
          className="text-sm font-black leading-snug mb-1.5 transition-all duration-300"
          style={{ color: isUnlocked ? "#fff" : "rgba(255,255,255,0.25)" }}
        >
          {def.title}
        </h3>
        <p
          className="text-xs leading-relaxed"
          style={{ color: isUnlocked ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)" }}
        >
          {def.description}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t"
        style={{ borderColor: isUnlocked ? `${def.glowColor}15` : "rgba(255,255,255,0.04)" }}>
        {isUnlocked ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: def.glowColor }} />
              <span className="text-[10px] font-bold" style={{ color: `${def.glowColor}cc` }}>Unlocked</span>
            </div>
            <span className="text-[10px] text-white/25 font-medium">{fmt(unlocked.unlocked_at)}</span>
          </>
        ) : (
          <div className="flex items-center gap-1.5 w-full">
            <svg className="w-3 h-3 text-white/15 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[10px] text-white/15 font-semibold">Not yet unlocked</span>
          </div>
        )}
      </div>

      {/* ── Hover glow ring (unlocked) ── */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `inset 0 0 0 1px ${def.glowColor}25, 0 0 40px ${def.glowColor}12` }}
        />
      )}
    </motion.div>
  );
}
