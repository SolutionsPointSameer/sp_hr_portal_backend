# Business Requirements Document — Enterprise HR Management Portal

**Date:** 2026-02-28
**Status:** Approved
**Version:** 1.0

---

## 1. Overview & Objectives

### Project Name
Enterprise HR Management Portal

### Purpose
A centralized, web-based HR portal that enables a 100–500 person enterprise to manage the full employee lifecycle — from onboarding through day-to-day attendance, leave, and payroll — with role-appropriate access for employees, managers, HR admins, and system admins.

### Business Objectives
1. Eliminate manual/paper-based HR processes by digitizing employee records, leave requests, payroll, and onboarding
2. Give employees self-service access to their own data, payslips, and leave balances
3. Enable managers to approve requests and monitor team attendance in real time
4. Provide HR admins a single system of record for all workforce data
5. Ensure data security, audit trails, and compliance with labor regulations

### Success Criteria
- 100% of employee records maintained in the portal
- Leave approval cycle time reduced to under 24 hours
- Payroll processed and payslips distributed within the portal each cycle
- Onboarding tasks tracked and completed within the system
- Role-based access enforced with full audit logging

---

## 2. User Roles & Access Control

### Employee (Self-Service)
- View and update personal profile (contact info, emergency contacts, bank details)
- View employment details (designation, department, reporting manager)
- Apply for leave, view leave balance, check leave history
- View and download payslips
- View company announcements and HR policies

### Manager / Team Lead
- All employee self-service capabilities
- View team roster and individual profiles
- Approve / reject leave requests for direct reports
- View team attendance and generate team-level reports

### HR Administrator
- Full CRUD on all employee records
- Manage organizational structure (departments, designations, locations)
- Process payroll runs, configure salary components, manage deductions
- Manage onboarding checklists and tasks for new hires
- Configure leave policies (types, quotas, carry-forward rules)
- Generate HR reports (headcount, attrition, attendance summaries)

### Super Admin / IT Admin
- All HR Admin capabilities
- User account management (create, deactivate, reset passwords)
- Role assignment and permission configuration
- System settings (company info, working calendar, holidays)
- Audit log access (who did what, when)
- Data export and backup management

---

## 3. Module Specifications

### Module 1 — Employee Records & Profiles

**Core Features:**
- Employee master record: personal info, contact details, emergency contacts, documents (ID proof, contracts)
- Employment details: employee ID, designation, department, location, date of joining, employment type (full-time/contract/intern)
- Org chart with reporting hierarchy
- Document vault: upload/download offer letters, contracts, certificates (stored in AWS S3)
- Employee lifecycle tracking: promotions, transfers, role changes, resignations, terminations
- Search and filter employees by department, designation, status

---

### Module 2 — Attendance & Leave Management

**Attendance:**
- Daily attendance tracking (manual check-in/check-out or HR-managed entry)
- Monthly attendance summary per employee
- Regularization requests (employee requests correction for missed punches)
- Configurable working hours and shifts

**Leave Management:**
- Leave types: earned leave, sick leave, casual leave, unpaid leave, custom types
- Leave balance tracking per employee per type
- Leave application workflow: apply → manager approval → HR notification
- Leave calendar (team view showing who is on leave)
- Carry-forward and lapse rules configurable per leave type
- Holiday calendar (national + company holidays)

---

### Module 3 — Payroll Management

**Core Features:**
- Salary structure configuration: basic, HRA, allowances, deductions, bonuses
- Monthly payroll run: auto-compute based on attendance and salary structure
- Tax and statutory deductions (configurable: PF, ESI, TDS, professional tax)
- Payslip generation and distribution (employee views/downloads in portal)
- Revision history: salary hike tracking with effective dates
- Payroll reports: monthly cost summary, department-wise breakdown

**Workflow:** Draft payroll → HR review → Finalize → Publish payslips

---

### Module 4 — Onboarding

**Core Features:**
- Onboarding checklist assigned to new hire on joining date (manually created by HR)
- Tasks assignable to HR, IT, and the new employee (e.g. document submission, account setup)
- Digital document collection from new hire
- Task completion tracking with due dates and overdue alerts
- Auto-creation of employee record when HR adds a new hire

---

## 4. Technical Architecture

**Architecture Pattern:** Modular Monolith — single deployable application with clearly bounded internal modules.

### Frontend
- **Framework:** React (TypeScript)
- **UI Library:** Ant Design or shadcn/ui
- **State Management:** React Query (server state) + Zustand (UI state)
- **Routing:** React Router v6 with role-based route guards

### Backend
- **Runtime:** Node.js with Express
- **Language:** JavaScript (ES2022, CommonJS)
- **Architecture:** Layered — Routes → Controllers → Services → Repository
- **Authentication:** JWT-based with refresh tokens; bcrypt password hashing
- **Authorization:** Role-based access control (RBAC) enforced at middleware layer

### Database
- **Primary DB:** PostgreSQL — structured HR data, relational integrity, ACID compliance
- **Schema structure:** Bounded by module (employees, attendance, payroll, onboarding)
- **ORM:** Prisma — type-safe queries, migrations, schema evolution

### Infrastructure (AWS — Mumbai ap-south-1)
- **Compute:** AWS Elastic Beanstalk (Node.js backend) on EC2 t3.medium
- **Frontend:** AWS S3 + CloudFront (React static site with CDN)
- **Database:** AWS RDS PostgreSQL (db.t3.medium, Multi-AZ optional)
- **File Storage:** AWS S3 (employee documents, payslips — separate bucket)
- **CDN:** AWS CloudFront (static assets, global edge delivery)
- **Environments:** Dev / Staging / Production (separate AWS accounts or namespaced resources)
- **CI/CD:** GitHub Actions with AWS deployment integration (Elastic Beanstalk deploy action)
- **Secrets:** AWS Secrets Manager (credentials, JWT secrets, DB connection strings)
- **Monitoring:** AWS CloudWatch + X-Ray (logs, metrics, distributed tracing, alerts)
- **Email:** Amazon SES — Simple Email Service (transactional notifications)

### Security
- HTTPS enforced everywhere
- JWT short expiry + refresh token rotation
- Sensitive fields encrypted at rest (bank details, salary info)
- Input validation and sanitization on all API endpoints
- Audit log records every create/update/delete with actor + timestamp

### Non-Functional Requirements

| Requirement       | Target                        |
|-------------------|-------------------------------|
| Page load time    | < 2 seconds                   |
| API response time | < 500ms (p95)                 |
| Uptime            | 99.5%                         |
| Concurrent users  | Up to 500                     |
| Data retention    | 7 years (compliance)          |
| Backup frequency  | Daily automated backups       |

---

## 5. Data Model

### Key Entities

```
employees
  ├── id, employee_code, first_name, last_name, email, phone
  ├── department_id → departments
  ├── designation_id → designations
  ├── manager_id → employees (self-referential)
  ├── employment_type (full-time/contract/intern)
  ├── status (active/on-leave/terminated)
  ├── date_of_joining, date_of_leaving
  └── created_at, updated_at

departments
  └── id, name, head_employee_id

designations
  └── id, name, department_id, level

employee_documents
  └── id, employee_id, type, file_url (AWS S3), uploaded_at

attendance_records
  └── id, employee_id, date, check_in, check_out, status, source

leave_types
  └── id, name, annual_quota, carry_forward_limit, is_paid

leave_requests
  ├── id, employee_id, leave_type_id
  ├── from_date, to_date, days_count
  ├── status (pending/approved/rejected)
  ├── approver_id → employees
  └── applied_at, decided_at, reason

leave_balances
  └── id, employee_id, leave_type_id, year, entitled, used, remaining

salary_structures
  └── id, employee_id, effective_date, basic, hra, allowances (JSON), deductions (JSON)

payroll_runs
  └── id, month, year, status (draft/finalized), processed_by, processed_at

payslips
  └── id, payroll_run_id, employee_id, gross, deductions, net_pay, file_url

onboarding_tasks
  └── id, employee_id, task_name, assigned_to, due_date, status

audit_logs
  └── id, actor_id, action, entity, entity_id, changes (JSON), timestamp
```

---

## 6. Notifications & Reporting

### Notifications
In-portal + email notifications via Amazon SES (Simple Email Service):

| Event                        | Recipient     |
|------------------------------|---------------|
| Leave request submitted      | Manager       |
| Leave approved / rejected    | Employee      |
| Payslip published            | Employee      |
| New employee added           | HR Admin      |
| Onboarding task assigned     | Assignee      |
| Onboarding task overdue      | HR Admin      |
| Payroll run finalized        | HR Admin      |

### Reports (HR Admin & Super Admin)

| Report                | Description                                      |
|-----------------------|--------------------------------------------------|
| Headcount report      | Active employees by department/designation       |
| Attendance summary    | Monthly attendance per employee or department    |
| Leave utilization     | Leave taken vs. balance per employee             |
| Payroll cost summary  | Monthly gross/net pay by department              |
| Attrition report      | Joiners and leavers by month/quarter             |
| Onboarding status     | Pending vs. completed tasks per new hire         |

All reports exportable as **CSV and PDF**.

---

## 7. Out of Scope (v1.0)
- Recruitment pipeline and candidate tracking
- Interview scheduling and feedback
- Performance management and appraisals
- Training & development / LMS
- Mobile application (iOS/Android)
- Third-party integrations (ERP, SSO, accounting systems)
- Multi-language / multi-currency support
