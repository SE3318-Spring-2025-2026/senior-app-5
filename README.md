# Senior Project Management System

An academic project management platform for senior projects. Students form teams, progress through defined phases, submit deliverables, and receive reviews from advisors and committees.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | NestJS 11, MongoDB 7, Mongoose, JWT + Passport, Swagger |
| Frontend | React 19, Vite, React Router, React Hook Form, Zod, Axios |
| Infrastructure | Docker, Docker Compose |

## Project Structure

```
senior-app-5/
├── backend/               # NestJS REST API
│   ├── src/
│   │   ├── auth/          # JWT auth, guards, role decorators
│   │   ├── users/         # User accounts (student, advisor, committee, admin)
│   │   ├── teams/         # Student project teams
│   │   ├── phases/        # Project phases defined by admin
│   │   ├── submissions/   # File submissions tied to phases
│   │   ├── advisors/      # Advisor assignment and management
│   │   ├── committees/    # Committee members and grading
│   │   ├── groups/        # Committee review groups
│   │   ├── invites/       # Team invitation system
│   │   ├── notifications/ # In-app notification system
│   │   ├── admin/         # Administrative operations
│   │   └── common/        # Shared guards, decorators, interceptors
│   ├── test/              # E2E tests
│   └── scripts/           # Utility scripts (seeding, Swagger generation)
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── pages/         # Route-level components
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers (auth state)
│   │   ├── config/        # Axios instance and API base URL
│   │   └── utils/         # Helper functions
│   └── public/
├── docs/                  # Project documentation
├── scripts/               # Repo-level scripts (git hooks, etc.)
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm
- Docker and Docker Compose (recommended for MongoDB)

### Environment Setup

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/senior-app
JWT_ACCESS_SECRET=your-secret-here
PORT=3001
```

### Running with Docker (recommended)

```bash
# Start MongoDB + backend
docker-compose up -d

# Install and start the frontend
cd frontend && npm install && npm run dev
```

### Running Locally

```bash
# Install root dependencies (sets up git hooks)
npm install

# Backend
cd backend
npm install
npm run start:dev     # Starts on port 3001 with hot reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev           # Starts Vite dev server
```

API docs are available at `http://localhost:3001/api/docs` once the backend is running.

## Development

### Backend

```bash
cd backend
npm run start:dev     # Hot reload
npm test              # Unit tests
npm run test:e2e      # E2E tests (requires MongoDB)
npm run test:cov      # Coverage report
npm run lint          # ESLint with auto-fix
npm run build         # Production build + Swagger generation
```

Run a specific test file:
```bash
npm test -- auth.service.spec
npm test -- --testPathPattern=submissions
```

### Frontend

```bash
cd frontend
npm run dev           # Dev server
npm test              # Vitest (jsdom)
npm run lint          # ESLint
npm run build         # Production build
```

Run a specific test file:
```bash
npx vitest run src/components/SubmissionChecklist.test.jsx
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

> **Note:** A pre-commit hook enforces that existing dependency versions cannot be changed. New packages may be added freely, but pinned versions must remain intact.

## License

MIT
