# Frontend Specification — HR Management Portal

**Date:** 2026-02-28
**Version:** 1.0
**Parent BRD:** [2026-02-28-hr-management-portal-design.md](./2026-02-28-hr-management-portal-design.md)

---

## 1. Tech Stack

| Concern | Library / Tool | Version |
|---|---|---|
| Framework | React | 18 |
| Language | TypeScript | 5 |
| Build tool | Vite | 5 |
| UI component library | Ant Design | 5 |
| Server state / data fetching | TanStack React Query | 5 |
| Client / UI state | Zustand | 4 |
| Routing | React Router | v6 |
| HTTP client | Axios | 1 |
| Form management | Ant Design Form (built-in) | — |
| Testing | Vitest + Testing Library | — |
| Linting | ESLint + Prettier | — |
| Hosting | AWS S3 + CloudFront | — |

---

## 2. Folder Structure

```
apps/web/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts              # Axios instance, interceptors, token refresh
│   │   ├── auth.api.ts
│   │   ├── employees.api.ts
│   │   ├── attendance.api.ts
│   │   ├── leave.api.ts
│   │   ├── payroll.api.ts
│   │   ├── onboarding.api.ts
│   │   └── reports.api.ts
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx      # Sidebar + header shell
│   │   │   └── PageHeader.tsx
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── StatusTag.tsx      # Reusable colored tag (ACTIVE/PENDING etc.)
│   │   └── guards/
│   │       ├── RequireAuth.tsx    # Redirect to /login if no user
│   │       └── RequireRole.tsx    # Render 403 if role insufficient
│   ├── hooks/
│   │   ├── useAuth.ts             # Auth store selector shortcut
│   │   └── usePermission.ts       # Role-check helper
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── employees/
│   │   │   ├── EmployeeList.tsx
│   │   │   ├── EmployeeDetail.tsx
│   │   │   └── EmployeeForm.tsx
│   │   ├── attendance/
│   │   │   ├── MyAttendance.tsx
│   │   │   └── TeamAttendance.tsx
│   │   ├── leave/
│   │   │   ├── MyLeave.tsx
│   │   │   ├── PendingApprovals.tsx
│   │   │   └── LeaveCalendar.tsx
│   │   ├── payroll/
│   │   │   ├── MyPayslips.tsx
│   │   │   └── PayrollRuns.tsx    # HR Admin only
│   │   ├── onboarding/
│   │   │   └── OnboardingTasks.tsx
│   │   ├── reports/
│   │   │   └── Reports.tsx
│   │   └── admin/
│   │       ├── UserManagement.tsx
│   │       └── SystemSettings.tsx
│   ├── router/
│   │   └── index.tsx              # Route definitions + lazy loading
│   ├── store/
│   │   └── auth.store.ts          # Zustand auth store (persisted)
│   ├── test/
│   │   └── setup.ts
│   ├── types/
│   │   └── index.ts               # Shared TypeScript interfaces
│   ├── utils/
│   │   └── format.ts              # Currency, date, name formatters
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Authentication & Routing

### Auth Flow
1. User submits email + password on `/login`
2. On success, `accessToken` + `refreshToken` stored in Zustand (persisted to `localStorage`)
3. Axios request interceptor attaches `Authorization: Bearer <accessToken>` to every request
4. On 401 response, Axios interceptor silently calls `POST /auth/refresh` with the stored `refreshToken`, swaps tokens, and retries the original request
5. On refresh failure, user is redirected to `/login` and store is cleared

### Route Structure

```
/login                          Public
/                               → redirect to /dashboard
/dashboard                      All authenticated roles
/employees                      MANAGER, HR_ADMIN, SUPER_ADMIN
/employees/:id                  MANAGER, HR_ADMIN, SUPER_ADMIN
/employees/new                  HR_ADMIN, SUPER_ADMIN
/attendance/mine                All roles
/attendance/team                MANAGER, HR_ADMIN, SUPER_ADMIN
/leave/mine                     All roles
/leave/approvals                MANAGER, HR_ADMIN, SUPER_ADMIN
/leave/calendar                 All roles
/payroll/my-payslips            All roles
/payroll/runs                   HR_ADMIN, SUPER_ADMIN
/onboarding                     HR_ADMIN, SUPER_ADMIN
/reports                        HR_ADMIN, SUPER_ADMIN
/admin/users                    SUPER_ADMIN
/admin/settings                 SUPER_ADMIN
```

All routes under `/` are wrapped in `<RequireAuth>`. Role-restricted routes additionally use `<RequireRole roles={[...]} />`.

All page components are **lazy loaded** via `React.lazy()` / Vite's `import()` to keep the initial bundle small.

---

## 4. Pages & Components

### Login
- Ant Design `Form` with email + password fields
- On submit: calls `POST /auth/login`, stores tokens, redirects to `/dashboard`
- Shows error message on 401

---

### Dashboard
**Visible to all roles. Content varies by role.**

| Role | Widgets shown |
|---|---|
| Employee | Leave balance cards, today's attendance status, upcoming holidays |
| Manager | Team leave requests pending count, team attendance summary |
| HR Admin | Headcount by dept, pending approvals count, overdue onboarding tasks |
| Super Admin | All of HR Admin + system health indicators |

Components:
- `<StatCard>` — Ant Design `Card` + `Statistic`
- `<RecentLeaveRequests>` — small table of last 5 leave actions
- `<AttendanceStatus>` — check-in / check-out button with today's status

---

### Employee Module

#### EmployeeList (`/employees`)
- Searchable, filterable table (by department, status, employment type)
- Columns: Code, Name, Department, Designation, Status, Joining Date, Actions
- HR Admin / Super Admin see **Add Employee** button
- Row click → navigates to `EmployeeDetail`
- Pagination: server-side, 20 per page

#### EmployeeDetail (`/employees/:id`)
- Tabs: Profile | Employment | Documents | History
- **Profile tab:** personal info, contact, emergency contact — editable by self (own profile) or HR Admin
- **Employment tab:** department, designation, reporting manager, salary structure (HR Admin only), employment type
- **Documents tab:** file list with upload button (AWS S3 presigned URL upload) — download via presigned URL
- **History tab:** audit trail of changes (HR Admin / Super Admin only)

#### EmployeeForm (`/employees/new` and edit)
- Ant Design `Form` with all employee fields
- Department and Designation are dependent dropdowns
- On submit: `POST /employees` or `PATCH /employees/:id`

---

### Attendance Module

#### MyAttendance (`/attendance/mine`)
- Check In / Check Out buttons (disabled if already done for today)
- Monthly calendar view showing daily status (present / absent / leave / holiday)
- Regularization request button for past dates
- Month/year selector to browse history

#### TeamAttendance (`/attendance/team`)
- Manager / HR Admin view
- Table: employee name, date range selector, attendance summary (days present, absent, on leave)
- Drill-down to individual employee's monthly records

---

### Leave Module

#### MyLeave (`/leave/mine`)
- **Balance cards:** one card per leave type showing entitled / used / remaining
- **Apply for Leave** button → opens modal with: leave type, date range picker, reason
- **My Requests table:** columns — type, from, to, days, status (colored tag), applied on
- Cancel button for PENDING requests

#### PendingApprovals (`/leave/approvals`)
- Table of pending leave requests assigned to the logged-in manager
- Columns: employee name, type, from, to, days, reason
- Approve / Reject buttons inline per row
- Bulk approve support

#### LeaveCalendar (`/leave/calendar`)
- Month view calendar
- Each day shows colored chips for employees on leave
- Holiday dates highlighted
- All roles can view (employees see team, admins see all)

---

### Payroll Module

#### MyPayslips (`/payroll/my-payslips`)
- Table: Month, Year, Gross, Deductions, Net Pay, Status (DRAFT / FINALIZED)
- Download button per row (fetches presigned S3 URL for PDF)
- Only shows FINALIZED payslips to employees; HR Admin sees all

#### PayrollRuns (`/payroll/runs`) — HR Admin / Super Admin only
- List of all payroll runs with status
- **Initiate Run** button → picks current month/year, calls `POST /payroll/runs`
- Per run actions: **Generate Payslips** → **Review** → **Finalize**
- Finalized run shows employee-wise payslip table with gross / deductions / net

---

### Onboarding Module (`/onboarding`) — HR Admin / Super Admin

- Two tabs: **Active Onboarding** | **Overdue Tasks**
- Active: table of new hires (joined in last 90 days) with task completion progress bar
- Overdue: table of tasks past due date
- **Create Task** button → modal: select employee (search), task name, assign to (employee search), due date
- Per-task actions: mark complete, reassign, update due date

---

### Reports (`/reports`) — HR Admin / Super Admin

Tabbed layout, one tab per report:

| Tab | Content |
|---|---|
| Headcount | Bar chart + table — employees by department/designation |
| Attendance | Monthly attendance summary table, filter by dept/month |
| Leave Utilization | Table — per employee leave taken vs. balance |
| Payroll Cost | Department-wise gross/net breakdown for selected month |
| Attrition | Joiners vs. leavers over selectable period |
| Onboarding Status | Per new-hire task completion status |

Each report has an **Export CSV** and **Export PDF** button.
Charts rendered with Ant Design Charts (`@ant-design/charts`) or Recharts.

---

### Admin — User Management (`/admin/users`) — Super Admin only
- Table of all employees with role column
- Inline role change dropdown
- Deactivate / reactivate account toggle
- Reset password action (sends reset email via SES)

### Admin — System Settings (`/admin/settings`) — Super Admin only
- Company name, logo upload (S3)
- Working hours configuration (start time, end time, working days)
- Holiday calendar management (add / remove holidays)
- Leave type configuration (add / edit leave types, quotas, carry-forward rules)

---

## 5. State Management

### Zustand — Auth Store (`auth.store.ts`)
Persisted to `localStorage` via `zustand/middleware/persist`.

```
{
  user: { id, role } | null
  accessToken: string | null
  refreshToken: string | null
  login(user, accessToken, refreshToken): void
  logout(): void
}
```

### React Query — Server State
All API data lives in React Query cache. Key conventions:

| Query key | Data |
|---|---|
| `['employees', filters]` | Employee list |
| `['employee', id]` | Single employee |
| `['attendance-mine', month, year]` | My attendance records |
| `['my-leave-requests']` | My leave requests |
| `['my-leave-balances']` | My leave balances |
| `['pending-approvals']` | Requests awaiting my approval |
| `['my-payslips']` | My payslips |
| `['payroll-runs']` | All payroll runs |
| `['onboarding-overdue']` | Overdue onboarding tasks |
| `['reports-headcount']` | Headcount report |

Mutations use `queryClient.invalidateQueries()` on success to keep UI fresh.

---

## 6. API Client Layer (`api/client.ts`)

```
BaseURL: /api (proxied to backend in dev via Vite, direct in prod via CloudFront)
```

- Request interceptor: attach `Authorization: Bearer <token>` from auth store
- Response interceptor: on 401, attempt silent refresh → retry → redirect to login on failure
- All API functions return typed responses using shared `types/index.ts` interfaces

---

## 7. TypeScript Types (`types/index.ts`)

Key interfaces mirroring backend responses:

```typescript
interface Employee {
  id: string; employeeCode: string; firstName: string; lastName: string;
  email: string; phone?: string; role: Role; employmentType: EmploymentType;
  status: EmployeeStatus; dateOfJoining: string;
  department?: { id: string; name: string };
  designation?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
}

interface LeaveRequest {
  id: string; leaveTypeId: string; fromDate: string; toDate: string;
  daysCount: number; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string; appliedAt: string;
  employee?: Pick<Employee, 'firstName' | 'lastName' | 'employeeCode'>;
  leaveType?: { name: string };
}

interface Payslip {
  id: string; gross: number; deductions: number; netPay: number;
  fileUrl?: string;
  payrollRun: { month: number; year: number; status: 'DRAFT' | 'FINALIZED' };
}

interface OnboardingTask {
  id: string; taskName: string; status: OnboardingTaskStatus;
  dueDate?: string;
  assignedTo?: Pick<Employee, 'firstName' | 'lastName'>;
}

type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SUPER_ADMIN';
type EmploymentType = 'FULL_TIME' | 'CONTRACT' | 'INTERN';
type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
type OnboardingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
```

---

## 8. Performance Requirements

| Requirement | Target | How |
|---|---|---|
| Initial page load | < 2s | Code splitting (lazy routes), S3+CloudFront CDN |
| Route transition | < 500ms | React Query prefetching, cached data |
| Bundle size (initial) | < 300 KB gzip | Vite tree-shaking, Ant Design modular import |
| Re-render safety | No unnecessary re-renders | React Query stale-while-revalidate, Zustand selector granularity |

---

## 9. Deployment (AWS)

| Step | What happens |
|---|---|
| `npm run build -w apps/web` | Vite outputs `apps/web/dist/` |
| GitHub Actions: `aws s3 sync dist/ s3://hr-portal-frontend-production --delete` | Uploads build to S3 |
| GitHub Actions: CloudFront invalidation on `/*` | Clears CDN cache |
| Users access via CloudFront HTTPS URL | < 50ms TTFB from India edge |

**Environment config** is injected at build time via `.env.production` (Vite reads `VITE_*` prefixed vars):
```
VITE_API_BASE_URL=https://api.hrportal.yourdomain.com
```

---

## 10. Testing Strategy

| Layer | Tool | What to test |
|---|---|---|
| Unit | Vitest | Utility functions (`format.ts`, `usePermission.ts`) |
| Component | Vitest + Testing Library | Form validation, role-gated rendering, status tag rendering |
| Integration | Vitest + MSW (Mock Service Worker) | Full page flows (apply leave, approve leave, check-in) |

Key test cases per module:
- **Auth:** Login renders, invalid credentials show error, redirect after login
- **Leave:** Apply modal validates dates, balance cards show correct remaining, approve updates status
- **Payroll:** Payslip table shows correct net pay, download button triggers presigned URL fetch
- **Role guards:** HR-only routes return 403 UI for EMPLOYEE role
