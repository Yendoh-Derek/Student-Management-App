"use client";

import { FormEvent, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

type AuthResponse = {
  accessToken: string;
  user: { id: number; email: string; role: string };
};

type Student = {
  id: number;
  classLevel: string;
  averageScore: number;
  attendanceRate: number;
  user: { id: number; name: string; email: string };
};

type Analytics = {
  studentId: number;
  studentName: string;
  classLevel: string;
  averageScore: number;
  attendanceRate: number;
  trend: number;
  aiRisk: { risk_level: string; confidence: number };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function Home() {
  const [email, setEmail] = useState("admin@sms.local");
  const [password, setPassword] = useState("Password123!");
  const [token, setToken] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [newStudent, setNewStudent] = useState({ userId: "", classLevel: "Year 1" });
  const [status, setStatus] = useState<string>("");

  const chartData = useMemo(() => {
    if (!analytics) return [];
    return [
      { metric: "Score", value: analytics.averageScore },
      { metric: "Attendance%", value: Math.round(analytics.attendanceRate * 100) }
    ];
  }, [analytics]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setStatus("Logging in...");
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      setStatus("Login failed. Check seed credentials and backend status.");
      return;
    }
    const data: AuthResponse = await response.json();
    setToken(data.accessToken);
    setStatus(`Logged in as ${data.user.role}`);
  }

  async function loadStudents() {
    const response = await fetch(`${API_BASE}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data: Student[] = await response.json();
    setStudents(data);
    setStatus(`Loaded ${data.length} student(s)`);
  }

  async function addStudent(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: Number(newStudent.userId),
        classLevel: newStudent.classLevel
      })
    });
    if (!response.ok) {
      setStatus("Failed to add student. Ensure userId exists and role is ADMIN/TEACHER.");
      return;
    }
    setStatus("Student created.");
    await loadStudents();
  }

  async function loadAnalytics(studentId: number) {
    const response = await fetch(`${API_BASE}/analytics/student/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data: Analytics = await response.json();
    setAnalytics(data);
    setStatus(`AI risk loaded for ${data.studentName}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 font-sans">
      <h1 className="mb-2 text-3xl font-bold">Student Management MVP</h1>
      <p className="mb-6 text-slate-600">Auth + Students + AI Analytics vertical slice.</p>

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Login</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={login}>
          <input className="rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="rounded border p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">
            Sign In
          </button>
          <button className="rounded border px-4 py-2" type="button" onClick={loadStudents} disabled={!token}>
            Load Students
          </button>
        </form>
      </section>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Students</h2>
          <form className="mb-4 flex gap-2" onSubmit={addStudent}>
            <input
              className="w-32 rounded border p-2"
              placeholder="userId"
              value={newStudent.userId}
              onChange={(e) => setNewStudent((s) => ({ ...s, userId: e.target.value }))}
            />
            <input
              className="rounded border p-2"
              placeholder="class level"
              value={newStudent.classLevel}
              onChange={(e) => setNewStudent((s) => ({ ...s, classLevel: e.target.value }))}
            />
            <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit" disabled={!token}>
              Add
            </button>
          </form>
          <ul className="space-y-2">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between rounded border p-2">
                <span>
                  {student.user.name} ({student.classLevel})
                </span>
                <button
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => loadAnalytics(student.id)}
                  disabled={!token}
                >
                  View Analytics
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Analytics</h2>
          {!analytics ? (
            <p className="text-slate-500">Select a student to view AI risk insights.</p>
          ) : (
            <>
              <p className="mb-2">{analytics.studentName}</p>
              <p className="mb-1">Risk: {analytics.aiRisk.risk_level}</p>
              <p className="mb-4">Confidence: {(analytics.aiRisk.confidence * 100).toFixed(1)}%</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </section>

      <p className="rounded bg-slate-900 p-3 text-sm text-white">{status || "Ready."}</p>
    </main>
  );
}
