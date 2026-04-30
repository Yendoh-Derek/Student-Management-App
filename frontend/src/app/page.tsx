"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SessionResponse = { user: { id: number; email: string; role: string; name?: string } };

export default function Home() {
  const [user, setUser] = useState<SessionResponse["user"] | null>(null);
  const [status, setStatus] = useState("Checking session...");

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!me.ok) {
          setStatus("You are currently signed out.");
          return;
        }
        const data: SessionResponse = await me.json();
        setUser(data.user);
        setStatus(`Signed in as ${data.user.role}.`);
      } catch {
        setStatus(`Cannot reach API at ${API_BASE}.`);
      }
    })();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#040611] px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.28),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.2),transparent_34%),linear-gradient(to_bottom,rgba(15,23,42,0.35),transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mb-8 rounded-3xl border border-white/20 bg-white/10 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-300">Student Management Platform</p>
          <h1 className="text-4xl font-semibold md:text-5xl">Confident operations for modern schools.</h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            Manage enrollments, grading workflows, and academic structures with role-aware controls and analytics.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="min-h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2 font-medium text-white"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="min-h-11 rounded-xl border border-white/30 bg-white/10 px-5 py-2 font-medium text-white"
            >
              Sign Up
            </Link>
            <Link href="/courses" className="min-h-11 rounded-xl border border-cyan-300/40 px-5 py-2 text-cyan-200">
              Courses
            </Link>
            <Link
              href="/academics"
              className="min-h-11 rounded-xl border border-violet-300/40 px-5 py-2 text-violet-200"
            >
              Academics
            </Link>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-slate-950/50 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Secure Session Auth</h2>
            <p className="mt-2 text-sm text-slate-300">
              HTTP-only cookie sessions with refresh flow and explicit role scoping across endpoints.
            </p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-slate-950/50 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Academic Structures</h2>
            <p className="mt-2 text-sm text-slate-300">
              Terms, sections, and assessments are now first-class entities for better academic planning.
            </p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-slate-950/50 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Actionable Workflow</h2>
            <p className="mt-2 text-sm text-slate-300">
              Move from roster setup to grades and analytics with connected role-aware workflows.
            </p>
          </article>
        </section>

        <p role="status" aria-live="polite" className="mt-6 rounded-xl bg-slate-950/80 p-3 text-sm text-slate-200">
          {user ? `${status} Welcome, ${user.email}.` : status}
        </p>
      </div>
    </main>
  );
}
