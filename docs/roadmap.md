# Roadmap

## Implemented in MVP
- Auth module with JWT and role-based protection.
- Students module with list/create/get.
- Analytics endpoint integrated with AI service.
- FastAPI light-ML student risk predictor.
- Next.js dashboard for login, student management, and analytics visualization.

## Implemented — milestone 1 (courses & enrollments)
- **Courses** module: list/create/detail with role-scoped visibility (admin all, teacher owns, student enrolled-only).
- **Enrollments** module: enroll student in course; list with optional filters (admin/teacher/student scopes).
- **Course-linked grades** via `Enrollment`; `Student.averageScore` recomputed when grades change.
- Prisma migration `courses_enrollments_grades`; seed includes `teacher@sms.local`, two courses, enrollments, and demo grades.
- Next.js **`/courses`** page for managing courses, enrollments, and grades (distinct UI per `frontend/CLAUDE.md` guidance).

## Next Milestones
1. Full **attendance** records and ingestion workflows (course-linked attendance is the natural extension).
2. Rich analytics dashboard pages **per role** (reuse aggregated enrollment/grade data).
3. CI already runs lint/build/test; extend with coverage or e2e if needed.
4. Deployment to Vercel + Render/Railway + managed PostgreSQL.

## Stretch Enhancements
- Multi-tenant school model.
- Real-time notifications via WebSockets.
- Report export (PDF).
- Model retraining workflow and experiment tracking.
