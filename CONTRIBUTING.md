# Contributing Guide

Thank you for contributing to this repository.
This guide explains the standards to follow so changes can be reviewed quickly and merged safely.

## Scope

- Backend: NestJS (`backend/`)
- Frontend: `frontend/`
- Documentation: `docs/`

## Requirements

- Node.js 18+
- npm
- Docker (for MongoDB)

## Local Setup

1. Clone the repository and enter the project folder.
2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Start the MongoDB service:

```bash
cd ..
docker compose up -d
```

4. Run the backend in development mode:

```bash
cd backend
npm run start:dev
```

## Branch Strategy

- Main development branch: `main`
- Create a new branch for each task:
  - `feature/<short-description>`
  - `fix/<short-description>`
  - `docs/<short-description>`

Example:

```bash
git checkout -b feature/auth-refresh-token
```

## Code Standards

- Keep the existing project structure and naming style.
- Keep changes minimal in scope; avoid unrelated refactors.
- Do not change API behavior unless required.
- Add short, purpose-driven comments only when code is not self-explanatory.

## Commit Rules

Use concise commit messages that clearly describe intent.

Recommended format:

```text
<type>: <short-description>
```

Examples:

- `feat: add jwt refresh token endpoint`
- `fix: validate login payload`
- `docs: update process5 API spec`

## Before Opening a PR

Run the following commands for the area you changed.

For backend changes (`backend/`):

```bash
npm run lint
npm run test
```

If endpoints, flows, or contracts changed, update related docs as well:

- API specifications: `docs/api/api-specs/`
- System processes: `docs/system-processes.md`

## Pull Request Guidelines

When opening a PR, include:

- Purpose of the change
- Summary of what was changed
- Test evidence (command output or screenshots)
- Potential breaking risk and rollback plan (if any)

Try to keep PR scope small. Splitting large changes into multiple PRs speeds up review.

## Issues and Communication

- For new features or large refactors, open an issue first to align on scope.
- If you are working on an existing issue, include the issue number in the PR description.

Thanks again for your contribution.
