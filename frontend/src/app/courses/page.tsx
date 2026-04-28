"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import "./courses-skin.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SessionResponse = {
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string>("");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState({
    login: false,
    courses: false,
    enrollments: false,
    createCourse: false,
    enroll: false,
    grade: false
  });
  const [formError, setFormError] = useState({
    login: "",
    course: "",
    enroll: "",
    grade: ""
  });

  const [newCourseName, setNewCourseName] = useState("");
  const [teacherIdForCourse, setTeacherIdForCourse] = useState("");
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollCourseId, setEnrollCourseId] = useState("");
  const [gradeEnrollmentId, setGradeEnrollmentId] = useState("");
  const [gradeScore, setGradeScore] = useState("85");
  const [gradeTerm, setGradeTerm] = useState("Term 1");

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include"
    });
    if (response.status !== 401 || path === "/auth/refresh") {
      return response;
    }
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });
    if (!refreshResponse.ok) {
      setIsAuthenticated(false);
      setRole("");
      return response;
    }
    return fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include"
    });
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setFormError((prev) => ({ ...prev, login: "" }));
    setLoading((prev) => ({ ...prev, login: true }));
    setStatus("Signing in...");
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        setFormError((prev) => ({ ...prev, login: "Login failed. Check credentials and retry." }));
        setStatus("Login failed.");
        return;
      }
      const data: SessionResponse = await res.json();
      setIsAuthenticated(true);
      setRole(data.user.role);
      void loadCourses();
      void loadEnrollments();
      setStatus(`Signed in as ${data.user.role}`);
    } catch {
      setFormError((prev) => ({ ...prev, login: `Cannot reach API at ${API_BASE}.` }));
      setStatus(`Cannot reach API at ${API_BASE}.`);
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  }

  const loadCourses = useCallback(async () => {
    setLoading((prev) => ({ ...prev, courses: true }));
    try {
      const res = await apiFetch("/courses");
      if (!res.ok) {
        setStatus("Could not load courses.");
        return;
      }
      const data: CourseRow[] = await res.json();
      setCourses(data);
      setStatus(`Loaded ${data.length} course(s)`);
    } catch {
      setStatus(`Cannot reach API at ${API_BASE}.`);
    } finally {
      setLoading((prev) => ({ ...prev, courses: false }));
    }
  }, [apiFetch]);

  const loadEnrollments = useCallback(async () => {
    setLoading((prev) => ({ ...prev, enrollments: true }));
    try {
      const res = await apiFetch("/enrollments");
      if (!res.ok) {
        setStatus("Could not load enrollments.");
        return;
      }
      const data: EnrollmentRow[] = await res.json();
      setEnrollments(data);
      setStatus(`Loaded ${data.length} enrollment(s)`);
    } catch {
      setStatus(`Cannot reach API at ${API_BASE}.`);
    } finally {
      setLoading((prev) => ({ ...prev, enrollments: false }));
    }
  }, [apiFetch]);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/auth/me");
      if (!res.ok) return;
      const data: SessionResponse = await res.json();
      setIsAuthenticated(true);
      setRole(data.user.role);
      void loadCourses();
      void loadEnrollments();
    })();
  }, [apiFetch, loadCourses, loadEnrollments]);

  async function createCourse(e: FormEvent) {
    e.preventDefault();
    setFormError((prev) => ({ ...prev, course: "" }));
    const body: { name: string; teacherId?: number } = { name: newCourseName };
    if (role === "ADMIN" && teacherIdForCourse.trim()) {
      body.teacherId = Number(teacherIdForCourse);
    }
    setLoading((prev) => ({ ...prev, createCourse: true }));
    try {
      const res = await apiFetch("/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        setFormError((prev) => ({ ...prev, course: "Create course failed for current role/inputs." }));
        setStatus("Create course failed (ADMIN needs teacherId; TEACHER uses own id).");
        return;
      }
      setNewCourseName("");
      setTeacherIdForCourse("");
      await loadCourses();
      setStatus("Course created.");
    } catch {
      setFormError((prev) => ({ ...prev, course: `Cannot reach API at ${API_BASE}.` }));
      setStatus(`Cannot reach API at ${API_BASE}.`);
    } finally {
      setLoading((prev) => ({ ...prev, createCourse: false }));
    }
  }

  async function enroll(e: FormEvent) {
    e.preventDefault();
    setFormError((prev) => ({ ...prev, enroll: "" }));
    setLoading((prev) => ({ ...prev, enroll: true }));
    try {
      const res = await apiFetch("/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(enrollStudentId),
          courseId: Number(enrollCourseId)
        })
      });
      if (!res.ok) {
        setFormError((prev) => ({ ...prev, enroll: "Enrollment failed (duplicate, invalid, or forbidden)." }));
        setStatus("Enrollment failed (duplicate or forbidden).");
        return;
      }
      await loadEnrollments();
      await loadCourses();
      setEnrollStudentId("");
      setEnrollCourseId("");
      setStatus("Student enrolled.");
    } catch {
      setFormError((prev) => ({ ...prev, enroll: `Cannot reach API at ${API_BASE}.` }));
      setStatus(`Cannot reach API at ${API_BASE}.`);
    } finally {
      setLoading((prev) => ({ ...prev, enroll: false }));
    }
  }

  async function addGrade(e: FormEvent) {
    e.preventDefault();
    setFormError((prev) => ({ ...prev, grade: "" }));
    setLoading((prev) => ({ ...prev, grade: true }));
    try {
      const res = await apiFetch("/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: Number(gradeEnrollmentId),
          score: Number(gradeScore),
          term: gradeTerm
        })
      });
      if (!res.ok) {
        setFormError((prev) => ({ ...prev, grade: "Grade submission failed. Verify enrollment and score." }));
        setStatus("Grade failed (check enrollment id and role).");
        return;
      }
      await loadEnrollments();
      setGradeEnrollmentId("");
      setGradeScore("85");
      setGradeTerm("Term 1");
      setStatus("Grade recorded; student average updated.");
    } catch {
      setFormError((prev) => ({ ...prev, grade: `Cannot reach API at ${API_BASE}.` }));
      setStatus(`Cannot reach API at ${API_BASE}.`);
    } finally {
      setLoading((prev) => ({ ...prev, grade: false }));
    }
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
          ← Back to home
        </Link>
        <Link
          href="/login"
          className="ml-4 mt-6 inline-flex items-center gap-2 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="ml-4 mt-6 inline-flex items-center gap-2 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Sign Up
        </Link>
        <Link
          href="/academics"
          className="ml-4 mt-6 inline-flex items-center gap-2 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Manage terms, sections & assessments →
        </Link>
      </header>

      <section className="elevated mb-8 rounded-2xl p-6 stagger-item">
        <h2 className="mb-4 text-xl text-[#f4f1ea]">Session</h2>
        <form className="flex flex-wrap gap-3" onSubmit={login} aria-busy={loading.login}>
          <label className="sr-only" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="min-w-[180px] rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[#e8ecf2] placeholder:text-[var(--muted)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            autoComplete="email"
            required
          />
          <label className="sr-only" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="min-w-[140px] rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[#1a1206] transition hover:bg-[var(--accent-dim)] disabled:opacity-50"
            disabled={loading.login}
          >
            {loading.login ? "Signing in..." : "Sign in"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[#e8ecf2] disabled:opacity-40"
            disabled={!isAuthenticated || loading.courses || loading.enrollments}
            onClick={() => {
              void loadCourses();
              void loadEnrollments();
            }}
          >
            {loading.courses || loading.enrollments ? "Refreshing..." : "Refresh data"}
          </button>
        </form>
        {formError.login && <p className="mt-3 text-sm text-amber-300">{formError.login}</p>}
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
            {loading.courses && <li className="text-sm text-[var(--muted)]">Loading courses...</li>}
            {courses.length === 0 && isAuthenticated && !loading.courses && (
              <li className="text-sm text-[var(--muted)]">No courses (or empty list for this role).</li>
            )}
            {!isAuthenticated && <li className="text-sm text-[var(--muted)]">Sign in to view courses.</li>}
          </ul>

          {canManageCourses && (
            <form className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-6" onSubmit={createCourse}>
              <p className="text-sm font-medium text-[var(--accent)]">New course</p>
              <label className="sr-only" htmlFor="course-name">
                Course name
              </label>
              <input
                id="course-name"
                required
                className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Course name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
              />
              {role === "ADMIN" && (
                <>
                <label className="sr-only" htmlFor="course-teacher-id">
                  Teacher user id
                </label>
                <input
                  id="course-teacher-id"
                  className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Teacher user id (required for admin)"
                  value={teacherIdForCourse}
                  onChange={(e) => setTeacherIdForCourse(e.target.value)}
                />
                </>
              )}
              <button
                type="submit"
                disabled={!isAuthenticated || loading.createCourse}
                className="min-h-11 w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#1a1206] disabled:opacity-40"
              >
                {loading.createCourse ? "Creating..." : "Create course"}
              </button>
              {formError.course && <p className="text-sm text-amber-300">{formError.course}</p>}
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
            {loading.enrollments && <li className="text-[var(--muted)]">Loading enrollments...</li>}
            {enrollments.length === 0 && isAuthenticated && !loading.enrollments && (
              <li className="text-[var(--muted)]">No enrollments visible.</li>
            )}
            {!isAuthenticated && <li className="text-[var(--muted)]">Sign in to view enrollments.</li>}
          </ul>

          {canEnrollOrGrade && (
            <form className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-6" onSubmit={enroll}>
              <p className="text-sm font-medium text-[var(--accent)]">Enroll student</p>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="enroll-student-id">
                  Student id
                </label>
                <input
                  id="enroll-student-id"
                  required
                  className="w-28 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Student id"
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                />
                <label className="sr-only" htmlFor="enroll-course-id">
                  Course
                </label>
                <select
                  id="enroll-course-id"
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
                disabled={!isAuthenticated || courses.length === 0 || loading.enroll}
                className="min-h-11 w-fit rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#1a1206] disabled:opacity-40"
              >
                {loading.enroll ? "Enrolling..." : "Enroll"}
              </button>
              {formError.enroll && <p className="text-sm text-amber-300">{formError.enroll}</p>}
            </form>
          )}

          {canEnrollOrGrade && (
            <form className="mt-6 grid gap-3 border-t border-[var(--stroke)] pt-6" onSubmit={addGrade}>
              <p className="text-sm font-medium text-[var(--accent)]">Record grade</p>
              <label className="sr-only" htmlFor="grade-enrollment-id">
                Enrollment
              </label>
              <select
                id="grade-enrollment-id"
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
                <label className="sr-only" htmlFor="grade-score">
                  Score
                </label>
                <input
                  id="grade-score"
                  required
                  type="number"
                  min={0}
                  max={100}
                  className="w-24 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                />
                <label className="sr-only" htmlFor="grade-term">
                  Term
                </label>
                <input
                  id="grade-term"
                  required
                  className="min-w-[120px] flex-1 rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="Term"
                  value={gradeTerm}
                  onChange={(e) => setGradeTerm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!isAuthenticated || enrollments.length === 0 || loading.grade}
                className="min-h-11 w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#1a1206] disabled:opacity-40"
              >
                {loading.grade ? "Saving..." : "Save grade"}
              </button>
              {formError.grade && <p className="text-sm text-amber-300">{formError.grade}</p>}
            </form>
          )}
        </section>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-10 rounded-xl border border-[var(--stroke)] bg-[var(--elevated)] px-4 py-3 text-sm text-[var(--muted)] stagger-item"
      >
        {status || "Ready."}
      </p>
    </main>
  );
}
