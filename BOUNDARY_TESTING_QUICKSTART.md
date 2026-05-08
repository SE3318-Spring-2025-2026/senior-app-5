# QA Boundary Testing - Quick Start Guide

## What Was Created

Two comprehensive test suites to validate submission deadline enforcement:

1. **Backend E2E Tests** (18 tests) — `backend/test/submissions.boundary.e2e-spec.ts`
2. **Frontend Component Tests** (14 tests) — `frontend/src/pages/PhaseSchedulingPage.boundary.test.jsx`

**Total Coverage:** 32 tests covering 100% of Issue #76 acceptance criteria

---

## Running the Tests

### Option 1: Backend Boundary Tests

```bash
# Navigate to backend
cd backend

# Ensure MongoDB is running (via docker-compose or local MongoDB)
docker-compose up -d

# Run the boundary tests
npm test -- submissions.boundary.e2e-spec

# Or run with coverage
npm run test:cov -- submissions.boundary.e2e-spec
```

**Duration:** ~2–3 seconds  
**Expected Result:** 18 passed ✅

**Environment Variable (if needed):**
```bash
export MONGODB_URI=mongodb://localhost:27017/senior-app
npm test -- submissions.boundary.e2e-spec
```

---

### Option 2: Frontend Boundary Tests

```bash
# Navigate to frontend
cd frontend

# Run the boundary tests
npx vitest run src/pages/PhaseSchedulingPage.boundary.test.jsx

# Or run with coverage
npx vitest run --coverage src/pages/PhaseSchedulingPage.boundary.test.jsx

# Or watch mode (for development)
npx vitest watch src/pages/PhaseSchedulingPage.boundary.test.jsx
```

**Duration:** ~1–2 seconds  
**Expected Result:** 14 passed ✅

---

### Option 3: Run Both Suites Together

```bash
# Backend tests
cd backend && npm test -- submissions.boundary.e2e-spec

# Frontend tests (in another terminal)
cd frontend && npx vitest run src/pages/PhaseSchedulingPage.boundary.test.jsx
```

---

## Test Categories Overview

### ✅ Positive Scenarios (6 tests)
Submissions **accepted** when made:
- 1 hour before deadline
- 1 minute before deadline
- 1 second before deadline

### 🔍 Exact Cutoff (4 tests)
The critical boundary:
- Submission **at exact deadline = REJECTED** (400)
- Submission **1ms before deadline = ACCEPTED** (201)

### ❌ Negative Scenarios (7 tests)
Submissions **rejected** when made:
- 1 second after deadline
- 1 hour after deadline
- 1 second before window start
- With invalid date formats

### 🌍 Timezone & Edge Cases (8 tests)
- UTC enforcement (client timezone doesn't matter)
- Leap year handling (Feb 29)
- DST spring forward (no early lockout)
- DST fall back (no extra hour granted)
- Large date ranges (years apart)

### 🔒 Security & Consistency (7 tests)
- Window validation on both create + upload
- Phase lock during API request
- Form state preservation during errors
- Clock skew handling

---

## Key Findings

### The Boundary Rule

```typescript
// In submissions.service.ts
if (now >= phase.submissionEnd) {
  throw new BadRequestException('Submission window has closed');
}
```

**Meaning:**
- ✅ Submissions before deadline (now < submissionEnd) → ACCEPTED
- ❌ Submissions at deadline or after (now >= submissionEnd) → REJECTED

This ensures students can submit right up to the deadline but not on or past it.

---

## Acceptance Criteria Status

| # | Requirement | Status | Test Count |
|---|-------------|--------|-----------|
| 1 | Positive (inside window) | ✅ Complete | 6 |
| 2 | Exact cutoff boundary | ✅ Complete | 4 |
| 3 | Negative (outside window) | ✅ Complete | 7 |
| 4 | Timezone/DST edge cases | ✅ Complete | 8 |
| — | Security & consistency | ✅ Complete | 7 |
| **Total** | | **✅ Complete** | **32** |

---

## Architecture Notes

### Backend
- Uses real PhasesService (not mocked) — tests actual service logic
- Real MongoDB persistence validation
- Jest fake timers for millisecond-precision time control
- Validates both submission creation AND document upload windows

### Frontend
- Tests UI validation logic and API contracts
- Mocks apiClient to avoid backend dependency
- Validates form state preservation and error handling
- Confirms ISO 8601 date format in API calls

### Timezone Safety
- All times use UTC (Date UTC strings with Z suffix)
- System doesn't depend on local timezone configuration
- DST transitions don't affect backend enforcement
- Client timezone differences don't impact deadline validation

---

## Troubleshooting

### Backend tests fail with "MONGODB_URI must be set"
**Solution:** Ensure MongoDB is running and MONGODB_URI is set
```bash
docker-compose up -d
export MONGODB_URI=mongodb://localhost:27017/senior-app
npm test -- submissions.boundary.e2e-spec
```

### Frontend tests fail with module not found errors
**Solution:** Ensure dependencies are installed
```bash
cd frontend
npm install
npx vitest run src/pages/PhaseSchedulingPage.boundary.test.jsx
```

### Tests are slow or flaky
**Solution:** Backend tests require database. Frontend tests should be instant.
- Backend: Consider increasing Jest timeout (`jest.setTimeout(10000)`)
- Frontend: Should complete in <2 seconds

---

## Documentation

Full documentation with:
- Detailed test descriptions
- Coverage maps
- AC (Acceptance Criteria) mapping
- Code examples
- Implementation notes

**See:** `docs/reviews/issue-76-qa-boundary-testing.md`

---

## Next Steps

1. ✅ **Run Backend Tests**
   ```bash
   cd backend && npm test -- submissions.boundary.e2e-spec
   ```

2. ✅ **Run Frontend Tests**
   ```bash
   cd frontend && npx vitest run src/pages/PhaseSchedulingPage.boundary.test.jsx
   ```

3. ✅ **Review Documentation**
   - Read `docs/reviews/issue-76-qa-boundary-testing.md`
   - Verify all acceptance criteria are covered

4. ✅ **Merge to Main**
   - All tests pass locally
   - CI/CD pipeline validates both test suites
   - Code review approves implementation

---

**Status:** ✅ Ready for QA Execution  
**Coverage:** 32 tests, 100% of Issue #76 ACs  
**Execution Time:** ~3–5 seconds total
