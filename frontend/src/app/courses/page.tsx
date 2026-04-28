"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import "./courses-skin.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuthResponse = {
  accessToken: string;
  user: { id: number; email: string; role: string };
};

type CourseRow = {
  id: number;
  name: string;
  teacher: { id: number; name: string; email: string };
  _count: { enrollments: number };
};

type EnrollmentRow = {
  id: number;
  studentId: number;
  courseId: number;
  course: { id: number; name: string; teacherId: number };
  student: { id: number; user: { name: string; email: string } };
};

export default function CoursesPage() {
  const [email, setEmail] = useState("teacher@sms.local");
  const [password, setPassword] = useState("Password123!");
  const [token, setToken] = useState("");
  const [role, setRole] = useState<string>("");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [status, setStatus] = useState("");

  const [newCourseName, setNewCourseName] = useState("");
  const [teacherIdForCourse, setTeacherIdForCourse] = useState("");
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollCourseId, setEnrollCourseId] = useState("");
  const [gradeEnrollmentId, setGradeEnrollmentId] = useState("");
  const [gradeScore, setGradeScore] = useState("85");
  const [gradeTerm, setGradeTerm] = useState("Term 1");

  const authHeader = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }),
    [token]
  );

  async function login(e: FormEvent) {
    e.preventDefault();
    setStatus("Signing in…");
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setStatus("Login failed.");
      return;
    }
    const data: AuthResponse = await res.json();
    setToken(data.accessToken);
    setRole(data.user.role);
    setStatus(`Signed in as ${data.user.role}`);
  }

  const loadCourses = useCallback(async () => {
    const res = await fetch(`${API_BASE}/courses`, { headers: authHeader() });
    if (!res.ok) {
      setStatus("Could not load courses.");
      return;
    }
    const data: CourseRow[] = await res.json();
    setCourses(data);
    setStatus(`Loaded ${data.length} course(s)`);
  }, [authHeader]);

  const loadEnrollments = useCallback(async () => {
    const res = await fetch(`${API_BASE}/enrollments`, { headers: authHeader() });
    if (!res.ok) {
      setStatus("Could not load enrollments.");
      return;
    }
    const data: EnrollmentRow[] = await res.json();
    setEnrollments(data);
    setStatus(`Loaded ${data.length} enrollment(s)`);
  }, [authHeader]);

  useEffect(() => {
    if (!token) return;
    void loadCourses();
    void loadEnrollments();
  }, [token, loadCourses, loadEnrollments]);

  async function createCourse(e: FormEvent) {
    e.preventDefault();
    const body: { name: string; teacherId?: number } = { name: newCourseName };
    if (role === "ADMIN" && teacherIdForCourse.trim()) {
      body.teacherId = Number(teacherIdForCourse);
    }
    const res = await fetch(`${API_BASE}/courses`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      setStatus("Create course failed (ADMIN needs teacherId; TEACHER uses own id).");
      return;
    }
    setNewCourseName("");
    setTeacherIdForCourse("");
    await loadCourses();
    setStatus("Course created.");
  }

  async function enroll(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/enrollments`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        studentId: Number(enrollStudentId),
        courseId: Number(enrollCourseId)
      })
    });
    if (!res.ok) {
      setStatus("Enrollment failed (duplicate or forbidden).");
      return;
    }
    await loadEnrollments();
    await loadCourses();
    setStatus("Student enrolled.");
  }

  async function addGrade(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/grades`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        enrollmentId: Number(gradeEnrollmentId),
        score: Number(gradeScore),
        term: gradeTerm
      })
    });
    if (!res.ok) {
      setStatus("Grade failed (check enrollment id and role).");
      return;
    }
    await loadEnrollments();
    setStatus("Grade recorded; student average updated.");
  }

  const canManageCourses = role === "ADMIN" || role === "TEACHER";
  const canEnrollOrGrade = canManageCourses;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-10 stagger-item">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Milestone · Course-linked grades
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-[#f4f1ea] md:text-5xl">
          Academic registry
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Courses, enrollments, and grade entry against the NestJS API. Sign in as{" "}
          <strong className="text-[var(--accent)]">teacher@sms.local</strong> or{" "}
          <strong className="text-[var(--accent)]">admin@sms.local</strong> (seed passwords).
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          ← Back to dashboard & analytics
        </Link>
      </header>

      <section className="elevated mb-8 rounded-2xl p-6 stagger-item">
        <h2 className="mb-4 text-xl text-[#f4f1ea]">Session</h2>
        <form className="flex flex-wrap gap-3" onSubmit={login}>
          <input
            className="min-w-[180px] rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[#e8ecf2] placeholder:text-[var(--muted)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
          />
          <input
            type="password"
            className="min-w-[140px] rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[#1a1206] transition hover:bg-[var(--accent-dim)]"
          >
            Sign in
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[#e8ecf2] disabled:opacity-40"
            disabled={!token}
            onClick={() => {
              void loadCourses();
              void loadEnrollments();
            }}
          >
            Refresh data
          </button>
        </form>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="elevated rounded-2xl p-6 stagger-item">
          <h2 className="mb-4 text-xl text-[#f4f1ea]">Courses</h2>
          <ul className="space-y-3">
            {courses.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] border-opacity-40 pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium text-[#f4f1ea]">{c.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {c.teacher.name} · {c._count.enrollments} enrolled
                  </p>
                </div>
                <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs text-[var(--accent)]">
                  #{c.id}
                </span>
              </li>
            ))}
            {courses.length === 0 && token && (
              <li className="text-sm text-[var(--muted)]">No courses (or empty list for this role).</li>
            )}
          </ul>

          {canManageCourses && (
            <form className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-6" onSubmit={createCourse}>
              <p className="text-sm font-medium text-[var(--accent)]">New course</p>
              <input
                required
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Course name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
              />
              {role === "ADMIN" && (
                <input
                  className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Teacher user id (required for admin)"
                  value={teacherIdForCourse}
                  onChange={(e) => setTeacherIdForCourse(e.target.value)}
                />
              )}
              <button
                type="submit"
                disabled={!token}
                className="w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#1a1206] disabled:opacity-40"
              >
                Create course
              </button>
            </form>
          )}
        </section>

        <section className="elevated rounded-2xl p-6 stagger-item">
          <h2 className="mb-4 text-xl text-[#f4f1ea]">Enrollments</h2>
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {enrollments.map((en) => (
              <li
                key={en.id}
                className="rounded-lg bg-[var(--surface)] px-3 py-2 text-[var(--muted)]"
              >
                <span className="font-mono text-[var(--accent)]">#{en.id}</span> · {en.course.name} ·{" "}
                {en.student.user.name}
              </li>
            ))}
            {enrollments.length === 0 && token && (
              <li className="text-[var(--muted)]">No enrollments visible.</li>
            )}
          </ul>

          {canEnrollOrGrade && (
            <form className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-6" onSubmit={enroll}>
              <p className="text-sm font-medium text-[var(--accent)]">Enroll student</p>
              <div className="flex flex-wrap gap-2">
                <input
                  required
                  className="w-28 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Student id"
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                />
                <select
                  required
                  className="min-w-[160px] flex-1 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[#e8ecf2]"
                  value={enrollCourseId}
                  onChange={(e) => setEnrollCourseId(e.target.value)}
                >
                  <option value="">Course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!token || courses.length === 0}
                className="w-fit rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#1a1206] disabled:opacity-40"
              >
                Enroll
              </button>
            </form>
          )}

          {canEnrollOrGrade && (
            <form className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-6" onSubmit={addGrade}>
              <p className="text-sm font-medium text-[var(--accent)]">Record grade</p>
              <select
                required
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={gradeEnrollmentId}
                onChange={(e) => setGradeEnrollmentId(e.target.value)}
              >
                <option value="">Enrollment…</option>
                {enrollments.map((en) => (
                  <option key={en.id} value={en.id}>
                    #{en.id} — {en.course.name} — {en.student.user.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  className="w-24 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                />
                <input
                  required
                  className="min-w-[120px] flex-1 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Term"
                  value={gradeTerm}
                  onChange={(e) => setGradeTerm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!token || enrollments.length === 0}
                className="w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#1a1206] disabled:opacity-40"
              >
                Save grade
              </button>
            </form>
          )}
        </section>
      </div>

      <p className="mt-10 rounded-xl border border-[var(--stroke)] bg-[var(--elevated)] px-4 py-3 text-sm text-[var(--muted)] stagger-item">
        {status || "Ready."}
      </p>
    </main>
  );
}
