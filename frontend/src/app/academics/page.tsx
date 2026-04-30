"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SessionResponse = { user: { id: number; email: string; role: string } };
type Term = { id: number; name: string; startsOn: string; endsOn: string };
type Section = { id: number; name: string; className: string; termId: number; term: Term };
type Assessment = {
  id: number;
  title: string;
  category: string;
  weight: number;
  maxScore: number;
  dueAt: string | null;
  courseId: number;
  termId: number;
  course: { id: number; name: string };
  term: Term;
};
type Course = { id: number; name: string };

export default function AcademicsPage() {
  const [auth, setAuth] = useState<{ role: string; ready: boolean }>({ role: "", ready: false });
  const [status, setStatus] = useState("Ready.");
  const [terms, setTerms] = useState<Term[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [termForm, setTermForm] = useState({ name: "", startsOn: "", endsOn: "" });
  const [sectionForm, setSectionForm] = useState({ name: "", className: "", termId: "" });
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    category: "Exam",
    weight: "20",
    maxScore: "100",
    dueAt: "",
    courseId: "",
    termId: ""
  });

  const canMutate = useMemo(() => auth.role === "ADMIN" || auth.role === "TEACHER", [auth.role]);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });
    if (response.status !== 401 || path === "/auth/refresh") {
      return response;
    }
    const refresh = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!refresh.ok) {
      setAuth({ role: "", ready: true });
      return response;
    }
    return fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });
  }, []);

  const loadAll = useCallback(async () => {
    setStatus("Loading academic structures...");
    const [termsRes, sectionsRes, assessmentsRes, coursesRes] = await Promise.all([
      apiFetch("/terms"),
      apiFetch("/sections"),
      apiFetch("/assessments"),
      apiFetch("/courses")
    ]);
    if (!termsRes.ok || !sectionsRes.ok || !assessmentsRes.ok || !coursesRes.ok) {
      setStatus("Failed to load one or more academic resources.");
      return;
    }
    setTerms(await termsRes.json());
    setSections(await sectionsRes.json());
    setAssessments(await assessmentsRes.json());
    setCourses(await coursesRes.json());
    setStatus("Academic structures loaded.");
  }, [apiFetch]);

  useEffect(() => {
    void (async () => {
      const meRes = await apiFetch("/auth/me");
      if (!meRes.ok) {
        setAuth({ role: "", ready: true });
        setStatus("Please sign in to manage academic structures.");
        return;
      }
      const me: SessionResponse = await meRes.json();
      setAuth({ role: me.user.role, ready: true });
      await loadAll();
    })();
  }, [apiFetch, loadAll]);

  async function createTerm(e: FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(termForm)
    });
    if (!res.ok) {
      setStatus("Could not create term.");
      return;
    }
    setTermForm({ name: "", startsOn: "", endsOn: "" });
    await loadAll();
  }

  async function createSection(e: FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sectionForm.name,
        className: sectionForm.className,
        termId: Number(sectionForm.termId)
      })
    });
    if (!res.ok) {
      setStatus("Could not create section.");
      return;
    }
    setSectionForm({ name: "", className: "", termId: "" });
    await loadAll();
  }

  async function createAssessment(e: FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: assessmentForm.title,
        category: assessmentForm.category,
        weight: Number(assessmentForm.weight),
        maxScore: Number(assessmentForm.maxScore),
        dueAt: assessmentForm.dueAt || undefined,
        courseId: Number(assessmentForm.courseId),
        termId: Number(assessmentForm.termId)
      })
    });
    if (!res.ok) {
      setStatus("Could not create assessment.");
      return;
    }
    setAssessmentForm({
      title: "",
      category: "Exam",
      weight: "20",
      maxScore: "100",
      dueAt: "",
      courseId: "",
      termId: ""
    });
    await loadAll();
  }

  async function removeResource(path: string) {
    const res = await apiFetch(path, { method: "DELETE" });
    if (!res.ok) {
      setStatus(`Delete failed for ${path}.`);
      return;
    }
    await loadAll();
  }

  if (!auth.ready) {
    return <main className="mx-auto max-w-6xl p-6">Loading session...</main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Academic Structures</h1>
        <p className="mt-2 text-slate-300">Manage terms, sections, and assessments.</p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link href="/" className="text-blue-300 hover:underline">
            Home
          </Link>
          <Link href="/login" className="text-blue-300 hover:underline">
            Login
          </Link>
          <Link href="/signup" className="text-blue-300 hover:underline">
            Sign Up
          </Link>
          <Link href="/courses" className="text-blue-300 hover:underline">
            Courses
          </Link>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-xl bg-slate-900 p-4 text-slate-100">
          <h2 className="mb-3 text-lg font-semibold">Terms</h2>
          {canMutate && (
            <form className="mb-4 grid gap-2" onSubmit={createTerm}>
              <label className="text-sm">Name</label>
              <input
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={termForm.name}
                onChange={(e) => setTermForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <label className="text-sm">Starts On</label>
              <input
                required
                type="date"
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={termForm.startsOn}
                onChange={(e) => setTermForm((prev) => ({ ...prev, startsOn: e.target.value }))}
              />
              <label className="text-sm">Ends On</label>
              <input
                required
                type="date"
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={termForm.endsOn}
                onChange={(e) => setTermForm((prev) => ({ ...prev, endsOn: e.target.value }))}
              />
              <button className="min-h-11 rounded bg-blue-600 px-3 py-2">Create Term</button>
            </form>
          )}
          <ul className="space-y-2 text-sm">
            {terms.map((term) => (
              <li key={term.id} className="rounded border border-slate-700 p-2">
                <p className="font-medium">{term.name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(term.startsOn).toLocaleDateString()} - {new Date(term.endsOn).toLocaleDateString()}
                </p>
                {canMutate && (
                  <button
                    className="mt-2 rounded border border-red-400 px-2 py-1 text-xs text-red-300"
                    onClick={() => void removeResource(`/terms/${term.id}`)}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl bg-slate-900 p-4 text-slate-100">
          <h2 className="mb-3 text-lg font-semibold">Sections</h2>
          {canMutate && (
            <form className="mb-4 grid gap-2" onSubmit={createSection}>
              <label className="text-sm">Name</label>
              <input
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={sectionForm.name}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <label className="text-sm">Class Name</label>
              <input
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={sectionForm.className}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, className: e.target.value }))}
              />
              <label className="text-sm">Term</label>
              <select
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={sectionForm.termId}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, termId: e.target.value }))}
              >
                <option value="">Select term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
              <button className="min-h-11 rounded bg-blue-600 px-3 py-2">Create Section</button>
            </form>
          )}
          <ul className="space-y-2 text-sm">
            {sections.map((section) => (
              <li key={section.id} className="rounded border border-slate-700 p-2">
                <p className="font-medium">
                  {section.className} - {section.name}
                </p>
                <p className="text-xs text-slate-400">{section.term?.name ?? "No term"}</p>
                {canMutate && (
                  <button
                    className="mt-2 rounded border border-red-400 px-2 py-1 text-xs text-red-300"
                    onClick={() => void removeResource(`/sections/${section.id}`)}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl bg-slate-900 p-4 text-slate-100">
          <h2 className="mb-3 text-lg font-semibold">Assessments</h2>
          {canMutate && (
            <form className="mb-4 grid gap-2" onSubmit={createAssessment}>
              <label className="text-sm">Title</label>
              <input
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <label className="text-sm">Category</label>
              <input
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.category}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, category: e.target.value }))}
              />
              <label className="text-sm">Weight (%)</label>
              <input
                required
                type="number"
                min={0.01}
                max={100}
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.weight}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, weight: e.target.value }))}
              />
              <label className="text-sm">Max Score</label>
              <input
                required
                type="number"
                min={1}
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.maxScore}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, maxScore: e.target.value }))}
              />
              <label className="text-sm">Course</label>
              <select
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.courseId}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, courseId: e.target.value }))}
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              <label className="text-sm">Term</label>
              <select
                required
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.termId}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, termId: e.target.value }))}
              >
                <option value="">Select term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
              <label className="text-sm">Due Date (optional)</label>
              <input
                type="date"
                className="rounded border border-slate-600 bg-slate-800 p-2"
                value={assessmentForm.dueAt}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, dueAt: e.target.value }))}
              />
              <button className="min-h-11 rounded bg-blue-600 px-3 py-2">Create Assessment</button>
            </form>
          )}
          <ul className="space-y-2 text-sm">
            {assessments.map((assessment) => (
              <li key={assessment.id} className="rounded border border-slate-700 p-2">
                <p className="font-medium">{assessment.title}</p>
                <p className="text-xs text-slate-400">
                  {assessment.course?.name} · {assessment.term?.name} · {assessment.weight}%
                </p>
                {canMutate && (
                  <button
                    className="mt-2 rounded border border-red-400 px-2 py-1 text-xs text-red-300"
                    onClick={() => void removeResource(`/assessments/${assessment.id}`)}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <p role="status" aria-live="polite" className="mt-6 rounded bg-slate-950 p-3 text-sm text-slate-200">
        {status}
      </p>
    </main>
  );
}
