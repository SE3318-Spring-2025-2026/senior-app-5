# Issue 68 QA - Document Integrity Test

Date: 2026-04-28 (Updated: 2026-05-01)
Branch: qa/issue-68-document-integrity-test

## Scope

Validate document integrity behavior for submissions:
- service/controller compile and unit baseline
- uploadDocument integrity: positive uploads, window enforcement, filename encoding, error paths
- frontend document list/details behavior
- submissions completeness e2e behavior

## Commands Executed

### Backend unit tests

- `cd backend`
- `npm test -- --watch=false submissions.service.spec.ts submissions.controller.spec.ts`

Result: PASSED (26/26 passing after fixes in this PR)

Previously failing tests (now fixed):
1. `SubmissionsService > findOne > should return a submission if found` — used `'sub-1'` (not a valid ObjectId); updated to use `'507f1f77bcf86cd799439011'`.
2. `SubmissionsService > findById > should return submission when found` — same invalid ObjectId issue; updated.
3. `SubmissionsService > getCompleteness > should return completeness when all required fields are present` — same invalid ObjectId issue; updated.
4. `SubmissionsService > getCompleteness > should return incompleteness when required fields are missing` — same invalid ObjectId issue; updated.

New `uploadDocument (Document Integrity - Issue #68)` test suite added covering:
- Valid upload adds document metadata to submission and calls `save` once
- Latin1-encoded filename is decoded to UTF-8 before storage
- Invalid submission ID format → `BadRequestException`
- Submission not found → `NotFoundException`
- Phase not found → `NotFoundException`
- Phase with no submission window configured → `BadRequestException`
- Upload before window start → `BadRequestException` ("Submission window has not started yet")
- Upload after window end → `BadRequestException` ("Submission window has closed")

### Frontend tests (Documents + Submission Details)

Executed with project-local Vitest:
- `cd frontend`
- `node ./node_modules/vitest/vitest.mjs run src/pages/DocumentsPage.test.jsx --reporter=verbose`
- `node ./node_modules/vitest/vitest.mjs run src/pages/SubmissionDetailsPage.test.jsx --reporter=verbose`

Result: PASSED

- DocumentsPage: 6/6 passed
- SubmissionDetailsPage: 5/5 passed

Notes:
- `jsdom` is listed as a dev dependency in `frontend/package.json`. If the dependency is missing locally, run `npm install` inside the `frontend/` directory — no manual or global install is needed.

### Backend e2e (submissions)

- `cd backend`
- `npm run test:e2e -- submissions.e2e-spec.ts --runInBand`

Result: BLOCKED (requires running MongoDB)

Observed blocker:
- Nest Mongoose connection could not be established in test environment.
- `beforeAll` hook times out (30s), causing all cases to fail.
- Cleanup then throws because `connection` is undefined.

Error indicators:
- `Unable to connect to the database. Retrying (...)`
- Hook timeout in `test/submissions.e2e-spec.ts` at `beforeAll`.

To unblock e2e locally, start MongoDB before running the suite:
```bash
# Option A — Docker (recommended)
docker run -d -p 27017:27017 --name mongo-test mongo:7
# Option B — docker-compose (starts MongoDB + backend together)
docker-compose up -d
# Then set env and run e2e
cd backend
MONGODB_URI=mongodb://localhost:27017/senior-app-test npm run test:e2e -- submissions.e2e-spec.ts --runInBand
```

## Quick Assessment

- Frontend document integrity display behavior is stable in targeted tests.
- Backend unit test suite is now fully passing with document integrity coverage added.
- Backend e2e requires a running MongoDB instance before integrity scenarios can be validated end-to-end.

## Recommended Next Steps

1. Run submissions e2e with a live MongoDB instance to validate end-to-end storage and database linking.
2. Add controller-level tests covering 401/403/404 authorization edge cases for the upload endpoint.
