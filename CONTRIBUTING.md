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

| Package | Fixed Version |
| --- | --- |
| @nestjs/axios | 4.0.1 |
| @nestjs/common | 11.1.17 |
| @nestjs/config | 4.0.4 |
| @nestjs/core | 11.1.18 |
| @nestjs/jwt | 11.0.2 |
| @nestjs/mapped-types | 2.1.1 |
| @nestjs/mongoose | 11.0.4 |
| @nestjs/passport | 11.0.5 |
| @nestjs/platform-express | 11.1.18 |
| @nestjs/swagger | 11.3.2 |
| axios | 1.15.0 |
| bcrypt | 6.0.0 |
| class-transformer | 0.5.1 |
| class-validator | 0.15.1 |
| cors | 2.8.6 |
| docker | 1.0.0 |
| helmet | 8.1.0 |
| mongoose | 9.4.1 |
| passport | 0.7.0 |
| passport-jwt | 4.0.1 |
| reflect-metadata | 0.2.2 |
| rxjs | 7.8.2 |
| swagger-ui-express | 5.0.1 |
| @eslint/eslintrc | 3.3.5 |
| @eslint/js | 9.39.4 |
| @nestjs/cli | 11.0.18 |
| @nestjs/schematics | 11.0.10 |
| @nestjs/testing | 11.1.17 |
| @types/bcrypt | 6.0.0 |
| @types/express | 5.0.6 |
| @types/jest | 30.0.0 |
| @types/multer | 2.1.0 |
| @types/node | 22.19.15 |
| @types/passport-jwt | 4.0.1 |
| @types/supertest | 6.0.3 |
| eslint | 9.39.4 |
| eslint-config-prettier | 10.1.8 |
| eslint-plugin-prettier | 5.5.5 |
| globals | 16.5.0 |
| jest | 30.3.0 |
| prettier | 3.8.1 |
| source-map-support | 0.5.21 |
| supertest | 7.2.2 |
| ts-jest | 29.4.6 |
| ts-loader | 9.5.4 |
| ts-node | 10.9.2 |
| tsconfig-paths | 4.2.0 |
| typescript | 5.9.3 |
| typescript-eslint | 8.58.0 |

### Frontend

| Package | Fixed Version |
| --- | --- |
| @hookform/resolvers | 5.2.2 |
| @nestjs/axios | 4.0.1 |
| @nestjs/mapped-types | 2.1.1 |
| axios | 1.15.0 |
| jwt-decode | 4.0.0 |
| prop-types | 15.8.1 |
| react | 19.2.4 |
| react-dom | 19.2.4 |
| react-hook-form | 7.72.1 |
| react-hot-toast | 2.6.0 |
| react-router-dom | 7.14.0 |
| zod | 3.25.76 |
| @eslint/js | 9.39.4 |
| @testing-library/jest-dom | 6.9.1 |
| @testing-library/react | 16.3.2 |
| @types/react | 19.2.14 |
| @types/react-dom | 19.2.3 |
| @vitejs/plugin-react | 6.0.1 |
| eslint | 9.39.4 |
| eslint-plugin-react-hooks | 7.0.1 |
| eslint-plugin-react-refresh | 0.5.2 |
| globals | 17.4.0 |
| jsdom | 29.0.2 |
| vite | 8.0.7 |
| vitest | 4.1.5 |

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

# Issue and Task Management Policy

To ensure predictable development cycles, clear communication, and efficient workload distribution, this project strictly separates **Effort (Story Points)** from **Urgency (Priority)**. 

All GitHub Issues and Pull Requests must be tagged with both a Story Point label and a Priority label before being assigned to a sprint.

---

## Part 1: Story Point Grading Policy

Story Points measure **Complexity, Effort, and Risk**. They do NOT measure time (hours/days). We use a strict 1 to 5 scale.

### The 1-5 Grading Scale
- **1 Point (Trivial):** Zero ambiguity. The changes are minimal, isolated, and require almost no critical thinking. 
  - *Example:* Fixing a typo in the documentation, changing a button color in the UI, or renaming a variable for better readability.
- **2 Points (Simple):** Routine development with a clear path to completion. Easy to test and involves minimal logic changes.
  - *Example:* Adding a new optional column to a database table, updating a basic API response payload, or building a simple UI form with basic validation.
- **3 Points (Medium):** Standard daily work. It requires focus and testing, but the architecture and dependencies are well understood. This is the team's baseline.
  - *Example:* Developing a standard CRUD API endpoint, creating a moderately complex UI component with state management, or integrating a simple, well-documented third-party API.
- **4 Points (Complex):** Significant logic changes with multiple dependencies. High potential for edge cases and requires careful architectural planning.
  - *Example:* Implementing a multi-step checkout or payment processing flow, refactoring a tightly-coupled legacy module, or writing a service that requires complex database joins and caching logic.
- **5 Points (Maximum Limit):** The absolute limit of what can be handled in a single task. Involves high complexity, heavy R&D, or significant systemic risk. 
  - *Example:* Completely overhauling the core authentication/authorization system, executing a major database migration, or integrating a massive, undocumented enterprise system.

### Core Grading Rules
1. **The "Too Big" Rule:** If a task holds more uncertainty or requires more effort than a 5-point task, it **cannot be added to the sprint**. It MUST be broken down into smaller tasks.
2. **No Time Equivalents:** Never translate points to hours. A 3-point task represents the same architectural complexity for both a junior and a senior developer.
3. **Anchor Task:** When grading, always compare the new task to a recently completed 3-point task to maintain consistent estimation.

---

## Part 2: Priority Mapping Policy

Priority labels dictate **WHEN** a task must be completed (Urgency and Business Value). Priority is completely independent of the Story Point. We strictly use three priority levels:

### Priority Levels
- **priority: high:** - **Definition:** The system is failing, core functionality is blocked, there is a severe vulnerability, or a major feature is an absolute requirement for the current sprint.
  - **Action:** Highest urgency. Must be addressed immediately or prioritized at the very top of the sprint backlog.
- **priority: medium:** - **Definition:** Standard feature development, standard bugs, and routine improvements. This makes up the vast majority (80%) of the daily workload.
  - **Action:** Picked up from the backlog sequentially as team capacity allows during the sprint.
- **priority: low:** - **Definition:** "Nice-to-have" features, minor cosmetic UI issues, or technical debt refactoring that does not impact current operations.
  - **Action:** Addressed only when all high and medium priority tasks are completely resolved.

---

## Part 3: Synergy and Execution

When evaluating the backlog, developers and reviewers must look at both labels to understand the full context:

- A task labeled `story-point: 1` and `priority: high` means: *"This is a very simple fix, but it is blocking the system or users. Resolve it immediately."*
- A task labeled `story-point: 3` and `priority: medium` means: *"This is a standard, average-effort task. We will do it during the normal flow of the sprint."*
- A task labeled `story-point: 5` and `priority: low` means: *"This is a massive, complex system overhaul. We will not spend our resources on it while more urgent tasks exist."*








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

Pull Requests are the most critical gateway in our development lifecycle. This process is not designed to create unnecessary bureaucracy, but rather to protect the integrity of the codebase, respect the time of our reviewers, and ensure that every change is transparent and stable. Whether you are submitting a trivial 1-point chore or a complex 5-point architectural overhaul, adhering strictly to these standards is mandatory. A well-crafted PR is the hallmark of a professional developer.

If endpoints, flows, or contracts changed, update related docs as well:
API specifications: docs/api/api-specs/
System processes: docs/system-processes.md

2. Understanding the Pull Request Structure
When opening a PR, you are required to copy and fill out the template provided at the bottom of this section. Here is what each section of the template means:

1. PR Type: Categorizes your change (Feature, Bug Fix, Chore, etc.) so reviewers immediately know what to expect.

2. Purpose & Description: Defines the exact problem you are solving and provides a bulleted list of the technical changes you made. You must link an existing issue here if applicable.

3. Testing & Verification: The most critical part of your PR. You must explain how you tested the change and provide text-based proof (logs, JSON, terminal outputs). For chores/refactors, you must explain the technical debt being resolved and how you ensured system stability.

4. Strict Checklist: A mandatory self-validation step to ensure you haven't missed basic project rules (branching, linting, scope) before requesting a human review.

5. Executive Summary: A strict maximum 3-sentence "elevator pitch" for your PR. It quickly answers "What does this PR do?" and "Why is this change necessary right now?" for a reviewer who hasn't looked at the code yet.

3. Opening the PR
For new features or large refactors, open an issue first to align on scope.

Create your Pull Request against the main branch.

Copy the template block below, paste it into your PR description, and fill it out completely. 
Warning :Incomplete PRs will be closed automatically without review.
## 1. PR Type
- [ ] Feature: Adds new functionality or API endpoint.
- [ ] Bug Fix: Resolves an identified issue or bug.
- [ ] Chore: Routine tasks, deleting unused files, or dependency updates.
- [ ] Refactor: Code restructuring without changing behavior.
- [ ] Documentation: Updates to docs/ or README.

## 2. Purpose & Description
**Problem Statement:**
**Changes Made:**
**Related Issue:** # 
## 3. Testing & Verification
**What Was Tested:**
**Verification Steps (How to test):**
1. 
2. 

**Proof of Verification:**
- **API/Backend:** [Paste raw JSON response, curl output, or server logs here]
- **Frontend/UI:** [Paste browser console logs, DOM state changes, or test suite outputs here]
- **Unit/E2E Tests:** [Paste the terminal output of the passing tests here]
- **Chore/Refactor:** [Explain why this specific change was requested, what exact issues the previous structure was causing, and how you verified system stability]

## 4. Strict Checklist
- [ ] My PR targets the `main` branch.
- [ ] I have updated related API/System documentation if applicable.
- [ ] I have kept the changes strictly focused on the stated purpose.

## 5. Executive Summary
**Summary:**



## Code Review Policy

To maintain code quality, ensure fast delivery, and respect the time of all contributors, we follow a structured Code Review process. All contributors and reviewers must strictly adhere to the following rules.

## 1. Strict Compliance & Immediate Rejection
Code that works is not enough; the review process and formatting standards must also be respected.

- **Zero-Tolerance for Ignored Templates:** If a Pull Request ignores the Pull Request Standart decribed by the this file , lacks required testing/verification evidence, or mixes unrelated changes (violating the "One PR = One Purpose" rule), it will be **closed immediately without review**, even if the code solves the issue.
- **How to Recover:** The author can update the PR description to meet the exact standards and then click "Reopen". Reviewers will not chase authors to format their PRs correctly or ask for missing evidence.

## 2. Reviewer Requirements (Risk-Based Approach)
Not all Pull Requests carry the same risk. The number of required approvals depends on the PR Type:

- **High-Impact PRs (2 Approvals Required):** Includes `Feature`, `Bug Fix`, and `Refactor` PRs. Any PR that modifies backend business logic, database schemas, or authentication mechanisms requires two approvals.
- **Low-Impact PRs (1 Approval Required):** Includes `Chore` (dependency updates, deleting unused files) and `Documentation` PRs, or minor UI styling adjustments.

## 3. Reviewer Assignment Process
To ensure equal workload distribution and promote knowledge sharing across the team, reviewers are assigned as follows:

1. **Primary Reviewer:** The Team Leader is strictly assigned as the first reviewer for every Pull Request.
2. **Secondary Reviewer:** For PRs requiring two approvals, the second reviewer is assigned via a **Round Robin** rotation among the remaining developers. This ensures every team member contributes to code quality and learns different parts of the system.

## 4. Service Level Agreement (SLA)
- **Initial Review:** Reviewers must provide their first review (approve, request changes, or comment) within **48 hours** of the PR being assigned.
- **Draft PRs:** Do not assign reviewers to PRs marked as "Draft". Only request a review when the PR is fully ready, tested, and passes all CI/CD checks.

## 5. Reviewer Responsibilities
Reviewers are the gatekeepers of the codebase. When reviewing, check for:
- **Completeness:** Does the PR match the required PR Template perfectly?
- **Architecture & Security:** Does the code follow project patterns? Are there any security risks or hardcoded secrets?
- **Readability:** Is the code self-explanatory? Are variables named logically?
- **Scope Limit:** Did the author include unrelated changes? If yes, reject the PR immediately as per Section 1.

## 6. Author Responsibilities During Review
- Do not take feedback personally; reviews are about the code, not the developer.
- If a reviewer requests changes, implement them in the existing branch. Do not open a new PR.
- Once you have applied the requested changes, explicitly re-request a review from the reviewers.
- **Never merge your own PR.** The final reviewer who approves the PR is responsible for merging it.

## 7. Resolving Disagreements & Team Leader Authority
The Team Leader holds the ultimate decision-making authority in the review process.

If conflicting feedback arises between reviewers, or if the author and a reviewer cannot reach a consensus, the Team Leader will:
1. Conduct a final, decisive review.
2. Explicitly document the final decision and the technical reasoning behind it.
3. Close the Pull Request or resolve the discussion to prevent endless debates.











## Issues and Communication

- For new features or large refactors, open an issue first to align on scope.
- If you are working on an existing issue, include the issue number in the PR description.

Thanks again for your contribution.
