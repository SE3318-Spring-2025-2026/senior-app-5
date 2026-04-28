# Issue 68 QA - Document Integrity Test

Date: 2026-04-28
Branch: qa/issue-68-document-integrity-test

## Scope

Validate document integrity behavior for submissions:
- service/controller compile and unit baseline
- frontend document list/details behavior
- submissions completeness e2e behavior

## Commands Executed

### Backend unit tests

- `cd backend`
- `npm test -- --watch=false submissions.service.spec.ts submissions.controller.spec.ts`

Result: FAILED (7 failing tests, 26 passing)

Key failures:
1. `findById` now validates Mongo ObjectId format, but tests use non-ObjectId values like `sub-1` and fail with `BadRequestException`.
2. `assertAuthorizedGroupMember` now performs `userModel.findById(...).exec()` lookup, but tests still assume no user lookup and do not mock this path.
3. `SubmissionsController.findOne` invalid id test currently resolves (mock returns submission) instead of throwing `BadRequestException`.

### Frontend tests (Documents + Submission Details)

Executed with project-local Vitest:
- `cd frontend`
- `node ./node_modules/vitest/vitest.mjs run src/pages/DocumentsPage.test.jsx --reporter=verbose`
- `node ./node_modules/vitest/vitest.mjs run src/pages/SubmissionDetailsPage.test.jsx --reporter=verbose`

Result: PASSED

- DocumentsPage: 6/6 passed
- SubmissionDetailsPage: 5/5 passed

Notes:
- Initial runs prompted for missing `jsdom`; local dependency state was updated.

### Backend e2e (submissions)

- `cd backend`
- `npm run test:e2e -- submissions.e2e-spec.ts --runInBand`

Result: FAILED

Observed blocker:
- Nest Mongoose connection could not be established in test environment.
- `beforeAll` hook times out (30s), causing all cases to fail.
- Cleanup then throws because `connection` is undefined.

Error indicators:
- `Unable to connect to the database. Retrying (...)`
- Hook timeout in `test/submissions.e2e-spec.ts` at `beforeAll`.

## Quick Assessment

- Frontend document integrity display behavior is stable in targeted tests.
- Backend unit test suite is out of sync with current service/controller behavior.
- Backend e2e requires a running MongoDB test dependency before integrity scenarios can be validated end-to-end.

## Recommended Next Steps

1. Update failing backend unit tests to match current ObjectId validation and membership-lookup behavior.
2. Start MongoDB for e2e (Docker or local `MONGODB_URI`) and rerun submissions e2e.
3. Add dedicated tests for document upload integrity edge cases:
   - malformed/encoded filenames
   - upload outside submission window
   - unauthorized cross-group access
   - document metadata persistence checks
