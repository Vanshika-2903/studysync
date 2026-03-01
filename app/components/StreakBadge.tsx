"use client";

import { getMilestone, getNextMilestone, type StreakData } from "@/lib/streak";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  streak: StreakData;
  loading?: boolean;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StreakSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-3 mb-6 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-white/[0.08]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-28 bg-white/[0.08] rounded-full" />
        <div className="h-2 w-full bg-white/[0.05] rounded-full" />
        <div className="h-2.5 w-20 bg-white/[0.06] rounded-full" />
      </div>
    </div>
  );
}

// ─── Fire animation CSS (injected inline) ────────────────────────────────────
// Tailwind doesn't support keyframe animations like this out of the box

const fireKeyframes = `
@keyframes flicker {
  0%, 100% { transform: scale(1) rotate(-1deg); opacity: 1; }
  25%       { transform: scale(1.05) rotate(1deg); opacity: 0.95; }
  50%       { transform: scale(0.97) rotate(-0.5deg); opacity: 1; }
  75%       { transform: scale(1.03) rotate(1.5deg); opacity: 0.93; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 12px 2px rgba(251,146,60,0.25); }
  50%       { box-shadow: 0 0 22px 6px rgba(251,146,60,0.45); }
}
@keyframes streak-in {
  from { opacity: 0; transform: translateY(6px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StreakBadge({ streak, loading = false }: Props) {
  if (loading) return <StreakSkeleton />;

  const current = streak.current_streak;
  const longest = streak.longest_streak;
  const milestone = getMilestone(current);
  const next = getNextMilestone(current);
  const isActive = current > 0;

  // Progress toward next milestone
  const prevMilestoneDays = milestone?.days ?? 0;
  const nextMilestoneDays = next?.days ?? (prevMilestoneDays + 10);
  const progressPct = next
    ? Math.round(((current - prevMilestoneDays) / (nextMilestoneDays - prevMilestoneDays)) * 100)
    : 100;

  // Border/glow color based on milestone or default
  const borderColor = milestone
    ? `border-[${milestone.color}30]`
    : "border-orange-500/20";
  const bgColor = milestone ? "bg-white/[0.03]" : "bg-white/[0.03]";

  return (
    <>
      {/* Inject keyframe styles */}
      <style>{fireKeyframes}</style>

      <div
        className={`relative flex items-center gap-4 ${bgColor} border ${borderColor} rounded-2xl px-4 py-3 mb-6 overflow-hidden transition-all duration-500`}
        style={{
          animation: "streak-in 0.4s ease-out",
          borderColor: milestone ? `${milestone.color}30` : "rgba(249,115,22,0.2)",
          ...(isActive ? { animation: "streak-in 0.4s ease-out, glow-pulse 2.5s ease-in-out infinite" } : {}),
        }}
      >
        {/* Ambient background glow */}
        {isActive && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: milestone
                ? `radial-gradient(ellipse at 0% 50%, ${milestone.color}08 0%, transparent 70%)`
                : "radial-gradient(ellipse at 0% 50%, rgba(251,146,60,0.06) 0%, transparent 70%)",
            }}
          />
        )}

        {/* Fire badge */}
        <div
          className="relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{
            background: milestone
              ? `linear-gradient(135deg, ${milestone.color}30, ${milestone.color}10)`
              : "linear-gradient(135deg, rgba(251,146,60,0.25), rgba(239,68,68,0.15))",
            border: `1px solid ${milestone ? milestone.color + "40" : "rgba(251,146,60,0.3)"}`,
            animation: isActive ? "glow-pulse 2.5s ease-in-out infinite" : "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              animation: isActive ? "flicker 1.8s ease-in-out infinite" : "none",
            }}
          >
            {milestone ? milestone.emoji : "🔥"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-2xl font-black tabular-nums leading-none"
                style={{
                  color: milestone ? milestone.color : "#fb923c",
                  textShadow: isActive
                    ? `0 0 20px ${milestone ? milestone.color + "60" : "rgba(251,146,60,0.4)"}`
                    : "none",
                }}
              >
                {current}
              </span>
              <span className="text-xs font-semibold text-white/40">
                day{current !== 1 ? "s" : ""} streak
              </span>
            </div>

            {/* Milestone label */}
            {milestone && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{
                  color: milestone.color,
                  background: `${milestone.color}15`,
                  border: `1px solid ${milestone.color}30`,
                }}
              >
                {milestone.label}
              </span>
            )}
          </div>

          {/* Progress bar toward next milestone */}
          {next && (
            <div className="mb-1.5">
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: milestone
                      ? `linear-gradient(90deg, ${milestone.color}, ${next.color})`
                      : "linear-gradient(90deg, #fb923c, #fbbf24)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/25 font-medium">
              Longest: <span className="text-white/40 font-bold">{longest} day{longest !== 1 ? "s" : ""}</span>
            </span>
            {next ? (
              <span className="text-[10px] text-white/20">
                {next.emoji} {next.label} in {next.days - current} day{next.days - current !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[10px] text-yellow-400/60 font-semibold">🏆 Max milestone!</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
