"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import StudyTimer from "@/app/components/StudyTimer";

export default function TimerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      setLoading(false);
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#08080f] text-white flex flex-col">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-700/6 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-indigo-700/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-md px-4 sm:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </button>
          <span className="text-white/15">·</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight">Study Timer</span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2 text-xs text-white/30">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
              {user.email?.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden sm:inline truncate max-w-[140px]">{user.email}</span>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        {loading ? (
          <div className="w-full max-w-md">
            <div className="h-[520px] rounded-3xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black tracking-tight">Study Timer</h1>
              <p className="text-white/30 text-sm mt-1">Stay focused. Earn XP. Take breaks.</p>
            </div>
            <StudyTimer userId={user?.id} />
          </>
        )}
      </main>
    </div>
  );
}
