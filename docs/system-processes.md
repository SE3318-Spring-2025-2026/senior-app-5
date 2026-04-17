# System Processes Documentation

## Definition

A system process is a series of steps performed by users, committees, or the system to achieve specific academic and project management outcomes.

---

## Process Overview

| Process | Description | System Components Involved |
|---------|-------------|---------------------------|
| Setting Evaluation Rubric | Create evaluation rubric based on grading criteria and set per-sprint story point requirements. Set which sprint contributes to which deliverable at what percentage. | Frontend, Backend, Database |
| User Registration | Users register themselves and connect GitHub accounts. Admins manually register professors. Coordinators add/remove students to groups. Team Leaders set JIRA/GitHub integration. Generate one-time-use password reset links. | Frontend, Backend, Database, External: GitHub OAuth, NextAuth.js, JIRA API, GitHub API |
| Group Creation & Sanitization | Students create groups and leaders add members. Disband groups that do not have an advisor. | Frontend, Backend, Database |
| Advisor Association | Bound by Coordinator schedule. Leaders request advisors. Coordinators transfer advisors. Notify advisor if approved. | Frontend, Backend, Database |
| Committee Assignment | Create committees and assign additional jury members. Assign advisors to committees. Committees grade multiple groups. | Frontend, Backend, Database |
| Submission | Set bounding schedules for Proposal phases. Restrict proposal submissions to groups only. Verify submissions before review. | Frontend, Backend, Database |
| Send Review | Committee members view, comment, and grade submissions. Require revised proposals before grading. Grade SoW submissions. | Frontend, Backend, Database |
| Grade Calculation | Calculate final grades based on deliverable weights, sprint contributions, and committee evaluations. | Frontend, Backend, Database |
| Scrum Management | Set scrum schedule after Group-Advisor association. Refresh active stories and validate with GitHub. Show live grades. | Frontend, Backend, Database, External: JIRA API, GitHub API |

---

## Process 1: Setting Evaluation Rubric

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Create evaluation rubric | Frontend, Backend | Deliverable ID, Criteria Name, Criteria Weight |
| Set story point requirements | Frontend, Backend | Sprint ID, Minimum Story Points |
| Configure sprint weights | Frontend, Backend, Database | Sprint ID, Deliverable ID, Sprint Weight |
| Map deliverable percentages | Frontend, Backend | Deliverable ID, Deliverable Percentage, Total Percentage |
| Record Sprint Evaluation | Frontend, Backend | Group ID, SprintID |
| Record Deliverable Evaluation | Frontend, Backend | Deliverable ID, Deliverable Grade, GroupID |

---

## Process 2: User Registration

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Student self-registration | Frontend, Backend, Database | User ID, Email, Password Hash |
| Connect GitHub account | Frontend, Backend, External: GitHub OAuth, NextAuth.js | User ID, GitHub Account ID, OAuth Access Token |
| Admin registers professor | Frontend, Backend | Admin User ID, Professor User ID, Role |
| Coordinator manages students | Frontend, Backend, Database | Coordinator User ID, Student User ID, Group ID |
| Team Leader sets integrations | Frontend, Backend, External: JIRA API, GitHub API | Team ID, JIRA Project Key, GitHub Repository ID |
| Generate password reset link | Frontend, Backend, Database | User ID, Reset Token, Token Expiry Datetime |

---

## Process 3: Group Creation & Sanitization

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Student creates group | Frontend, Backend, Database | Group ID, Group Name, Leader User ID |
| Leader adds members | Frontend, Backend, Database | Group ID, Member User ID, Group Member Count |
| Deliver group invites | Frontend, Backend, Database | Group ID, Recipient User ID, Notification ID |
| Validate group advisor | Backend, Database | Group ID, Advisor User ID, Advisor Deadline |
| Disband groups without advisor | Backend, Database | Group ID, Advisor Assignment Status, Sanitization Run Datetime |

---

## Process 4: Advisor Association

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set advisor request schedule | Frontend, Backend, Database | Request Start Datetime, Request End Datetime, Coordinator User ID |
| Leader requests advisor | Frontend, Backend, Database | Group ID, Leader User ID, Requested Advisor User ID |
| Deliver advisee requests | Frontend, Backend | Advisor User ID, Advisor Request ID, Request Status |
| Advisor approves/rejects | Frontend, Backend, Database | Advisor User ID, Advisor Request ID, Decision Status |
| Coordinator transfers advisor | Frontend, Backend, Database | Coordinator User ID, Group ID, New Advisor User ID |
| Notify advisor on approval | Frontend, Backend | Advisor User ID, Approval Notification ID, Notification Datetime |

---

## Process 5: Committee Assignment

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Create committee | Frontend, Backend, Database | Committee ID, Committee Name |
| Assign jury members | Frontend, Backend, Database | Committee ID, Jury Member User ID, Assignment Datetime |
| Assign advisors to committees | Backend, Database | Committee ID, Advisor User ID, Assignment Source |
| Assign groups to committees | Frontend, Backend, Database | Committee ID, Group ID, Assignment Datetime |

---

## Process 6: Submission

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set submission schedule | Frontend, Backend, Database | Phase ID, Submission Start Datetime, Submission End Datetime |
| Enforce schedules | Backend | Phase ID, Server Datetime, Submission Window Status |
| Restrict to groups only | Frontend, Backend, Database | Group ID, Submitter User ID, Membership Status |
| Upload proposal document | Frontend, Backend | Submission ID, File Name, File Type |
| Verify submission completeness | Frontend, Backend, Database | Submission ID, Required Field List, Completeness Status |
| Validate SoW Submission | Backend, Database | Group ID, SoW Submission Status, Revised Proposal Status |

---

## Process 7: Send Review

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Limit grading access | Frontend, Backend | Committee User ID, Grading Window Status, Submission Phase ID |
| Committee views submission | Frontend, Backend | Committee User ID, Submission ID, Document ID |
| Leave review comments | Frontend, Backend, Database | Submission ID, Comment ID, Comment Text |
| Request revision | Frontend, Backend, Database | Submission ID, Revision Request ID, Revision Due Datetime |
| Grade submission | Frontend, Backend, Database | Submission ID, Committee User ID, Grade Value |
| Grade SoW submissions | Frontend, Backend, Database | SoW Submission ID, Committee User ID, SoW Grade Value |

---

## Process 8: Grade Calculation

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Fetch deliverable weights | Backend, Database | Deliverable ID, Deliverable Weight |
| Calculate sprint contribution | Backend, External: JIRA API, GitHub API | Sprint ID, Story Points, Sprint Weight |
| Aggregate committee grades | Backend, Database | Submission ID, Committee Grade List, Average Grade |
| Apply deliverable percentages | Backend, Database | Proposal Grade, SoW Grade, Deliverable Percentage |
| Calculate final grade | Backend, Database | Group ID, Weighted Grade Components, Final Grade |
| Store grade history | Backend, Database | Group ID, Grade Change ID, Changed At Datetime |

---

## Process 9: Scrum Management

| Process Step | System Component | Constraint / Data Required |
|--------------|------------------|---------------------------|
| Set scrum schedule | Frontend, Backend, Database | Sprint ID, Scrum Start Datetime, Scrum End Datetime |
| Configure JIRA integration | Frontend, Backend, External: JIRA API | Team ID, JIRA Project Key, Integration Status |
| Configure GitHub integration | Frontend, Backend, External: GitHub API | Team ID, GitHub Repository ID, Integration Status |
| Refresh sprint stories | Backend, Database, External: GitHub API, JIRA API | Sprint ID, Story Sync Datetime, Sync Status |
| Validate stories with GitHub | Backend, External: GitHub API | Sprint Story ID, Commit ID, Pull Request ID |
| Calculate sprint story points | Backend, Database | Sprint ID, Completed Story Points, Total Story Points |

---

