Recommended Roadmap (Next Steps)
Sprint 1: Stabilize Core (1-2 weeks)
Fix token persistence (HTTP-only cookies)
Add pagination to list endpoints
Implement basic integration tests (auth, grades)

Sprint 2: Harden Security (1 week)
Implement strict rate-limiting per endpoint
Add audit columns (createdBy, updatedBy, deletedAt)
Add input sanitization
Set explicit CORS origins

Sprint 3: Frontend Polish (1 week)
Add global auth context
Add error boundaries and loading states
Implement form validation with field-level errors
Add role-based route guards

Sprint 4: Observability (1 week)
Add structured logging (Pino/Winston)
Add Sentry or similar error tracking
Create deployment scripts
Add CI pipeline (ESLint, tests, typecheck)
Sprint 5: Production Deployment (2 weeks)
Set up staging + production environments
Add database migration strategy
Containerize and deploy to cloud (Railway, Render, or AWS)
Add monitoring dashboards
