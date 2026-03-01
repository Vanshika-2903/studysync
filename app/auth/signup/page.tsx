"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type FormState = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  age: string;
  password: string;
};

const STEPS = ["Account", "Profile", "Finish"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    age: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep((s) => s + 1);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Insert into profiles table
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: form.fullName,
      username: form.username,
      email: form.email,
      phone: form.phone,
      age: parseInt(form.age),
      avatar_url: null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/auth/login"), 2500);
  };

  return (
    <main className="min-h-screen bg-[#08080f] flex items-center justify-center px-4 py-12 font-sans">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-700/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-fuchsia-700/10 blur-[100px] rounded-full" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">StudySync</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Join for free</h1>
          <p className="text-white/40 text-sm mt-1">Your learning journey starts here</p>
        </div>

        {/* Step indicator */}
        {!success && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i < step
                        ? "bg-violet-500 text-white"
                        : i === step
                        ? "bg-violet-600 text-white ring-2 ring-violet-500/40 ring-offset-1 ring-offset-[#08080f]"
                        : "bg-white/10 text-white/30"
                    }`}
                  >
                    {i < step ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs font-medium transition-colors ${i === step ? "text-white/70" : "text-white/25"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px transition-colors ${i < step ? "bg-violet-500/60" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-md shadow-2xl">
          {success ? (
            /* Success state */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">You're all set, {form.fullName.split(" ")[0]}!</p>
                <p className="text-white/40 text-sm mt-1">Redirecting you to login…</p>
              </div>
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-[grow_2.5s_linear_forwards]" />
              </div>
            </div>
          ) : step === 0 ? (
            /* Step 1 — Account */
            <form onSubmit={nextStep} className="space-y-5">
              <div>
                <h2 className="text-white font-bold text-lg">Account details</h2>
                <p className="text-white/35 text-xs mt-0.5">Used to log in to your account</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Email address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                  />
                </div>
                {/* Password strength hint */}
                {form.password.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          form.password.length >= i * 3
                            ? i <= 1
                              ? "bg-red-500"
                              : i <= 2
                              ? "bg-orange-400"
                              : i <= 3
                              ? "bg-yellow-400"
                              : "bg-emerald-400"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 mt-1"
              >
                Continue →
              </button>
            </form>
          ) : step === 1 ? (
            /* Step 2 — Profile */
            <form onSubmit={nextStep} className="space-y-5">
              <div>
                <h2 className="text-white font-bold text-lg">Your profile</h2>
                <p className="text-white/35 text-xs mt-0.5">Tell us a little about yourself</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
                    <input
                      type="text"
                      name="username"
                      required
                      value={form.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-7 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Age</label>
                  <input
                    type="number"
                    name="age"
                    required
                    min={5}
                    max={120}
                    value={form.age}
                    onChange={handleChange}
                    placeholder="18"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-violet-500/20"
                >
                  Continue →
                </button>
              </div>
            </form>
          ) : (
            /* Step 3 — Review & Submit */
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <h2 className="text-white font-bold text-lg">All looks good?</h2>
                <p className="text-white/35 text-xs mt-0.5">Review your details before creating your account</p>
              </div>

              {/* Summary card */}
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 space-y-3">
                {[
                  { label: "Name", value: form.fullName },
                  { label: "Username", value: `@${form.username}` },
                  { label: "Email", value: form.email },
                  { label: "Phone", value: form.phone },
                  { label: "Age", value: form.age },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-white/35 font-medium">{label}</span>
                    <span className="text-sm text-white/80 font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-violet-500/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Creating account…
                    </span>
                  ) : (
                    "Create account ✓"
                  )}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-white/25">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes grow {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </main>
  );
}

