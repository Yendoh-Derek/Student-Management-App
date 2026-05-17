"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SessionResponse = {
  user: { id: number; email: string; role: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("testuser.local@sms.local");
  const [password, setPassword] = useState("Password123!");
  const [status, setStatus] = useState("Enter your credentials to continue.");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Signing you in...");
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        setStatus("Login failed. Double-check email/password.");
        return;
      }
      const data: SessionResponse = await response.json();
      setStatus(`Welcome back, ${data.user.email}. Redirecting...`);
      router.push("/");
      router.refresh();
    } catch {
      setStatus(`Could not reach API at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050711] px-6 py-16 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.25),transparent_35%)]" />
      <div className="relative mx-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-300">Student Management</p>
        <h1 className="mb-6 text-3xl font-semibold">Sign in</h1>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-11 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 outline-none ring-blue-400/60 transition focus:ring"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="min-h-11 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 outline-none ring-blue-400/60 transition focus:ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-300">
          {status}
        </p>
        <p className="mt-5 text-sm text-slate-300">
          New here?{" "}
          <Link href="/signup" className="font-medium text-blue-300 underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
