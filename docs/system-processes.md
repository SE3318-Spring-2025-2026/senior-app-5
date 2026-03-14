# System Processes Documentation

## Definition

A system process is a series of steps performed by users, committees, or the system to achieve specific academic and project management outcomes.

---

## Process Overview

| Process | Description | System Components Involved |
|---------|-------------|---------------------------|
| Setting Evaluation Rubric | Create evaluation rubric based on grading criteria and set per-sprint story point requirements. Set which sprint contributes to which deliverable at what percentage. | Frontend: Coordinator Panel UI, Backend: Database, Rubric API |
| User Registration | Users register themselves and connect GitHub accounts. Admins manually register professors. Coordinators add/remove students to groups. Team Leaders set JIRA/GitHub integration. Generate one-time-use password reset links. | Frontend: Registration Forms, Admin Panel, Backend: Auth API, Database, External: GitHub OAuth, JIRA API |
| Group Creation & Sanitization | Students create groups and leaders add members. Disband groups that do not have an advisor. | Frontend: Group Management UI, Backend: Database, Scheduled Jobs |
| Advisor Association | Bound by Coordinator schedule. Leaders request advisors. Coordinators transfer advisors. Notify advisor if approved. | Frontend: Student Panel, Professor Dashboard, Backend: Notification Service, Database |
| Committee Assignment | Create committees and assign additional jury members. Assign advisors to committees. Committees grade multiple groups. | Frontend: Coordinator Panel, Backend: Committee API, Database |
| Submission | Set bounding schedules for Proposal phases. Restrict proposal submissions to groups only. Verify submissions before review. | Frontend: Upload UI, Submission Forms, Backend: File Storage, Validation API |
| Send Review | Committee members view, comment, and grade submissions. Require revised proposals before grading. Grade SoW submissions. | Frontend: Committee Panel, Review UI, Backend: Grading API, Database |
| Grade Calculation | Calculate final grades based on deliverable weights, sprint contributions, and committee evaluations. | Backend: Calculation Engine, Database, Frontend: Grade Display UI |
| Scrum Management | Set scrum schedule after Group-Advisor association. Refresh active stories and validate with GitHub. Show live grades. | Frontend: Advisor Panel, Team Panel, Backend: JIRA/GitHub Integration, Database |

---

## Process 1: Setting Evaluation Rubric

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Create evaluation rubric | Frontend: Coordinator Panel, Backend: Rubric API | Define grading criteria per deliverable. |
| Set story point requirements | Frontend: Coordinator Panel, Backend: Rubric Service | Set minimum story points per sprint. |
| Configure sprint weights | Frontend: Coordinator Panel, Backend: Rubric API, Database: Rubric Tables | Assign percentage contribution of each sprint to deliverables. |
| Map deliverable percentages | Frontend: Coordinator Panel, Backend: Validation Service | Total deliverable weights must equal 100%. |

---

## Process 2: User Registration

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Student self-registration | Frontend: Registration Form, Backend: Auth API, Database: Users | Validate email domain and unique user. |
| Connect GitHub account | Frontend: OAuth Login UI, Backend: NextAuth.js/Auth Service, External: GitHub OAuth API | Fetch user data via GitHub OAuth. |
| Admin registers professor | Frontend: Admin Panel, Backend: User Management API | Restrict to authenticated "Admin" role. |
| Coordinator manages students | Frontend: Coordinator Panel, Backend: Group/User API, Database: Group Membership | Add/remove students to groups. |
| Team Leader sets integrations | Frontend: Team Panel, Backend: Integration API, External: JIRA API + GitHub API | Configure JIRA/GitHub project links. |
| Generate password reset link | Frontend: Admin/Coordinator UI, Backend: Auth API + Token Service, Database: Reset Tokens | One-time-use token, expires in 24 hours. |

---

## Process 3: Group Creation & Sanitization

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Student creates group | Frontend: Group Management UI, Backend: Group API, Database: Groups | Create a new group with valid group metadata. |
| Leader adds members | Frontend: Team Panel, Backend: Group Membership API, Database: Group Membership | Maximum group size enforced. |
| Deliver group invites | Frontend: In-app Notification Center, Backend: Notification Service, Database: Notifications | Send invite notifications to selected members. |
| Validate group advisor | Backend: Advisor Validation Service, Database: Advisor Assignments | Check advisor assignment before deadline. |
| Disband groups without advisor | Backend: Scheduled Job Worker, Database: Groups + Advisor Assignments | Run sanitization after advisor deadline. |

---

## Process 4: Advisor Association

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set advisor request schedule | Frontend: Coordinator Panel, Backend: Advisor Schedule API, Database: Schedule Config | Define start and end dates for requests. |
| Leader requests advisor | Frontend: Team Panel, Backend: Advisor Request API, Database: Advisor Requests | Bound by Coordinator schedule. |
| Deliver advisee requests | Frontend: Professor Dashboard, Backend: Notification/Inbox API | Make advisor requests visible to professors. |
| Advisor approves/rejects | Frontend: Professor Dashboard, Backend: Advisor Decision API, Database: Advisor Requests | Notify group of decision. |
| Coordinator transfers advisor | Frontend: Coordinator Panel, Backend: API Gateway + Advisor Transfer API, Database: Group-Advisor Mapping | Restrict exclusively to authenticated "Coordinator" role. |
| Notify advisor on approval | Frontend: Notification Center, Backend: Notification Service, External: Email/SMS (optional) | Send approval notification to advisor. |

---

## Process 5: Committee Assignment

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Create committee | Frontend: Coordinator Panel, Backend: Committee API, Database: Committees | Define committee name and type. |
| Assign jury members | Frontend: Coordinator Panel, Backend: Committee Membership API, Database: Committee Members | Add professors as committee members. |
| Assign advisors to committees | Backend: Committee Assignment Service, Database: Advisor-Committee Mapping | Advisor automatically joins committee. |
| Assign groups to committees | Frontend: Coordinator Panel, Backend: Committee Assignment API, Database: Group-Committee Mapping | Distribute groups across committees. |

---

## Process 6: Submission

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set submission schedule | Frontend: Coordinator Panel, Backend: Submission Schedule API, Database: Schedule Config | Define start and end dates per phase. |
| Enforce schedules | Backend: Submission Validation Service, External/Infra: Central Time Server (UTC) | Sync with centralized server time (UTC). |
| Restrict to groups only | Frontend: Submission Form Guard, Backend: AuthZ Middleware, Database: Group Membership | Only group members can submit. |
| Upload proposal document | Frontend: Upload UI, Backend: File Upload API, Storage: Object Storage | Validate file type and size limits. |
| Verify submission completeness | Frontend: Form Validation, Backend: Submission Validation API, Database: Submission Metadata | Check required fields before acceptance. |
| Validate SoW Submission | Backend: Workflow Validation Service, Database: Submission Status | Prevent submission until "Revised Proposal Submission" is complete. |

---

## Process 7: Send Review

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Limit grading access | Frontend: Committee Panel Access Guard, Backend: AuthZ + Schedule Check Middleware | Strictly bounded by schedules set by the Coordinator. |
| Committee views submission | Frontend: Committee Panel, Backend: Submission Retrieval API, Storage: Document Storage | Load submission documents for review. |
| Leave review comments | Frontend: Review UI, Backend: Comment API, Database: Review Comments | Store and display comments for each submission. |
| Request revision | Frontend: Committee Panel, Backend: Review Workflow API, Database: Revision Requests | Require revised proposals before grading. |
| Grade submission | Frontend: Grading Form UI, Backend: Grading API, Database: Grades | Enter numeric grade with optional feedback. |
| Grade SoW submissions | Frontend: Committee Panel, Backend: SoW Grading API, Database: SoW Grades | Separate grading for Statement of Work. |

---

## Process 8: Grade Calculation

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Fetch deliverable weights | Backend: Rubric Service, Database: Rubric Tables | Retrieve rubric configuration. |
| Calculate sprint contribution | Backend: Grade Calculation Engine, External: JIRA/GitHub Integration Data | Sum story points × sprint weight percentage. |
| Aggregate committee grades | Backend: Aggregation Service, Database: Committee Grades | Average grades from all committee members. |
| Apply deliverable percentages | Backend: Weighting Service, Database: Deliverable Weights | Proposal, SoW, Final weighted calculation. |
| Calculate final grade | Backend: Final Grade Engine, Database: Final Grades | Total = Σ(deliverable × weight). |
| Store grade history | Backend: Audit Log Service, Database: Grade History | Maintain audit log of grade changes. |

---

## Process 9: Scrum Management

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set scrum schedule | Frontend: Coordinator Panel, Backend: Scrum Schedule API, Database: Scrum Config | Define after Group-Advisor association. |
| Configure JIRA integration | Frontend: Team Panel, Backend: Integration API, External: JIRA API | Connect project board. |
| Configure GitHub integration | Frontend: Team Panel, Backend: Integration API, External: GitHub API | Link repository for validation. |
| Refresh sprint stories | Backend: Sync Worker + Sprint Service, External: GitHub API + JIRA API, Database: Sprint Cache | Execute data refresh at end of each sprint. |
| Validate stories with GitHub | Backend: Validation Service, External: GitHub API | Cross-reference commits and PRs. |
| Calculate sprint story points | Backend: Story Point Calculator, Database: Sprint Stories | Sum completed story points per sprint. |

---

