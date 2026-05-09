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
 
## Fixed Dependency Versions
 
Use the exact versions below when adding or updating dependencies. These are pinned in the repository's `package.json` files and should stay aligned with the lockfiles.
 
### Backend
 
| Package                  | Fixed Version |
| ------------------------ | ------------- |
| @nestjs/axios            | 4.0.1         |
| @nestjs/common           | 11.1.17       |
| @nestjs/config           | 4.0.4         |
| @nestjs/core             | 11.1.18       |
| @nestjs/jwt              | 11.0.2        |
| @nestjs/mapped-types     | 2.1.1         |
| @nestjs/mongoose         | 11.0.4        |
| @nestjs/passport         | 11.0.5        |
| @nestjs/platform-express | 11.1.18       |
| @nestjs/swagger          | 11.3.2        |
| axios                    | 1.15.0        |
| bcrypt                   | 6.0.0         |
| class-transformer        | 0.5.1         |
| class-validator          | 0.15.1        |
| cors                     | 2.8.6         |
| docker                   | 1.0.0         |
| helmet                   | 8.1.0         |
| mongoose                 | 9.4.1         |
| passport                 | 0.7.0         |
| passport-jwt             | 4.0.1         |
| reflect-metadata         | 0.2.2         |
| rxjs                     | 7.8.2         |
| swagger-ui-express       | 5.0.1         |
| @eslint/eslintrc         | 3.3.5         |
| @eslint/js               | 9.39.4        |
| @nestjs/cli              | 11.0.18       |
| @nestjs/schematics       | 11.0.10       |
| @nestjs/testing          | 11.1.17       |
| @types/bcrypt            | 6.0.0         |
| @types/express           | 5.0.6         |
| @types/jest              | 30.0.0        |
| @types/multer            | 2.1.0         |
| @types/node              | 22.19.15      |
| @types/passport-jwt      | 4.0.1         |
| @types/supertest         | 6.0.3         |
| eslint                   | 9.39.4        |
| eslint-config-prettier   | 10.1.8        |
| eslint-plugin-prettier   | 5.5.5         |
| globals                  | 16.5.0        |
| jest                     | 30.3.0        |
| prettier                 | 3.8.1         |
| source-map-support       | 0.5.21        |
| supertest                | 7.2.2         |
| ts-jest                  | 29.4.6        |
| ts-loader                | 9.5.4         |
| ts-node                  | 10.9.2        |
| tsconfig-paths           | 4.2.0         |
| typescript               | 5.9.3         |
| typescript-eslint        | 8.58.0        |
 
### Frontend
 
| Package                     | Fixed Version |
| --------------------------- | ------------- |
| @hookform/resolvers         | 5.2.2         |
| @nestjs/axios               | 4.0.1         |
| @nestjs/mapped-types        | 2.1.1         |
| axios                       | 1.15.0        |
| jwt-decode                  | 4.0.0         |
| prop-types                  | 15.8.1        |
| react                       | 19.2.4        |
| react-dom                   | 19.2.4        |
| react-hook-form             | 7.72.1        |
| react-hot-toast             | 2.6.0         |
| react-router-dom            | 7.14.0        |
| zod                         | 3.25.76       |
| @eslint/js                  | 9.39.4        |
| @testing-library/jest-dom   | 6.9.1         |
| @testing-library/react      | 16.3.2        |
| @types/react                | 19.2.14       |
| @types/react-dom            | 19.2.3        |
| @vitejs/plugin-react        | 6.0.1         |
| eslint                      | 9.39.4        |
| eslint-plugin-react-hooks   | 7.0.1         |
| eslint-plugin-react-refresh | 0.5.2         |
| globals                     | 17.4.0        |
| jsdom                       | 29.0.2        |
| vite                        | 8.0.7         |
| vitest                      | 4.1.5         |
 
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
 
---
 
# Issue and Task Management Policy
 
To ensure predictable development cycles, clear communication, and efficient workload distribution, this project strictly separates **Effort (Story Points)** from **Urgency (Priority)**.
 
All GitHub Issues and Pull Requests must be tagged with both a Story Point label and a Priority label before being assigned to a sprint.
 
---
 
## Part 1: Story Point Grading Policy
 
Story Points measure **Complexity, Effort, and Risk**. They do NOT measure time (hours/days). We use a 1, 2, 3, and 5 point scale.
 
### The Grading Scale
 
- **1 Point (Trivial):** Zero ambiguity. The changes are minimal, isolated, and require almost no critical thinking.
  - _Example:_ Fixing a typo in the documentation, changing a button color in the UI, or renaming a variable for better readability.
- **2 Points (Simple):** Routine development with a clear path to completion. Easy to test and involves minimal logic changes.
  - _Example:_ Adding a new optional column to a database table, updating a basic API response payload, or building a simple UI form with basic validation.
- **3 Points (Medium):** Standard daily work. It requires focus and testing, but the architecture and dependencies are well understood. This is the team's baseline.
  - _Example:_ Developing a standard CRUD API endpoint, creating a moderately complex UI component with state management, or integrating a simple, well-documented third-party API.
- **5 Points (Maximum Limit):** The absolute limit of what can be handled in a single task. Involves high complexity, heavy R&D, or significant systemic risk.
  - _Example:_ Completely overhauling the core authentication/authorization system, executing a major database migration, or integrating a massive, undocumented enterprise system.
### Core Grading Rules
 
1. **The "Too Big" Rule:** If a task holds more uncertainty or requires more effort than a 5-point task, it **cannot be added to the sprint**. It MUST be broken down into smaller tasks.
2. **No Time Equivalents:** Never translate points to hours. A 3-point task represents the same architectural complexity for both a junior and a senior developer.
3. **Anchor Task:** When grading, always compare the new task to a recently completed 3-point task to maintain consistent estimation.
---
 
## Part 2: Priority Mapping Policy
 
Priority labels dictate **WHEN** a task must be completed (Urgency and Business Value). Priority is completely independent of the Story Point. We strictly use three priority levels:
 
### Priority Levels
 
- **priority: high** — The system is failing, core functionality is blocked, there is a severe vulnerability, or a major feature is an absolute requirement for the current sprint.
  - **Action:** Highest urgency. Must be addressed immediately or prioritized at the very top of the sprint backlog.
- **priority: medium** — Standard feature development, standard bugs, and routine improvements. This makes up the vast majority (80%) of the daily workload.
  - **Action:** Picked up from the backlog sequentially as team capacity allows during the sprint.
- **priority: low** — "Nice-to-have" features, minor cosmetic UI issues, or technical debt refactoring that does not impact current operations.
  - **Action:** Addressed only when all high and medium priority tasks are completely resolved.
---
 
## Part 3: Synergy and Execution
 
When evaluating the backlog, developers and reviewers must look at both labels to understand the full context:
 
- `story-point: 1` + `priority: high` → _"This is a very simple fix, but it is blocking the system or users. Resolve it immediately."_
- `story-point: 3` + `priority: medium` → _"This is a standard, average-effort task. Pick it up during the normal flow of the sprint."_
- `story-point: 5` + `priority: low` → _"This is a massive, complex overhaul. Do not spend resources on it while more urgent tasks exist."_
---
 
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
 
If endpoints, flows, or contracts changed, update the related documentation as well:
 
- API specifications: `docs/api/api-specs/`
- System processes: `docs/system-processes.md`
---
 
## Pull Request Guidelines
 
Pull Requests are the most critical gateway in our development lifecycle. This process is not designed to create unnecessary bureaucracy, but to protect the integrity of the codebase, respect the time of reviewers, and ensure that every change is transparent and stable. Adhering to these standards is mandatory regardless of the size or complexity of the change.
 
### 1. One PR = One Purpose
 
A PR must address a single concern. Do not bundle unrelated changes. PRs that mix multiple purposes will be closed immediately without review.
 
### 2. PR Template
 
When you open a PR on GitHub, the description field is automatically pre-filled with the project's PR template defined in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). **Fill it out completely and honestly before requesting a review.**
 
The template contains the following sections:
 
- **Summary:** One or two sentences describing what the PR does and why. Must link the related issue if one exists.
- **Type of Change:** Categorizes the change (Feature, Bug Fix, Refactor, etc.) so reviewers know what to expect.
- **Scope of Change:** Lists the exact files, modules, and layers touched — controllers, services, repositories, schemas, OpenAPI specs, frontend components.
- **API Contract Alignment:** Documents the affected endpoint, its `operationId`, and the OpenAPI spec file. Confirms the response shape, status codes, and JWT extraction rules match the spec.
- **Clean Architecture Checklist:** Verifies layer boundaries — auth guard behavior, input validation, use-case orchestration, error mapping, and repository-level constraints.
- **Test Evidence:** Explains what was tested (unit, controller, integration/E2E) and provides test file locations and a summary of the test run output.
- **Status Code Matrix Verification:** Confirms every documented HTTP status code is reachable through the implementation and has been tested.
- **Observability Checklist:** Confirms that key events are logged with a correlation ID, no sensitive data appears in logs, and audit log entries are written where required.
- **Migration / Breaking Change Assessment:** States whether a database migration is required and whether the API contract changes in a breaking way.
- **Out of Scope Confirmation:** Explicitly lists what was intentionally not implemented in this PR.
- **Dependencies:** Lists any PRs or issues this PR is blocked by or must be merged before.
- **Reviewer Notes:** Highlights anything specific reviewers should focus on.
- **Definition of Done Sign-off:** A final self-check confirming the implementation is complete, tested, documented, and clean.
### 3. Documentation Updates
 
If endpoints, flows, or contracts changed, update the related docs in the same PR:
 
- API specifications: `docs/api/api-specs/`
- System processes: `docs/system-processes.md`
---
 
## Code Review Policy
 
To maintain code quality, ensure fast delivery, and respect the time of all contributors, all contributors and reviewers must strictly adhere to the following rules.
 
### 1. Strict Compliance & Immediate Rejection
 
- **Zero-Tolerance for Ignored Templates:** PRs that ignore the template, lack testing/verification evidence, or mix unrelated changes will be **closed immediately without review**, even if the code is correct.
- **How to Recover:** Update the PR description to meet the exact standards, then click "Reopen". Reviewers will not chase authors to format their PRs or provide missing evidence.
### 2. Reviewer Requirements (Risk-Based Approach)
 
- **High-Impact PRs (2 Approvals Required):** `Feature`, `Bug Fix`, and `Refactor` PRs. Any PR that modifies backend business logic, database schemas, or authentication mechanisms.
- **Low-Impact PRs (1 Approval Required):** `Chore` (dependency updates, deleting unused files), `Documentation` PRs, and minor UI styling adjustments.
### 3. Reviewer Assignment Process
 
1. **Primary Reviewer:** The Team Leader is assigned as the first reviewer for every PR. However, if the Team Leader is unavailable, another team member may conduct the review.
2. **Secondary Reviewer:** For PRs requiring two approvals, the second reviewer is assigned via **Round Robin** rotation among the remaining developers.
### 4. Service Level Agreement (SLA)
 
- **Initial Review:** Reviewers must provide their first response (approve, request changes, or comment) within **48 hours** of being assigned.
- **Draft PRs:** Do not assign reviewers to Draft PRs. Only request a review when the PR is fully ready, tested, and passes all CI/CD checks.
### 5. Reviewer Responsibilities
 
When reviewing, check for:
 
- **Completeness:** Does the PR match the required template perfectly?
- **Architecture & Security:** Does the code follow project patterns? Are there any security risks or hardcoded secrets?
- **Readability:** Is the code self-explanatory? Are variables named logically?
- **Scope Limit:** Did the author include unrelated changes? If yes, reject immediately per Section 1.
### 6. Author Responsibilities During Review
 
- Do not take feedback personally; reviews are about the code, not the developer.
- If changes are requested, implement them in the existing branch. Do not open a new PR.
- Once changes are applied, explicitly re-request a review from the assigned reviewers.
- **Never merge your own PR.** The final reviewer who approves the PR is responsible for merging it.
### 7. Resolving Disagreements & Team Leader Authority
 
If conflicting feedback arises between reviewers, or if the author and a reviewer cannot reach a consensus, the Team Leader will:
 
1. Conduct a final, decisive review.
2. Explicitly document the final decision and the technical reasoning behind it.
3. Close the discussion to prevent endless debates.
---
 
## Issues and Communication
 
- For new features or large refactors, open an issue first to align on scope.
- If you are working on an existing issue, include the issue number in the PR description.
---
 
## Backend Issue Guidelines
 
All backend issues must follow a consistent structure so that scope, contract, and acceptance criteria are unambiguous before development begins. Opening an issue without this structure will result in it being returned to the author for revision.
 
### Issue Template Structure
 
When opening a backend issue on GitHub, select the **Backend Issue** template — it will be pre-filled automatically from [`.github/ISSUE_TEMPLATE/backend.md`](.github/ISSUE_TEMPLATE/backend-issue-template.md). Your responsibility is to replace every placeholder with concrete, task-specific values before the issue is assigned to a sprint.
 
The template contains the following sections:
 
- **Description:** States the related process and a user story in the standard "As a / I want / so that" format.
- **Scope:** Bullet list of the main capability, validation/business constraints, authorization requirement, and any side effects such as events or notifications.
- **API Contract / Business Rules:** Defines the endpoint method and path, the OpenAPI `operationId`, the required JWT role, and any explicit ownership check rule.
- **Source of Truth:** Links the single active OpenAPI spec file, the relevant process document, and any related issues.
- **Request Model (DTO):** Documents every query parameter, path parameter, and body field with its type, required/optional status, constraints, and description.
- **Response Model (DTO):** Documents the success payload structure and the shared error DTO shape.
- **Preconditions:** Lists what must be true before the use case executes — valid JWT, required role, reachable dependencies, and any required domain pre-state.
- **Postconditions:** Describes the resulting database state changes, triggered side effects, and transaction or consistency expectations.
- **Status Code Matrix:** Maps every possible HTTP status code to its exact trigger condition for this endpoint.
- **Acceptance Criteria (Clean Architecture):** Checklist split across three layers — Infrastructure/API, Application/Use Case, and Domain/Repository — verifying guard behavior, DTO compliance, validation, error mapping, and DB constraint handling.
- **Minimum Test Matrix:** Checklist covering unit tests (happy path, business-rule failures, repository failure mapping), controller tests (401, 403, success shape, 400 validation), and integration/E2E tests (happy flow, conflict/locked/not-found flow, OpenAPI contract parity).
- **Observability / Security Requirements:** Defines logging expectations — correlation IDs on key events, no secrets or sensitive data in logs, actionable internal context with generic client-facing messages.
- **Non-Functional Requirements:** Performance targets, pagination limits, idempotency policy, and backward compatibility notes.
- **Out of Scope:** Explicitly lists everything that is intentionally not included in this ticket.
- **Definition of Done:** Final checklist — implementation merged with passing tests, OpenAPI spec updated, QA scenarios executed, and PR description includes test evidence and status-matrix coverage.
---
 
## Bug Report Guidelines
 
All bug reports must be structured and actionable before they are triaged. Reports that lack reproduction steps, environment details, or expected behavior will be returned to the author for revision.
 
### Bug Report Template Structure
 
When opening a bug report on GitHub, select the **Bug Report** template — it will be pre-filled automatically from [`.github/ISSUE_TEMPLATE/bug_report.md`](.github/ISSUE_TEMPLATE/bug_report.md). Fill out every section with concrete, specific details before submitting.
 
The template contains the following sections:
 
- **Bug Description:** A clear and concise explanation of what the bug is.
- **Steps to Reproduce:** A numbered sequence of exact actions that reliably trigger the bug, ending with the observed error or failure.
- **Expected Behavior:** A description of what should have happened instead.
- **Screenshots / Logs:** Any screenshots or terminal/console error output that helps illustrate the problem.
- **Environment:** The context in which the bug occurred — the reporter's role (Student, Advisor, Coordinator), browser (Chrome, Safari, Firefox), and environment (Localhost, Staging, Production).
---
 
## Generic Task / Chore Guidelines
 
Generic tasks cover infrastructure work, environment setup, refactoring, and any standalone chore that does not fit the Backend Issue or Bug Report templates. These issues must still be well-defined before being assigned to a sprint.
 
### Generic Task Template Structure
 
When opening a task on GitHub, select the **Generic Task / Chore** template — it will be pre-filled automatically from [`.github/ISSUE_TEMPLATE/task.md`](.github/ISSUE_TEMPLATE/generic_task.md). Fill out every section before submitting.
 
The template contains the following sections:
 
- **Objective:** A clear statement of what needs to be accomplished and why it is necessary.
- **Context & Details:** Background information, links to relevant documentation, and any technical requirements needed to complete the task.
- **Definition of Done:** A checklist confirming the task is complete — requirements met, code formatted and passing lint, and relevant documentation (README, architecture docs) updated.
---
 
Thanks again for your contribution.
