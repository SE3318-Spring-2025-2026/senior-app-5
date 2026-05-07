# Backend RBAC (Role-Based Access Control) Matrix

| Endpoint (Method + Path) | Auth Guard | @Roles() | Allowed Roles | Denied Roles | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /auth/login` | None | None | Public | None | Public authentication |
| `GET /submissions/me` | JwtAuthGuard, RolesGuard | `Student` | Student | Admin, Coord, Prof, TeamLeader | Returns student's group data |
| `POST /submissions` | JwtAuthGuard, RolesGuard | `Student, TeamLeader` | Student, TeamLeader | Admin, Coord, Prof | Student document creation |
| `GET /submissions/:id/completeness` | JwtAuthGuard, RolesGuard | `All Roles Explicitly`| All Authenticated | None | Fixed missing role guard |
| `GET /submissions` | JwtAuthGuard, RolesGuard | `All Roles Explicitly`| All Authenticated | None | Fixed missing role guard |
| `GET /submissions/:id` | JwtAuthGuard, RolesGuard | `All Roles Explicitly`| All Authenticated | None | Fixed missing role guard |
| `POST /groups` | JwtAuthGuard, RolesGuard | `Admin, Coordinator` | Admin, Coordinator | Student, TeamLeader, Professor | Group Creation |
| `POST /groups/:groupId/members` | JwtAuthGuard, RolesGuard | `Admin, Coordinator` | Admin, Coordinator | Student, TeamLeader, Professor | Add Member |
| `GET /groups/:groupId/validate-statement-of-work` | JwtAuthGuard, RolesGuard | `All Roles Explicitly`| All Authenticated | None | Fixed ambiguous policy |
| `GET /groups/:groupId/committee` | JwtAuthGuard, RolesGuard | `All Roles Explicitly`| All Authenticated | None | Cleaned redundant AuthGuard |
| `PATCH /admin/students/:studentId/group` | JwtAuthGuard, RolesGuard | `Coordinator, Admin` | Coordinator, Admin | Student, TeamLeader, Professor | Move student |
| `GET /admin/advisor-validation` | JwtAuthGuard, RolesGuard | `Coordinator, Admin` | Coordinator, Admin | Student, TeamLeader, Professor | Check assignments |
| `POST /admin/sanitization/execute` | JwtAuthGuard, RolesGuard | `Coordinator, Admin` | Coordinator, Admin | Student, TeamLeader, Professor | Destructive sanitization |
| `GET /admin/activity` | JwtAuthGuard, RolesGuard | `Coordinator, Admin` | Coordinator, Admin | Student, TeamLeader, Professor | View logs |
| `POST /invites/deliver` | JwtAuthGuard, RolesGuard | `Coordinator, Admin` | Coordinator, Admin | Student, TeamLeader, Professor | Fixed missing Admin role |
| `GET /advisors` | JwtAuthGuard, RolesGuard | `Coordinator, TeamLeader, Admin` | Coordinator, TeamLeader, Admin | Student, Professor | Fixed missing Admin role |
| `DELETE /advisors/:advisorId/groups/:groupId` | JwtAuthGuard, RolesGuard | `Coordinator, Professor, Admin` | Coordinator, Professor, Admin | Student, TeamLeader | Fixed missing Admin role |
| `POST /requests` | JwtAuthGuard, RolesGuard | `TeamLeader` | TeamLeader | Admin, Coord, Prof, Student | Student submission |
| `PATCH /requests/:requestId/decision` | JwtAuthGuard, RolesGuard | `Professor, Coordinator, Admin` | Professor, Coordinator, Admin | Student, TeamLeader | Fixed missing roles |
| `PATCH /requests/:requestId` | JwtAuthGuard, RolesGuard | `TeamLeader` | TeamLeader | Admin, Coord, Prof, Student | Student withdrawal |