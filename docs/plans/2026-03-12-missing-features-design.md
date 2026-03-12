# HR Portal — Missing Features Design
**Date:** 2026-03-12
**Approach:** Incremental (Approach A)

---

## Summary

Four missing functionalities identified and designed for implementation:

1. **Report CSV + PDF Export** — Wire up non-functional download buttons on the Reports page
2. **Leave Type Management UI** — Admin page to create/edit leave types
3. **Salary Structure Management** — Backend API + EmployeeDetail UI tab
4. **Payroll Module** — Full backend module + frontend payroll pages + employee payslip view

---

## Feature 1 — Report CSV + PDF Export

### Problem
The Reports page (`/reports`) has PDF and CSV download buttons that render but perform no action.

### Solution
Frontend-only. No backend changes required — all data is already fetched by existing queries.

**New packages:**
- `jspdf` + `jspdf-autotable` — PDF generation with table layout

**New utilities (`src/utils/export.ts`):**
- `exportToCsv(filename: string, rows: Record<string, unknown>[])` — converts rows to CSV string, triggers browser download via `<a>` blob URL
- `exportToPdf(title: string, columns: string[], rows: unknown[][])` — creates jsPDF doc with title + autotable, triggers download

**Wiring:**
Each report tab's PDF/CSV buttons call the relevant export utility with the already-fetched data:
- **Headcount** → by-department table
- **Attendance** → summary table (present/absent/halfDay per month)
- **Leave Utilization** → balance table
- **Salary Metrics** → per-employee salary table (SUPER_ADMIN only)
- **Attrition** → summary statistics

---

## Feature 2 — Leave Type Management UI

### Problem
Backend CRUD routes already exist (`GET/POST /leave/types`, `PATCH /leave/types/:id`) but there is no admin frontend to manage leave types.

### Solution
Add a **"Leave Types"** tab to the existing `MasterDataManagement.tsx` page (alongside Departments, Designations, Companies, Locations). Tab is visible only to SUPER_ADMIN.

**UI Structure:**
- Table columns: Name | Annual Quota | Carry-Forward Limit | Paid | Actions
- "Add Leave Type" button → opens Modal with Form
- Edit icon per row → opens same Modal pre-filled
- No delete (leave types may have balance records attached)

**Form fields:**
| Field | Type | Validation |
|---|---|---|
| Name | Text | Required |
| Annual Quota (days) | Number | Required, min 1 |
| Carry-Forward Limit (days) | Number | Required, min 0 |
| Is Paid | Toggle | Default true |

**API calls:**
- `GET /leave/types` — on mount
- `POST /leave/types` — on create
- `PATCH /leave/types/:id` — on update

---

## Feature 3 — Salary Structure Management

### Problem
`SalaryStructure` model exists in the database but no backend routes or frontend UI exist to manage salary structures per employee.

### Solution

**Backend — New Payroll Module (partial, salary structures only):**

File: `src/modules/payroll/payroll.routes.js`
Routes:
- `GET /payroll/salary-structures/:employeeId` — get all salary structures for an employee (HR_ADMIN, SUPER_ADMIN only)
- `POST /payroll/salary-structures` — create a new salary structure record
- `PATCH /payroll/salary-structures/:id` — update an existing structure

File: `src/modules/payroll/payroll.service.js` (salary structure functions)
File: `src/modules/payroll/payroll.controller.js`

**Salary structure schema (aligned with existing Prisma model):**
```
{
  employeeId: string
  effectiveDate: date
  basic: Decimal
  hra: Decimal
  allowances: {
    conveyance?: number
    medical?: number
    special?: number
  }
  deductions: {
    pf?: number
    esi?: number
    tds?: number
  }
}
```

**Frontend — "Salary" tab in EmployeeDetail.tsx:**
- Visible only to HR_ADMIN / SUPER_ADMIN
- Shows a table of salary structure history sorted by `effectiveDate` desc
- "Add Salary Structure" button opens modal with form
- Edit button per row opens pre-filled modal
- Displays computed `Gross = basic + hra + sum(allowances)` and `Net = gross - sum(deductions)`

---

## Feature 4 — Payroll Module

### Problem
`PayrollRun` and `Payslip` models exist in the database but there is no backend module, routes, or frontend to create payroll runs or view payslips.

### Solution

**Backend — Payroll Module (additional routes):**

Routes added to `src/modules/payroll/payroll.routes.js`:
- `GET /payroll/runs` — list all payroll runs (HR_ADMIN, SUPER_ADMIN)
- `POST /payroll/runs` — create a payroll run for `{month, year}`; auto-generates payslips for all ACTIVE employees using their most recent SalaryStructure
- `GET /payroll/runs/:id` — get a single run with all payslips + employee details
- `PATCH /payroll/runs/:id/finalize` — change status DRAFT → FINALIZED (HR_ADMIN, SUPER_ADMIN)
- `GET /payroll/my-payslips` — authenticated employee views their own payslips

**Payslip generation logic (in service):**
```
For each ACTIVE employee:
  1. Find latest SalaryStructure where effectiveDate <= run month
  2. If none found, skip employee (no salary structure)
  3. gross = basic + hra + sum(values in allowances JSON)
  4. deductions = sum(values in deductions JSON)
  5. netPay = gross - deductions
  6. Create Payslip { payrollRunId, employeeId, gross, deductions, netPay }
```

**Frontend — New Payroll pages:**

Nav item "Payroll" added to sidebar for HR_ADMIN / SUPER_ADMIN.

| Route | Page | Access |
|---|---|---|
| `/payroll` | PayrollRuns.tsx — table of runs with Create button | HR_ADMIN, SUPER_ADMIN |
| `/payroll/:id` | PayrollRunDetail.tsx — payslip table for that run | HR_ADMIN, SUPER_ADMIN |

**PayrollRuns.tsx:**
- Table: Month | Year | Status (DRAFT/FINALIZED) | # Employees | Total Net Pay | Actions
- "Run Payroll" button → modal to pick month/year → calls `POST /payroll/runs`
- "Finalize" action per DRAFT run (with confirmation)
- "View" action → navigates to `/payroll/:id`

**PayrollRunDetail.tsx:**
- Header: Month/Year, Status, processed date
- Table: Employee | Employee Code | Department | Gross | Deductions | Net Pay
- "Finalize Run" button (if DRAFT)
- CSV/PDF export of payslip table using export utilities from Feature 1

**Employee Payslip View:**
- Add "My Payslips" tab to `EmployeeDetail.tsx` (visible when viewing own profile)
- Table: Month | Year | Gross | Deductions | Net Pay | Run Status

---

## Implementation Order

1. Feature 1: CSV + PDF export utilities + wire Reports page buttons
2. Feature 2: Leave Types tab in MasterDataManagement
3. Feature 3: Salary structure backend routes + EmployeeDetail Salary tab
4. Feature 4: Payroll runs backend + PayrollRuns + PayrollRunDetail pages + employee payslip tab

---

## Files Affected

### New files
- `sp_hr_portal_frontend/src/utils/export.ts`
- `sp_hr_portal_backend/src/modules/payroll/payroll.service.js`
- `sp_hr_portal_backend/src/modules/payroll/payroll.controller.js`
- `sp_hr_portal_backend/src/modules/payroll/payroll.routes.js`
- `sp_hr_portal_frontend/src/pages/payroll/PayrollRuns.tsx`
- `sp_hr_portal_frontend/src/pages/payroll/PayrollRunDetail.tsx`

### Modified files
- `sp_hr_portal_frontend/src/pages/reports/Reports.tsx` — wire export buttons
- `sp_hr_portal_frontend/src/pages/admin/MasterDataManagement.tsx` — add Leave Types tab
- `sp_hr_portal_frontend/src/pages/employees/EmployeeDetail.tsx` — add Salary tab + My Payslips tab
- `sp_hr_portal_frontend/src/components/Layout/AppLayout.tsx` — add Payroll nav item
- `sp_hr_portal_frontend/src/router/index.tsx` — add payroll routes
- `sp_hr_portal_backend/src/index.js` — register payroll routes
- `sp_hr_portal_frontend/package.json` — add jspdf, jspdf-autotable
