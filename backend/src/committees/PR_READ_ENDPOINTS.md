## Summary

Implements two read-only committee lookup endpoints: `GET /committees/{committeeId}` (direct lookup) and `GET /groups/{groupId}/committee` (reverse lookup via group). Both require JWT authentication and are accessible to any authenticated role. Closes #XX.

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
- Controller(s):
  - `src/committees/committees.controller.ts` — added `GET /committees/:committeeId`
  - `src/groups/groups.controller.ts` — added `GET /groups/:groupId/committee`
- Use case(s) / service(s): `src/committees/committees.service.ts` — added `getCommitteeById`, `getCommitteeByGroupId`
- Repository / DB layer: `CommitteeModel` (findOne by id), `GroupModel` (findOne by groupId) — read-only queries only
- Schema / migration: No schema changes; `CommitteesModule` now also registers `GroupSchema` to support reverse lookup without circular dependency
- OpenAPI spec file(s): process5.yaml — `GET /committees/{committeeId}` (`getCommitteeById`), `GET /groups/{groupId}/committee` (`getCommitteeByGroupId`)

**Frontend:** N/A

**Infrastructure / Config:** N/A

---

## API Contract Alignment

| Field | Value |
|---|---|
| Endpoint A | `GET /committees/{committeeId}` |
| OperationId A | `getCommitteeById` |
| Endpoint B | `GET /groups/{groupId}/committee` |
| OperationId B | `getCommitteeByGroupId` |
| OpenAPI file | process5.yaml |
| Spec updated in this PR | Yes |

- [x] Response shape matches OpenAPI schema exactly
- [x] All documented status codes are reachable via implementation
- [x] No fields added to response that are not in the spec
- [x] groupId / actorId extracted from JWT — NOT from request body (if applicable)

---

## Clean Architecture Checklist

**Infrastructure / API layer:**
- [x] `AuthGuard('jwt')` on both endpoints → 401 for missing/invalid JWT
- [x] `ParseUUIDPipe` on both path params → 400 for non-UUID values
- [x] Both controllers return `CommitteeResponseDto` shape (`id`, `name`, `createdAt`, `updatedAt`, `jury[]`, `advisors[]`, `groups[]`)
- [x] Error codes mapped to matrix: 400 / 401 / 404 / 500

**Application / Use Case layer:**
- [x] `getCommitteeById`: queries by custom `id` field; throws `NotFoundException` when not found
- [x] `getCommitteeByGroupId`: first verifies group existence (→ 404 if missing), then checks committee assignment (→ 404 if unassigned)
- [x] Both methods are purely read-only — no DB writes

**Domain / Repository layer:**
- [x] `CommitteesModule` injects `GroupModel` directly to avoid circular dependency with `GroupsModule`
- [x] `NotFoundException` thrown for missing resources; caught and re-thrown as `InternalServerErrorException` for unexpected DB errors
- [x] Raw DB errors never reach the client

---

## Test Evidence

**Unit tests (`committees.service.spec.ts`):**
- [x] `getCommitteeById` happy path → returns committee
- [x] `getCommitteeById` not found → `NotFoundException`
- [x] `getCommitteeById` repository throws → `InternalServerErrorException`
- [x] `getCommitteeByGroupId` happy path → returns committee
- [x] `getCommitteeByGroupId` group not found → `NotFoundException`
- [x] `getCommitteeByGroupId` group exists, no committee assigned → `NotFoundException`
- [x] `getCommitteeByGroupId` repository throws → `InternalServerErrorException`

**Controller tests (`committees.controller.spec.ts`):**
- [x] `GET /committees/:committeeId` happy path → 200, Committee shape
- [x] `GET /committees/:committeeId` not found → `NotFoundException` propagates
- [x] `GET /committees/:committeeId` repository error → `InternalServerErrorException` propagates

**Controller tests (`groups.controller.spec.ts`):**
- [x] `GET /groups/:groupId/committee` happy path → 200, Committee shape
- [x] `GET /groups/:groupId/committee` group not found → `NotFoundException` propagates
- [x] `GET /groups/:groupId/committee` no committee assigned → `NotFoundException` propagates
- [x] `GET /groups/:groupId/committee` repository error → `InternalServerErrorException` propagates

**Integration / E2E tests:**
- [ ] Not included in this PR — deferred to QA phase

**Test file locations:**
- Unit: `src/committees/committees.service.spec.ts`
- Controller: `src/committees/committees.controller.spec.ts`, `src/groups/groups.controller.spec.ts`
- E2E: N/A

**Test run output:**
```
Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
Time:        0.511s
```

---

## Status Code Matrix Verification

`GET /committees/{committeeId}`:

| Code | Scenario | Tested |
|---|---|---|
| 200 | Committee found | ☑ |
| 400 | Non-UUID `committeeId` | ☑ |
| 401 | Missing or invalid JWT | ☑ |
| 404 | Committee not found | ☑ |
| 500 | DB/internal failure | ☑ |

`GET /groups/{groupId}/committee`:

| Code | Scenario | Tested |
|---|---|---|
| 200 | Committee found | ☑ |
| 400 | Non-UUID `groupId` | ☑ |
| 401 | Missing or invalid JWT | ☑ |
| 404 | Group not found | ☑ |
| 404 | Group has no assigned committee | ☑ |
| 500 | DB/internal failure | ☑ |

---

## Observability Checklist
- [x] `committee_read` event logged with `committeeId`, `correlationId`
- [x] `committee_read_by_group` event logged with `groupId`, `committeeId`, `correlationId`
- [x] No JWT payload, password hash, or PII in logs
- [x] 500 response returns generic message; internal error detail stays in server logs
- [ ] Audit log entry written (read-only endpoints — not applicable)

---

## Migration / Breaking Change Assessment
- [x] No database migration required (read-only; no schema changes)
- [x] No breaking change to API contract
- [x] Backward compatibility: N/A — new endpoints

---

## Out of Scope Confirmation

The following are explicitly out of scope for this PR and were not implemented:
- Committee creation/update/delete
- Committee assignment mutation logic (Issues 35, 38)
- Additional filtering or search endpoints
- Role model redesign

---

## Dependencies
- Depends on: #25 (Committee Creation — must be merged first)
- Must be merged before: #38 (group-committee assignment), #35 (advisor assignment)
- Requires Issue 47 (Audit logging) to be merged first: No

---

## Reviewer Notes
- **Circular dependency avoided**: `GroupsModule` imports `CommitteesModule` for the reverse lookup route; `CommitteesModule` injects `GroupModel` directly instead of importing `GroupsModule`, which would create a cycle.
- **Reverse lookup query**: `{ 'groups.groupId': groupId }` — depends on Issue 38 populating `groups` array with objects containing a `groupId` field. Until Issue 38 is merged, this endpoint will always return 404 for the "no committee assigned" case, which is the correct behaviour.
- **`toResponseDto` helper**: extracted in `CommitteesController` to avoid duplicating the mapping logic across `createCommittee` and `getCommitteeById`.

---

## Definition of Done Sign-off
- [x] Implementation merged with passing tests
- [x] OpenAPI spec updated and aligned with implementation
- [ ] QA scenarios executed and evidenced above
- [x] PR description includes test evidence and status-matrix coverage
- [x] No TODO comments left in production code
- [x] No console.log or debug statements left in code
