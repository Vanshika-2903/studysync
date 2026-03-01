"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Achievement } from "@/lib/achievementLogic";
import { ALL_BADGES } from "@/lib/achievementLogic";
import AchievementCard from "./AchievementCard";

type Filter  = "all" | "unlocked" | "locked";
type Category = "all" | "streak" | "tasks" | "focus" | "subjects" | "xp";

const CATEGORY_LABELS: Record<Category, { label: string; icon: string }> = {
  all:      { label: "All",      icon: "✦"  },
  streak:   { label: "Streak",   icon: "🔥" },
  tasks:    { label: "Tasks",    icon: "✅" },
  focus:    { label: "Focus",    icon: "⏱" },
  subjects: { label: "Subjects", icon: "📚" },
  xp:       { label: "XP",       icon: "⭐" },
};

type Props = {
  achievements: Achievement[];
};

export default function AchievementGrid({ achievements }: Props) {
  const [filter,   setFilter]   = useState<Filter>("all");
  const [category, setCategory] = useState<Category>("all");

  const unlockedKeys = new Set(achievements.map(a => a.badge_key));

  // Apply filters
  const filtered = ALL_BADGES.filter(def => {
    const isUnlocked = unlockedKeys.has(def.key);
    if (filter === "unlocked" && !isUnlocked) return false;
    if (filter === "locked"   &&  isUnlocked) return false;
    if (category !== "all" && def.category !== category) return false;
    return true;
  });

  // Sort: unlocked first, then locked
  const sorted = [...filtered].sort((a, b) => {
    const aU = unlockedKeys.has(a.key) ? 0 : 1;
    const bU = unlockedKeys.has(b.key) ? 0 : 1;
    return aU - bU;
  });

  return (
    <div>
      {/* ── Filter row ── */}
      <div className="flex flex-wrap gap-3 mb-7">
        {/* Status filter */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1 gap-0.5">
          {(["all", "unlocked", "locked"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                filter === f
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                  : "text-white/35 hover:text-white/70"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => {
            const { label, icon } = CATEGORY_LABELS[c];
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  active
                    ? "bg-white/[0.09] text-white border-white/15"
                    : "text-white/30 border-white/[0.07] hover:text-white/60 hover:border-white/12"
                }`}>
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <AnimatePresence mode="wait">
        {sorted.length === 0 ? (
          <motion.div key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-3xl">
              🏆
            </div>
            <div>
              <p className="text-white/40 font-bold">No badges here</p>
              <p className="text-white/20 text-sm mt-1">Try a different filter</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`${filter}-${category}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {sorted.map((def, i) => (
              <AchievementCard
                key={def.key}
                badgeKey={def.key}
                unlocked={achievements.find(a => a.badge_key === def.key)}
                index={i}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
