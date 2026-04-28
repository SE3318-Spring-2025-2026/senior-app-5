## Summary
<!-- One or two sentences describing what this PR does and why. -->

Closes #[ISSUE_NUMBER]

---

## Type of Change
<!-- Check all that apply -->
- [ ] Feature (new endpoint or business logic)
- [ ] Bug fix
- [ ] Refactor (no behavior change)
- [ ] Configuration / infrastructure
- [ ] Background job / scheduled task
- [ ] Cross-cutting concern (middleware, guards, interceptors)
- [ ] OpenAPI spec update only
- [ ] Test-only change

---

## Scope of Change
<!-- List the files, modules, or layers touched. Be specific. -->

**Backend:**
- Controller(s): 
- Use case(s) / service(s): 
- Repository / DB layer: 
- Schema / migration: 
- OpenAPI spec file(s): 

**Frontend:** (if applicable)
- Component(s): 
- API client / DTO: 

**Infrastructure / Config:** (if applicable)
- 

---

## API Contract Alignment
<!-- Only fill in if this PR touches an endpoint -->

| Field | Value |
|---|---|
| Endpoint | `METHOD /path` |
| OperationId | |
| OpenAPI file | process4.yaml / process5.yaml |
| Spec updated in this PR | Yes / No / N/A |

- [ ] Response shape matches OpenAPI schema exactly
- [ ] All documented status codes are reachable via implementation
- [ ] No fields added to response that are not in the spec
- [ ] groupId / actorId extracted from JWT — NOT from request body (if applicable)

---

## Clean Architecture Checklist
<!-- Verify the layer boundaries defined in the issue acceptance criteria -->

**Infrastructure / API layer:**
- [ ] Auth guard behavior matches status code matrix in issue
- [ ] Controller returns contract-compliant response shape
- [ ] Input validation rules enforced (required fields, UUID format, enum values)

**Application / Use Case layer:**
- [ ] Use case orchestrates all validations before any DB write
- [ ] Sensitive fields never exposed in response DTOs
- [ ] Error mapping is deterministic — same input always produces same error code

**Domain / Repository layer:**
- [ ] Repository queries enforce correct domain filters (role scoping, ownership)
- [ ] Concurrency / uniqueness constraints protected at DB level, not only application level
- [ ] All DB failures caught and mapped to generic 500 — no raw DB errors reach the client

---

## Test Evidence
<!-- Fill in what was tested. Link to test files where possible. -->

**Unit tests:**
- [ ] Happy path covered
- [ ] All business-rule failure cases covered (see Section 11 of issue)
- [ ] Repository failure mapping tested

**Controller tests:**
- [ ] 401 unauthorized (missing/invalid JWT)
- [ ] 403 forbidden (wrong role or ownership mismatch)
- [ ] Success response shape and status code
- [ ] Validation error response (400)

**Integration / E2E tests:**
- [ ] Happy flow end-to-end
- [ ] Conflict / locked / not-found flow end-to-end
- [ ] Contract parity with OpenAPI verified

**Test file locations:**
- Unit: 
- Controller: 
- E2E: 

**Test run output:**
<!-- Paste summary or screenshot of test results — pass count, failure count -->

---

## Status Code Matrix Verification
<!-- Confirm every documented status code is reachable -->

| Code | Scenario | Tested |
|---|---|---|
| 2xx | Happy path | ☐ |
| 400 | Validation failure | ☐ |
| 401 | Missing/invalid JWT | ☐ |
| 403 | Role or ownership mismatch | ☐ |
| 404 | Resource not found | ☐ |
| 409 | Conflict | ☐ |
| 4xx | Other (specify) | ☐ |
| 500 | DB/internal failure | ☐ |

<!-- Remove rows not applicable to this PR -->

---

## Observability Checklist
<!-- From Section 12 of issue -->
- [ ] Key business event is logged with correlationId / requestId
- [ ] No secrets, tokens, hashes, or sensitive personal data in logs
- [ ] 500 responses include actionable internal context in server logs
- [ ] Audit log entry written (if this is a POST, PATCH, or DELETE operation — requires Issue 47 to be merged first)

---

## Migration / Breaking Change Assessment
- [ ] No database migration required
- [ ] Migration included and tested with rollback plan
- [ ] No breaking change to API contract
- [ ] Breaking change — existing consumers notified: [describe]
- [ ] Backward compatibility note: [describe or N/A]

---

## Out of Scope Confirmation
<!-- From Section 14 of issue — confirm these were NOT implemented -->
The following are explicitly out of scope for this PR and were not implemented:
- 

---

## Dependencies
<!-- List any PRs, issues, or external changes this PR depends on -->
- Blocked by: #
- Must be merged before: #
- Requires Issue 47 (Audit logging) to be merged first: Yes / No

---

## Reviewer Notes
<!-- Anything specific you want reviewers to focus on or be aware of -->
- 

---

## Definition of Done Sign-off
- [ ] Implementation merged with passing tests
- [ ] OpenAPI spec updated and aligned with implementation
- [ ] QA scenarios executed and evidenced above
- [ ] PR description includes test evidence and status-matrix coverage
- [ ] No TODO comments left in production code
- [ ] No console.log or debug statements left in code
