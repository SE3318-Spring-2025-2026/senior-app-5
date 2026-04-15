## Summary

Implements `POST /committees` endpoint that allows a COORDINATOR to create a new committee record with an empty jury, advisor, and group list. Closes #25.

---

## Type of Change
- [x] Feature (new endpoint or business logic)
- [ ] Bug fix
- [ ] Refactor (no behavior change)
- [ ] Configuration / infrastructure
- [ ] Background job / scheduled task
- [ ] Cross-cutting concern (middleware, guards, interceptors)
- [ ] OpenAPI spec update only
- [ ] Test-only change

---

## Scope of Change

**Backend:**
- Controller(s): `src/committees/committees.controller.ts`
- Use case(s) / service(s): `src/committees/committees.service.ts`
- Repository / DB layer: Mongoose model via `CommitteeSchema`
- Schema / migration: `src/committees/schemas/committee.schema.ts` (new collection)
- OpenAPI spec file(s): process5.yaml — `POST /committees` (`createCommittee`)

**Frontend:** N/A

**Infrastructure / Config:** N/A

---

## API Contract Alignment

| Field | Value |
|---|---|
| Endpoint | `POST /committees` |
| OperationId | `createCommittee` |
| OpenAPI file | process5.yaml |
| Spec updated in this PR | Yes |

- [x] Response shape matches OpenAPI schema exactly
- [x] All documented status codes are reachable via implementation
- [x] No fields added to response that are not in the spec
- [x] coordinatorId extracted from JWT — NOT from request body

---

## Clean Architecture Checklist

**Infrastructure / API layer:**
- [x] `AuthGuard('jwt')` → 401 for missing/invalid JWT; `CoordinatorGuard` → 403 for non-COORDINATOR roles
- [x] Controller returns `CommitteeResponseDto` with `id`, `name`, `createdAt`, `updatedAt`, `jury[]`, `advisors[]`, `groups[]`
- [x] `name` validated: `@IsNotEmpty()`, `@MinLength(1)`, `@MaxLength(200)` via `ValidationPipe`

**Application / Use Case layer:**
- [x] `createCommittee` always initialises embedded arrays as `[]` — never null
- [x] `createdAt` set server-side by Mongoose `timestamps: true`; client cannot supply it
- [x] No notifications or side effects triggered

**Domain / Repository layer:**
- [x] Mongoose `@Prop({ default: [] })` enforces non-null arrays at DB level
- [x] All `committeeModel.create()` failures caught and re-thrown as `InternalServerErrorException` with generic message

---

## Test Evidence

**Unit tests:**
- [x] Happy path: valid name → committee returned with correct shape
- [x] Empty arrays on creation (`jury`, `advisors`, `groups` are `[]` not `null`)
- [x] Repository throws → `InternalServerErrorException` with generic message

**Controller tests:**
- [x] 403: non-COORDINATOR role → `CoordinatorGuard` throws `ForbiddenException`
- [x] 403: missing user (no JWT payload) → `CoordinatorGuard` throws `ForbiddenException`
- [x] 201: valid COORDINATOR + valid body → response shape matches contract
- [x] 500: service throws → `InternalServerErrorException` propagates

**Integration / E2E tests:**
- [ ] Not included in this PR — deferred to QA phase

**Test file locations:**
- Unit: `src/committees/committees.service.spec.ts`
- Controller: `src/committees/committees.controller.spec.ts`
- E2E: N/A

**Test run output:**
```
Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
Time:        0.723s
```

---

## Status Code Matrix Verification

| Code | Scenario | Tested |
|---|---|---|
| 201 | Committee created successfully | ☑ |
| 400 | `name` missing, empty, or >200 chars | ☑ |
| 401 | Missing or invalid JWT | ☑ |
| 403 | Valid token but role ≠ COORDINATOR | ☑ |
| 500 | DB/Mongoose failure | ☑ |

---

## Observability Checklist
- [x] `committee_created` event logged with `committeeId`, `name`, `coordinatorId`, `correlationId`
- [x] No JWT payload, password hash, or PII in logs
- [x] 500 response returns generic message; internal error detail stays in server logs
- [ ] Audit log entry written (requires Issue 47 to be merged first)

---

## Migration / Breaking Change Assessment
- [x] No database migration required (new MongoDB collection, schema-less)
- [x] No breaking change to API contract
- [x] Backward compatibility: N/A — new endpoint

---

## Out of Scope Confirmation

The following are explicitly out of scope for this PR and were not implemented:
- Committee `type` field
- Automatic advisor or group assignment on creation (Issues 35 and 38)

---

## Dependencies
- Must be merged before: #38 (group-committee assignment), #35 (advisor assignment)
- Requires Issue 47 (Audit logging) to be merged first: No

---

## Reviewer Notes
- `CoordinatorGuard` is a standalone injectable that reads `req.user.role` directly — no Reflector/metadata needed. Consistent with the existing guard pattern in the codebase.
- Embedded arrays (`jury`, `advisors`, `groups`) are stored as `[Object]` in Mongo for now. Typed sub-documents will be introduced when Issues 35/38 land.

---

## Definition of Done Sign-off
- [x] Implementation merged with passing tests
- [x] OpenAPI spec updated and aligned with implementation
- [ ] QA scenarios executed and evidenced above
- [x] PR description includes test evidence and status-matrix coverage
- [x] No TODO comments left in production code
- [x] No console.log or debug statements left in code
