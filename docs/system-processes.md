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
| Create evaluation rubric | Coordinator Panel | Define grading criteria per deliverable. |
| Set story point requirements | System | Set minimum story points per sprint. |
| Configure sprint weights | Database | Assign percentage contribution of each sprint to deliverables. |
| Map deliverable percentages | System | Total deliverable weights must equal 100%. |
| Save rubric configuration | Database | Process and update database in under 2 seconds. |

---

## Process 2: User Registration

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Student self-registration | System | Validate email domain and unique user. |
| Connect GitHub account | NextAuth.js | Fetch user data via GitHub OAuth. |
| Admin registers professor | Admin Panel | Restrict to authenticated "Admin" role. |
| Coordinator manages students | Coordinator Panel | Add/remove students to groups. |
| Team Leader sets integrations | Team Panel | Configure JIRA/GitHub project links. |
| Generate password reset link | System | One-time-use token, expires in 24 hours. |

---

## Process 3: Group Creation & Sanitization

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Student creates group | Database | Process and update database in under 2 seconds. |
| Leader adds members | System | Maximum group size enforced. |
| Deliver group invites | Notification Service | Deliver in-app notifications within 3 seconds. |
| Validate group advisor | System | Check advisor assignment before deadline. |
| Disband groups without advisor | Scheduled Job | Run sanitization after advisor deadline. |

---

## Process 4: Advisor Association

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set advisor request schedule | Coordinator Panel | Define start and end dates for requests. |
| Leader requests advisor | System | Bound by Coordinator schedule. |
| Deliver advisee requests | Professor Dashboard | Process and deliver within 3 seconds. |
| Advisor approves/rejects | Professor Dashboard | Notify group of decision. |
| Coordinator transfers advisor | API Gateway | Restrict exclusively to authenticated "Coordinator" role. |
| Notify advisor on approval | Notification Service | Send notification within 3 seconds. |

---

## Process 5: Committee Assignment

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Create committee | Coordinator Panel | Define committee name and type. |
| Assign jury members | Coordinator Panel | Add professors as committee members. |
| Assign advisors to committees | System | Advisor automatically joins committee. |
| Assign groups to committees | Coordinator Panel | Distribute groups across committees. |
| Handle concurrent traffic | Infrastructure | 99.9% uptime, handle load during grading. |

---

## Process 6: Submission

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set submission schedule | Coordinator Panel | Define start and end dates per phase. |
| Enforce schedules | Time Server | Sync with centralized server time (UTC). |
| Restrict to groups only | System Auth | Only group members can submit. |
| Upload proposal document | Backend | Validate file type and size limits. |
| Verify submission completeness | Backend | Check required fields before acceptance. |
| Validate SoW Submission | Backend | Prevent submission until "Revised Proposal Submission" is complete. |

---

## Process 7: Send Review

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Limit grading access | System Auth | Strictly bounded by schedules set by the Coordinator. |
| Committee views submission | Committee Panel | Load submission documents for review. |
| Leave review comments | System Database | Provide stable environment for persistent comments. |
| Request revision | Committee Panel | Require revised proposals before grading. |
| Grade submission | Committee Panel | Enter numeric grade with optional feedback. |
| Grade SoW submissions | Committee Panel | Separate grading for Statement of Work. |

---

## Process 8: Grade Calculation

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Fetch deliverable weights | Database | Retrieve rubric configuration. |
| Calculate sprint contribution | System | Sum story points × sprint weight percentage. |
| Aggregate committee grades | System | Average grades from all committee members. |
| Apply deliverable percentages | System | Proposal, SoW, Final weighted calculation. |
| Calculate final grade | Backend | Total = Σ(deliverable × weight). |
| Display live grades | Advisor Panel | Display team grades in real-time for immediate feedback. |
| Store grade history | Database | Maintain audit log of grade changes. |

---

## Process 9: Scrum Management

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set scrum schedule | Coordinator Panel | Define after Group-Advisor association. |
| Configure JIRA integration | Team Panel | Connect project board. |
| Configure GitHub integration | Team Panel | Link repository for validation. |
| Refresh sprint stories | Backend + GitHub/JIRA | Execute data refresh at end of each sprint. |
| Validate stories with GitHub | Backend | Cross-reference commits and PRs. |
| Calculate sprint story points | System | Sum completed story points per sprint. |
| Display live grades | Advisor Panel | Display team grades in real-time for immediate feedback. |

---

## Key Insight

Each table represents strict performance metrics, role-based access controls, or external API integrations that must be implemented to satisfy both functional and non-functional system requirements.

Understanding these functional processes is essential for defining the core user flows, database schemas, and necessary system integrations.
