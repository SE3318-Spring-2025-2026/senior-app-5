# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Academic project management system for senior projects. Students form teams, work through defined phases, submit deliverables, and get reviewed by advisors and committees.

## Commands

### Backend (`cd backend`)

```bash
npm run start:dev      # Start with hot reload (port 3001)
npm test               # Run all unit tests
npm run test:e2e       # Run e2e tests (requires MongoDB)
npm run test:cov       # Run tests with coverage
npm run lint           # ESLint with auto-fix
npm run build          # Build + generate Swagger docs
```

Run a single test file:
```bash
npm test -- auth.service.spec
npm test -- --testPathPattern=submissions
```

### Frontend (`cd frontend`)

```bash
npm run dev            # Start Vite dev server
npm test               # Run Vitest tests (uses jsdom)
npm run lint           # ESLint check
npm run build          # Production build
```

Run a single test file:
```bash
npx vitest run src/components/SubmissionChecklist.test.jsx
```

### Infrastructure

```bash
docker-compose up -d   # Start MongoDB (port 27017) + backend (port 3001)
```

For local development without Docker, set `MONGODB_URI` in `backend/.env`.

## Architecture

**Backend**: NestJS 11, MongoDB 7 via Mongoose, JWT auth with Passport, Swagger auto-docs at `/api/docs`

**Frontend**: React 19 + Vite, React Router, React Hook Form + Zod for validation, Axios for API calls

### Backend Modules (`backend/src/`)

Each module follows the standard NestJS pattern: `module.ts`, `controller.ts`, `service.ts`, `*.spec.ts`, `dto/`, `schemas/`.

- **auth** — JWT login/register, guards (`JwtAuthGuard`), role decorators
- **users** — User accounts with roles: `student`, `advisor`, `committee`, `admin`
- **teams** — Student project teams
- **groups** — Committee review groups
- **advisors** — Advisor assignment and management
- **committees** — Committee members and grading
- **phases** — Project phases/milestones defined by admin
- **submissions** — File/document submissions tied to phases
- **invites** — Team invitation system
- **notifications** — In-app notification system
- **admin** — Administrative operations
- **common** — Shared decorators, guards, interceptors

### Frontend Structure (`frontend/src/`)

- **pages/** — Route-level components (one per page)
- **components/** — Reusable UI components
- **context/** — React context providers (auth state, etc.)
- **config/** — API base URL and Axios instance configuration
- **utils/** — Helper functions

### Auth Flow

JWT access tokens stored client-side. The `AuthContext` manages auth state. Protected routes check token via `JwtAuthGuard` on the backend. Role-based access uses custom decorators (`@Roles()`).

### Data Flow

React pages → Axios (`frontend/src/config/`) → NestJS controllers → services → Mongoose schemas → MongoDB

## Key Environment Variables (`backend/.env`)

```
MONGODB_URI=mongodb://localhost:27017/senior-app
JWT_ACCESS_SECRET=<secret>
PORT=3001
```
