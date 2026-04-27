# Architecture Notes

## Why Modular Monolith
- Fast to build and reason about for solo development.
- Clear module boundaries (`auth`, `students`, `analytics`) keep the backend maintainable.
- Can be split into services later with minimal rewrite.

## Backend Modules
- `auth`: registration, login, JWT issuance.
- `students`: student profile CRUD and grade relationships.
- `analytics`: combines student data with AI predictions.
- `prisma`: shared DB access.

## Data Flow
1. Frontend authenticates user and stores JWT token in memory.
2. Frontend calls protected backend endpoints.
3. Backend fetches student data from PostgreSQL.
4. Backend sends summarized student metrics to FastAPI.
5. AI response is merged and returned to frontend.

## Security Baseline
- Password hashing with bcrypt.
- JWT auth guard on protected routes.
- Role checks (`ADMIN`, `TEACHER`, `STUDENT`) for endpoint authorization.
- Request validation via DTOs and global validation pipe.
