## Backend Issue Template

### 1. Description
Related Process: [Process ID and name]
User Story: As a [ROLE], I want [ACTION], so that [BUSINESS VALUE].

### 2. Scope
- [Main capability to implement]
- [Validation or business constraints]
- [Authorization requirement]
- [Any side effects such as event or notification]

### 3. API Contract / Business Rules
Endpoint: [METHOD] [PATH]
OperationId: [OpenAPI operationId]
Required Role (JWT): [ROLE]
Ownership Rule: [If needed, define resource ownership check explicitly]

### 4. Source of Truth
- OpenAPI file: [single active spec path]
- Process document: [process reference]
- Related issue(s): [links]

### 5. Request Model (DTO)
- Query parameters:
- [fieldName]: [type], [default], [constraints], [description]
- Path parameters:
- [fieldName]: [type], [constraints], [description]
- Body:
- [fieldName]: [type], [required or optional], [constraints], [description]

### 6. Response Model (DTO)
- Success [status]:
- [payload structure]
- [fieldName]: [type], [description]
- Error format:
- [shared error DTO shape]

### 7. Preconditions
- Caller has valid JWT.
- Caller has required role.
- Dependencies or data sources are reachable.
- Any domain pre-state required before execution.

### 8. Postconditions
- Database state changes (or explicitly read-only).
- Triggered side effects (events, notifications, jobs).
- Transaction or consistency expectation.

### 9. Status Code Matrix
- 200 or 201: [success condition]
- 204: [no-content success condition]
- 400: [validation or business input failure]
- 401: [missing or invalid token]
- 403: [valid token but insufficient permissions or ownership]
- 404: [resource missing]
- 409: [conflict rule]
- 423: [locked state rule if applicable]
- 500: [unexpected internal failure, sanitized message]

### 10. Acceptance Criteria (Clean Architecture)
Infrastructure / API:
- [ ] Auth guard behavior matches matrix.
- [ ] Controller returns contract-compliant response shape.
- [ ] Input validation rules are enforced.

Application / Use Case:
- [ ] Use case orchestrates validations and mapping.
- [ ] Sensitive fields are never exposed in DTOs.
- [ ] Error mapping is deterministic and consistent.

Domain / Repository:
- [ ] Repository queries enforce domain filters correctly.
- [ ] Concurrency or uniqueness constraints are protected against races.
- [ ] Database failures are mapped to generic internal errors.

### 11. Minimum Test Matrix
Unit tests:
- [ ] Service happy path.
- [ ] Service business-rule failure cases.
- [ ] Service repository failure mapping.

Controller tests:
- [ ] 401 unauthorized.
- [ ] 403 forbidden.
- [ ] Success response shape and status.
- [ ] Validation error response.

Integration or E2E tests:
- [ ] End-to-end happy flow.
- [ ] End-to-end conflict, locked, or not-found flow.
- [ ] Contract parity with OpenAPI.

### 12. Observability / Security Requirements
- Log key business events with correlation or request id.
- Do not log secrets, tokens, hashes, or sensitive personal data.
- Include actionable internal error context; keep client messages generic.

### 13. Non-Functional Requirements
- Performance target: [example: p95 under 300ms]
- Pagination limits: [min, max, default]
- Idempotency policy (if endpoint can be retried)
- Backward compatibility notes

### 14. Out of Scope
- [Explicitly list what is not included in this ticket]

### 15. Definition of Done
- [ ] Implementation merged with passing tests.
- [ ] OpenAPI spec updated and aligned.
- [ ] QA scenarios executed.
- [ ] PR description includes test evidence and status-matrix coverage.
