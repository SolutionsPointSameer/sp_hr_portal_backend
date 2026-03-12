# HR Portal Missing Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement four missing features: CSV/PDF report export, Leave Type management UI, Salary Structure management (backend + UI), and a full Payroll module (backend + frontend).

**Architecture:** Incremental, feature by feature. Backend payroll module follows the existing Express + Prisma + controller/service/routes pattern. Frontend uses TanStack Query v5, Ant Design v6, and a new `utils/export.ts` for client-side CSV/PDF generation.

**Tech Stack:** Node.js/Express/Prisma (backend), React 19/TypeScript/Vite/Ant Design v6/TanStack Query v5/Zustand (frontend), jsPDF + jspdf-autotable (PDF export), Jest + Supertest (backend tests)

---

## Task 1: Install jsPDF in the frontend

**Files:**
- Modify: `sp_hr_portal_frontend/package.json`

**Step 1: Install packages**

```bash
cd sp_hr_portal_frontend
npm install jspdf jspdf-autotable
```

**Step 2: Verify installation**

```bash
cat package.json | grep jspdf
```

Expected output: two lines with `jspdf` and `jspdf-autotable`.

**Step 3: Commit**

```bash
cd ..
git add sp_hr_portal_frontend/package.json sp_hr_portal_frontend/package-lock.json
git commit -m "chore: install jspdf and jspdf-autotable for report exports"
```

---

## Task 2: Create export utility

**Files:**
- Create: `sp_hr_portal_frontend/src/utils/export.ts`

**Step 1: Create the file**

```typescript
// sp_hr_portal_frontend/src/utils/export.ts

/** Download rows as a CSV file. */
export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = String(row[h] ?? '').replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Download a table as a PDF using jsPDF + autotable (lazy-loaded). */
export async function exportToPdf(
    title: string,
    columns: string[],
    rows: (string | number | null | undefined)[][]
) {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(130);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    autoTable(doc, {
        head: [columns],
        body: rows.map(r => r.map(cell => cell ?? '')),
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [224, 12, 5] },
    });
    const safeName = title.replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`${safeName}_${dateStr}.pdf`);
}
```

**Step 2: Commit**

```bash
git add sp_hr_portal_frontend/src/utils/export.ts
git commit -m "feat: add CSV and PDF export utilities"
```

---

## Task 3: Wire export buttons in Reports.tsx

**Files:**
- Modify: `sp_hr_portal_frontend/src/pages/reports/Reports.tsx`

**Step 1: Add imports and activeTab state**

At the top of `Reports.tsx`, add to existing imports:

```typescript
import { useState } from 'react';  // already imported via useMemo, add useState
import { exportToCsv, exportToPdf } from '../../utils/export';
```

Note: `useMemo` is already imported. Change the import line:
```typescript
// BEFORE:
import { useMemo } from 'react';

// AFTER:
import { useMemo, useState } from 'react';
```

**Step 2: Add activeTab state inside the component (after `const isSuperAdmin` line)**

```typescript
const [activeTab, setActiveTab] = useState('1');
```

**Step 3: Replace the static `operations` const with handler functions**

Remove the existing `operations` const and replace with:

```typescript
const handleCsvExport = () => {
    if (activeTab === '1') {
        const rows = headcountData?.byDepartment
            ? Object.entries(headcountData.byDepartment).map(([Department, Headcount]) => ({ Department, Headcount }))
            : [];
        exportToCsv('headcount_report', rows);
    } else if (activeTab === '2') {
        exportToCsv('attrition_report', [{
            Leavers: attritionData?.leavers ?? 0,
            Joiners: attritionData?.joiners ?? 0,
            'Current Active': attritionData?.currentActive ?? 0,
            'Attrition Rate': attritionData?.rate ?? '0%',
        }]);
    } else if (activeTab === '3') {
        exportToCsv('leave_utilization_report', [{
            'Total Entitled': leaveData?.totalEntitled ?? 0,
            'Total Used': leaveData?.totalUsed ?? 0,
            'Avg Taken (days)': leaveData?.avgTaken ?? 0,
        }]);
    } else if (activeTab === '5') {
        const rows = (salaryMetrics?.employees ?? []).map((e: any) => ({
            'Employee Code': e.employeeCode,
            Name: e.name,
            Department: e.department,
            Designation: e.designation ?? '-',
            'CTC (Monthly)': e.ctc,
            'In-Hand (Monthly)': e.inHandSalary,
        }));
        exportToCsv('salary_metrics_report', rows);
    }
};

const handlePdfExport = async () => {
    if (activeTab === '1') {
        const rows = headcountData?.byDepartment
            ? Object.entries(headcountData.byDepartment).map(([name, count]) => [name, count])
            : [];
        await exportToPdf('Headcount Report', ['Department', 'Headcount'], rows);
    } else if (activeTab === '2') {
        await exportToPdf('Attrition Report', ['Metric', 'Value'], [
            ['Leavers', attritionData?.leavers ?? 0],
            ['Joiners', attritionData?.joiners ?? 0],
            ['Current Active', attritionData?.currentActive ?? 0],
            ['Attrition Rate', String(attritionData?.rate ?? '0%')],
        ]);
    } else if (activeTab === '3') {
        await exportToPdf('Leave Utilization Report', ['Metric', 'Value'], [
            ['Total Entitled (days)', leaveData?.totalEntitled ?? 0],
            ['Total Used (days)', leaveData?.totalUsed ?? 0],
            ['Avg Taken (days/employee)', leaveData?.avgTaken ?? 0],
        ]);
    } else if (activeTab === '5') {
        const rows = (salaryMetrics?.employees ?? []).map((e: any) => [
            e.employeeCode, e.name, e.department, e.designation ?? '-', e.ctc, e.inHandSalary,
        ]);
        await exportToPdf('Salary Metrics Report',
            ['Code', 'Name', 'Department', 'Designation', 'CTC', 'In-Hand'],
            rows
        );
    }
};

const operations = (
    <div className="flex gap-2">
        <Button icon={<DownloadOutlined />} size="small" onClick={handlePdfExport} className="text-slate-600 border-slate-300 hover:text-slate-900">PDF</Button>
        <Button icon={<DownloadOutlined />} size="small" onClick={handleCsvExport} className="text-slate-600 border-slate-300 hover:text-slate-900">CSV</Button>
    </div>
);
```

**Step 4: Add `onChange` to the Tabs component**

```tsx
// BEFORE:
<Tabs defaultActiveKey="1" tabBarExtraContent={operations}>

// AFTER:
<Tabs defaultActiveKey="1" tabBarExtraContent={operations} onChange={setActiveTab}>
```

**Step 5: Verify the app builds without TypeScript errors**

```bash
cd sp_hr_portal_frontend
npm run build 2>&1 | tail -20
```

Expected: build completes with no TS errors.

**Step 6: Commit**

```bash
cd ..
git add sp_hr_portal_frontend/src/pages/reports/Reports.tsx
git commit -m "feat: wire CSV and PDF export buttons on Reports page"
```

---

## Task 4: Add Leave Types tab to MasterDataManagement.tsx

**Files:**
- Modify: `sp_hr_portal_frontend/src/pages/admin/MasterDataManagement.tsx`

**Step 1: Add `LeaveType` interface and state after existing interfaces**

After the `Location` interface (line ~30), add:

```typescript
interface LeaveType {
    id: string;
    name: string;
    annualQuota: number;
    carryForwardLimit: number;
    isPaid: boolean;
}
```

**Step 2: Add state variables inside the component after `locationForm`**

```typescript
const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);
const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
const [leaveTypeForm] = Form.useForm();
```

**Step 3: Add `Switch` to the antd import at the top**

```typescript
// BEFORE:
import { Typography, Card, Table, Button, Tabs, Modal, Form, Input, InputNumber, Select, message, Space } from 'antd';

// AFTER:
import { Typography, Card, Table, Button, Tabs, Modal, Form, Input, InputNumber, Select, Switch, message, Space } from 'antd';
```

**Step 4: Add fetch and handler functions after `openEditLocationModal`**

```typescript
const fetchLeaveTypes = async () => {
    setLoadingLeaveTypes(true);
    try {
        const res = await apiClient.get('/leave/types');
        setLeaveTypes(res.data);
    } catch {
        message.error('Failed to load leave types');
    } finally {
        setLoadingLeaveTypes(false);
    }
};

const handleLeaveTypeSubmit = async (values: any) => {
    try {
        if (editingLeaveType) {
            await apiClient.patch(`/leave/types/${editingLeaveType.id}`, values);
            message.success('Leave type updated successfully');
        } else {
            await apiClient.post('/leave/types', values);
            message.success('Leave type added successfully');
        }
        setIsLeaveTypeModalOpen(false);
        leaveTypeForm.resetFields();
        setEditingLeaveType(null);
        fetchLeaveTypes();
    } catch (error: any) {
        message.error(error.response?.data?.error || 'Failed to save leave type');
    }
};

const openEditLeaveTypeModal = (record: LeaveType) => {
    setEditingLeaveType(record);
    leaveTypeForm.setFieldsValue({
        name: record.name,
        annualQuota: record.annualQuota,
        carryForwardLimit: record.carryForwardLimit,
        isPaid: record.isPaid,
    });
    setIsLeaveTypeModalOpen(true);
};

const leaveTypeColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', className: 'font-medium' },
    { title: 'Annual Quota (days)', dataIndex: 'annualQuota', key: 'annualQuota' },
    { title: 'Carry-Forward Limit', dataIndex: 'carryForwardLimit', key: 'carryForwardLimit' },
    {
        title: 'Paid Leave',
        dataIndex: 'isPaid',
        key: 'isPaid',
        render: (v: boolean) => v ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-slate-400">No</span>,
    },
    {
        title: 'Actions',
        key: 'actions',
        width: 150,
        render: (_: any, record: LeaveType) => (
            <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEditLeaveTypeModal(record)}>Edit</Button>
            </Space>
        ),
    },
];
```

**Step 5: Add `fetchLeaveTypes()` to the `useEffect` call**

```typescript
// BEFORE:
useEffect(() => {
    fetchDepartments();
    fetchDesignations();
    fetchCompanies();
    fetchLocations();
}, []);

// AFTER:
useEffect(() => {
    fetchDepartments();
    fetchDesignations();
    fetchCompanies();
    fetchLocations();
    fetchLeaveTypes();
}, []);
```

**Step 6: Add Leave Types TabPane inside the `<Tabs>` after the Locations TabPane (before closing `</Tabs>`)**

```tsx
<Tabs.TabPane tab="Leave Types" key="leave-types">
    <div className="flex justify-end mb-4">
        <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
                setEditingLeaveType(null);
                leaveTypeForm.resetFields();
                leaveTypeForm.setFieldsValue({ isPaid: true, carryForwardLimit: 0, annualQuota: 1 });
                setIsLeaveTypeModalOpen(true);
            }}
        >
            Add Leave Type
        </Button>
    </div>
    <Table
        columns={leaveTypeColumns}
        dataSource={leaveTypes}
        rowKey="id"
        loading={loadingLeaveTypes}
        pagination={false}
        className="custom-table border border-slate-200 rounded-lg"
    />
</Tabs.TabPane>
```

**Step 7: Add Leave Type Modal after the Location Modal (before the closing `</div>`)**

```tsx
{/* Leave Type Modal */}
<Modal
    title={editingLeaveType ? "Edit Leave Type" : "Add New Leave Type"}
    open={isLeaveTypeModalOpen}
    onCancel={() => setIsLeaveTypeModalOpen(false)}
    footer={null}
>
    <Form
        form={leaveTypeForm}
        layout="vertical"
        onFinish={handleLeaveTypeSubmit}
        className="mt-4"
        initialValues={{ isPaid: true, carryForwardLimit: 0, annualQuota: 1 }}
    >
        <Form.Item
            name="name"
            label="Leave Type Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
        >
            <Input placeholder="e.g. Casual Leave" />
        </Form.Item>
        <Form.Item
            name="annualQuota"
            label="Annual Quota (days)"
            rules={[{ required: true, message: 'Please enter annual quota' }]}
        >
            <InputNumber className="w-full" min={1} placeholder="e.g. 12" />
        </Form.Item>
        <Form.Item
            name="carryForwardLimit"
            label="Carry-Forward Limit (days)"
            rules={[{ required: true, message: 'Please enter carry-forward limit' }]}
        >
            <InputNumber className="w-full" min={0} placeholder="0 = no carry-forward" />
        </Form.Item>
        <Form.Item name="isPaid" label="Paid Leave" valuePropName="checked">
            <Switch />
        </Form.Item>
        <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsLeaveTypeModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
        </div>
    </Form>
</Modal>
```

**Step 8: Build and commit**

```bash
cd sp_hr_portal_frontend && npm run build 2>&1 | tail -10
cd ..
git add sp_hr_portal_frontend/src/pages/admin/MasterDataManagement.tsx
git commit -m "feat: add Leave Types tab to MasterDataManagement page"
```

---

## Task 5: Create backend payroll module — service

**Files:**
- Create: `sp_hr_portal_backend/src/modules/payroll/payroll.service.js`

**Step 1: Create the file**

```javascript
// sp_hr_portal_backend/src/modules/payroll/payroll.service.js
const { prisma } = require("../../lib/prisma");

// ── Salary Structures ─────────────────────────────────────────────────────────

async function getSalaryStructures(employeeId) {
  return prisma.salaryStructure.findMany({
    where: { employeeId },
    orderBy: { effectiveDate: "desc" },
  });
}

async function createSalaryStructure(data) {
  return prisma.salaryStructure.create({
    data: {
      employeeId: data.employeeId,
      effectiveDate: new Date(data.effectiveDate),
      basic: data.basic,
      hra: data.hra,
      allowances: data.allowances ?? {},
      deductions: data.deductions ?? {},
    },
  });
}

async function updateSalaryStructure(id, data) {
  const update = {};
  if (data.effectiveDate) update.effectiveDate = new Date(data.effectiveDate);
  if (data.basic !== undefined) update.basic = data.basic;
  if (data.hra !== undefined) update.hra = data.hra;
  if (data.allowances !== undefined) update.allowances = data.allowances;
  if (data.deductions !== undefined) update.deductions = data.deductions;
  return prisma.salaryStructure.update({ where: { id }, data: update });
}

// ── Payroll Runs ──────────────────────────────────────────────────────────────

async function listPayrollRuns() {
  const runs = await prisma.payrollRun.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      _count: { select: { payslips: true } },
      payslips: { select: { netPay: true } },
    },
  });
  return runs.map((run) => ({
    ...run,
    totalNetPay: run.payslips.reduce((s, p) => s + Number(p.netPay), 0),
    employeeCount: run._count.payslips,
    payslips: undefined,
    _count: undefined,
  }));
}

async function createPayrollRun({ month, year }, processedById) {
  const existing = await prisma.payrollRun.findUnique({
    where: { month_year: { month, year } },
  });
  if (existing) {
    throw { status: 409, message: `Payroll run for ${month}/${year} already exists` };
  }

  // Cutoff: the last day of the payroll month (salary structures effective on or before this)
  const cutoffDate = new Date(year, month, 0); // last day of month

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const run = await prisma.$transaction(async (tx) => {
    const newRun = await tx.payrollRun.create({
      data: { month, year, processedById, status: "DRAFT" },
    });

    for (const emp of employees) {
      const struct = await tx.salaryStructure.findFirst({
        where: { employeeId: emp.id, effectiveDate: { lte: cutoffDate } },
        orderBy: { effectiveDate: "desc" },
      });
      if (!struct) continue;

      const allowances = struct.allowances ?? {};
      const deductions = struct.deductions ?? {};
      const grossAllowances = Object.values(allowances).reduce((s, v) => s + Number(v || 0), 0);
      const gross = Number(struct.basic) + Number(struct.hra) + grossAllowances;
      const totalDeductions = Object.values(deductions).reduce((s, v) => s + Number(v || 0), 0);
      const netPay = gross - totalDeductions;

      await tx.payslip.create({
        data: { payrollRunId: newRun.id, employeeId: emp.id, gross, deductions: totalDeductions, netPay },
      });
    }

    return newRun;
  });

  return prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: { _count: { select: { payslips: true } } },
  });
}

async function getPayrollRun(id) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true } },
              designation: { select: { name: true } },
            },
          },
        },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
  });
  if (!run) throw { status: 404, message: "Payroll run not found" };
  return run;
}

async function finalizePayrollRun(id) {
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) throw { status: 404, message: "Payroll run not found" };
  if (run.status === "FINALIZED") throw { status: 400, message: "Already finalized" };
  return prisma.payrollRun.update({ where: { id }, data: { status: "FINALIZED" } });
}

async function getMyPayslips(employeeId) {
  return prisma.payslip.findMany({
    where: { employeeId },
    include: {
      payrollRun: { select: { month: true, year: true, status: true } },
    },
    orderBy: [
      { payrollRun: { year: "desc" } },
      { payrollRun: { month: "desc" } },
    ],
  });
}

module.exports = {
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  listPayrollRuns,
  createPayrollRun,
  getPayrollRun,
  finalizePayrollRun,
  getMyPayslips,
};
```

---

## Task 6: Create backend payroll module — controller and routes

**Files:**
- Create: `sp_hr_portal_backend/src/modules/payroll/payroll.controller.js`
- Create: `sp_hr_portal_backend/src/modules/payroll/payroll.routes.js`

**Step 1: Create controller**

```javascript
// sp_hr_portal_backend/src/modules/payroll/payroll.controller.js
const service = require("./payroll.service");

async function getSalaryStructures(req, res, next) {
  try { res.json(await service.getSalaryStructures(req.params.employeeId)); }
  catch (err) { next(err); }
}

async function createSalaryStructure(req, res, next) {
  try { res.status(201).json(await service.createSalaryStructure(req.body)); }
  catch (err) { next(err); }
}

async function updateSalaryStructure(req, res, next) {
  try { res.json(await service.updateSalaryStructure(req.params.id, req.body)); }
  catch (err) { next(err); }
}

async function listPayrollRuns(req, res, next) {
  try { res.json(await service.listPayrollRuns()); }
  catch (err) { next(err); }
}

async function createPayrollRun(req, res, next) {
  try {
    const { month, year } = req.body;
    res.status(201).json(await service.createPayrollRun(
      { month: Number(month), year: Number(year) },
      req.user.id
    ));
  } catch (err) { next(err); }
}

async function getPayrollRun(req, res, next) {
  try { res.json(await service.getPayrollRun(req.params.id)); }
  catch (err) { next(err); }
}

async function finalizePayrollRun(req, res, next) {
  try { res.json(await service.finalizePayrollRun(req.params.id)); }
  catch (err) { next(err); }
}

async function getMyPayslips(req, res, next) {
  try { res.json(await service.getMyPayslips(req.user.id)); }
  catch (err) { next(err); }
}

module.exports = {
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  listPayrollRuns,
  createPayrollRun,
  getPayrollRun,
  finalizePayrollRun,
  getMyPayslips,
};
```

**Step 2: Create routes**

```javascript
// sp_hr_portal_backend/src/modules/payroll/payroll.routes.js
const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./payroll.controller");

const router = express.Router();
router.use(authenticate);

// Salary structures (HR/Admin only)
router.get("/salary-structures/:employeeId", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getSalaryStructures);
router.post("/salary-structures", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.createSalaryStructure);
router.patch("/salary-structures/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.updateSalaryStructure);

// Payroll runs (HR/Admin only)
router.get("/runs", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.listPayrollRuns);
router.post("/runs", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.createPayrollRun);
router.get("/runs/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getPayrollRun);
router.patch("/runs/:id/finalize", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.finalizePayrollRun);

// My payslips (any authenticated employee)
router.get("/my-payslips", ctrl.getMyPayslips);

module.exports = router;
```

**Step 3: Register in index.js**

In `sp_hr_portal_backend/src/index.js`, add after the last existing `require`:

```javascript
const payrollRoutes = require("./modules/payroll/payroll.routes");
```

And add after `app.use("/settings", settingsRoutes);`:

```javascript
app.use("/payroll", payrollRoutes);
```

**Step 4: Commit**

```bash
git add sp_hr_portal_backend/src/modules/payroll/ sp_hr_portal_backend/src/index.js
git commit -m "feat: add payroll backend module (salary structures + payroll runs)"
```

---

## Task 7: Write payroll service tests

**Files:**
- Create: `sp_hr_portal_backend/src/__tests__/payroll.service.test.js`

**Step 1: Create the test file**

```javascript
// sp_hr_portal_backend/src/__tests__/payroll.service.test.js
jest.mock("../../lib/prisma", () => ({
  prisma: {
    salaryStructure: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    payrollRun: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payslip: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { prisma } = require("../../lib/prisma");
const service = require("../../modules/payroll/payroll.service");

afterEach(() => jest.clearAllMocks());

describe("getSalaryStructures", () => {
  it("returns structures for an employee ordered by effectiveDate desc", async () => {
    const mock = [{ id: "s1", basic: 50000 }];
    prisma.salaryStructure.findMany.mockResolvedValue(mock);
    const result = await service.getSalaryStructures("emp-1");
    expect(result).toEqual(mock);
    expect(prisma.salaryStructure.findMany).toHaveBeenCalledWith({
      where: { employeeId: "emp-1" },
      orderBy: { effectiveDate: "desc" },
    });
  });
});

describe("createSalaryStructure", () => {
  it("creates a salary structure with correct data", async () => {
    const input = { employeeId: "emp-1", effectiveDate: "2025-01-01", basic: 50000, hra: 20000 };
    prisma.salaryStructure.create.mockResolvedValue({ id: "s1", ...input });
    const result = await service.createSalaryStructure(input);
    expect(result.id).toBe("s1");
    expect(prisma.salaryStructure.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ employeeId: "emp-1", basic: 50000 }) })
    );
  });
});

describe("finalizePayrollRun", () => {
  it("throws 404 when run not found", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue(null);
    await expect(service.finalizePayrollRun("nonexistent")).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 when run is already FINALIZED", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({ id: "r1", status: "FINALIZED" });
    await expect(service.finalizePayrollRun("r1")).rejects.toMatchObject({ status: 400 });
  });

  it("updates status to FINALIZED for a DRAFT run", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({ id: "r1", status: "DRAFT" });
    prisma.payrollRun.update.mockResolvedValue({ id: "r1", status: "FINALIZED" });
    const result = await service.finalizePayrollRun("r1");
    expect(result.status).toBe("FINALIZED");
    expect(prisma.payrollRun.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "FINALIZED" },
    });
  });
});

describe("getMyPayslips", () => {
  it("returns payslips ordered by year/month desc", async () => {
    const mock = [{ id: "p1", netPay: 45000, payrollRun: { month: 3, year: 2026, status: "FINALIZED" } }];
    prisma.payslip.findMany.mockResolvedValue(mock);
    const result = await service.getMyPayslips("emp-1");
    expect(result).toEqual(mock);
    expect(prisma.payslip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: "emp-1" } })
    );
  });
});

describe("getPayrollRun", () => {
  it("throws 404 when run not found", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue(null);
    await expect(service.getPayrollRun("nonexistent")).rejects.toMatchObject({ status: 404 });
  });

  it("returns run with payslips", async () => {
    const mock = { id: "r1", month: 3, year: 2026, payslips: [] };
    prisma.payrollRun.findUnique.mockResolvedValue(mock);
    const result = await service.getPayrollRun("r1");
    expect(result).toEqual(mock);
  });
});
```

**Step 2: Run the tests**

```bash
cd sp_hr_portal_backend
npm test -- --testPathPattern="payroll" 2>&1
```

Expected: All 7 tests pass.

**Step 3: Commit**

```bash
cd ..
git add sp_hr_portal_backend/src/__tests__/payroll.service.test.js
git commit -m "test: add payroll service unit tests"
```

---

## Task 8: Add Salary tab to EmployeeDetail.tsx

**Files:**
- Modify: `sp_hr_portal_frontend/src/pages/employees/EmployeeDetail.tsx`

**Step 1: Add `DatePicker` to antd imports at the top of EmployeeDetail.tsx**

```typescript
// BEFORE:
import { Descriptions, Card, Tabs, Tag, Button, Typography, Avatar, Spin, message, Modal, Form, InputNumber, Table } from 'antd';

// AFTER:
import { Descriptions, Card, Tabs, Tag, Button, Typography, Avatar, Spin, message, Modal, Form, InputNumber, Input, DatePicker, Table } from 'antd';
```

**Step 2: Add Salary tab after the Leave Balances tab (after line ~192)**

Inside the `<Tabs>` in the `return` statement, add after the existing Leave Balances `Tabs.TabPane`:

```tsx
{canEdit && (
    <Tabs.TabPane tab="Salary Structure" key="5">
        <div className="py-4">
            <EmployeeSalaryStructures employeeId={id!} />
        </div>
    </Tabs.TabPane>
)}
{user?.id === id && (
    <Tabs.TabPane tab="My Payslips" key="6">
        <div className="py-4">
            <MyPayslips />
        </div>
    </Tabs.TabPane>
)}
```

**Step 3: Add `EmployeeSalaryStructures` component at the bottom of the file (after `EmployeeLeaveBalances`)**

```tsx
function EmployeeSalaryStructures({ employeeId }: { employeeId: string }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: structures = [], isLoading } = useQuery({
        queryKey: ['salary-structures', employeeId],
        queryFn: async () => {
            const res = await apiClient.get(`/payroll/salary-structures/${employeeId}`);
            return res.data;
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (values: any) => {
            const payload = {
                ...values,
                employeeId,
                effectiveDate: values.effectiveDate?.format('YYYY-MM-DD'),
                allowances: {
                    conveyance: values.conveyance ?? 0,
                    medical: values.medical ?? 0,
                    special: values.special ?? 0,
                },
                deductions: {
                    pf: values.pf ?? 0,
                    esi: values.esi ?? 0,
                    tds: values.tds ?? 0,
                },
            };
            if (editingId) {
                return apiClient.patch(`/payroll/salary-structures/${editingId}`, payload);
            }
            return apiClient.post('/payroll/salary-structures', payload);
        },
        onSuccess: () => {
            message.success(editingId ? 'Salary structure updated' : 'Salary structure added');
            queryClient.invalidateQueries({ queryKey: ['salary-structures', employeeId] });
            setIsModalVisible(false);
            setEditingId(null);
            form.resetFields();
        },
        onError: () => message.error('Failed to save salary structure'),
    });

    const openModal = (record?: any) => {
        if (record) {
            setEditingId(record.id);
            form.setFieldsValue({
                basic: Number(record.basic),
                hra: Number(record.hra),
                conveyance: record.allowances?.conveyance ?? 0,
                medical: record.allowances?.medical ?? 0,
                special: record.allowances?.special ?? 0,
                pf: record.deductions?.pf ?? 0,
                esi: record.deductions?.esi ?? 0,
                tds: record.deductions?.tds ?? 0,
            });
        } else {
            setEditingId(null);
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const columns = [
        {
            title: 'Effective From',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
        },
        {
            title: 'Basic',
            dataIndex: 'basic',
            key: 'basic',
            render: (v: number) => formatINR(Number(v)),
        },
        {
            title: 'HRA',
            dataIndex: 'hra',
            key: 'hra',
            render: (v: number) => formatINR(Number(v)),
        },
        {
            title: 'Gross',
            key: 'gross',
            render: (_: any, r: any) => {
                const allowances = Object.values(r.allowances ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                return formatINR(Number(r.basic) + Number(r.hra) + allowances);
            },
        },
        {
            title: 'Deductions',
            key: 'deductions',
            render: (_: any, r: any) => {
                const ded = Object.values(r.deductions ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                return <span className="text-red-600">{formatINR(ded)}</span>;
            },
        },
        {
            title: 'Net Pay',
            key: 'netPay',
            render: (_: any, r: any) => {
                const allowances = Object.values(r.allowances ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                const ded = Object.values(r.deductions ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                const net = Number(r.basic) + Number(r.hra) + allowances - ded;
                return <span className="text-green-700 font-semibold">{formatINR(net)}</span>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>Edit</Button>
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button type="primary" onClick={() => openModal()}>Add Salary Structure</Button>
            </div>
            {isLoading ? (
                <div className="flex justify-center p-8"><Spin /></div>
            ) : structures.length === 0 ? (
                <div className="text-slate-500 italic">No salary structure defined yet.</div>
            ) : (
                <Table
                    columns={columns}
                    dataSource={structures}
                    rowKey="id"
                    pagination={false}
                    className="custom-table border border-slate-200 rounded-lg"
                />
            )}

            <Modal
                title={editingId ? 'Edit Salary Structure' : 'Add Salary Structure'}
                open={isModalVisible}
                onCancel={() => { setIsModalVisible(false); form.resetFields(); setEditingId(null); }}
                onOk={() => form.submit()}
                confirmLoading={saveMutation.isPending}
            >
                <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} className="mt-4">
                    {!editingId && (
                        <Form.Item name="effectiveDate" label="Effective From" rules={[{ required: true }]}>
                            <DatePicker className="w-full" />
                        </Form.Item>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Form.Item name="basic" label="Basic (₹/mo)" rules={[{ required: true }]}>
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="hra" label="HRA (₹/mo)" rules={[{ required: true }]}>
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Allowances</div>
                    <div className="grid grid-cols-3 gap-3">
                        <Form.Item name="conveyance" label="Conveyance">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="medical" label="Medical">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="special" label="Special">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Deductions</div>
                    <div className="grid grid-cols-3 gap-3">
                        <Form.Item name="pf" label="PF">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="esi" label="ESI">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="tds" label="TDS">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
```

**Step 4: Add `MyPayslips` component at the bottom of the file**

```tsx
function MyPayslips() {
    const { data: payslips = [], isLoading } = useQuery({
        queryKey: ['my-payslips'],
        queryFn: async () => {
            const res = await apiClient.get('/payroll/my-payslips');
            return res.data;
        },
    });

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const columns = [
        {
            title: 'Period',
            key: 'period',
            render: (_: any, r: any) => `${MONTHS[r.payrollRun.month]} ${r.payrollRun.year}`,
        },
        {
            title: 'Gross',
            dataIndex: 'gross',
            render: (v: number) => formatINR(Number(v)),
        },
        {
            title: 'Deductions',
            dataIndex: 'deductions',
            render: (v: number) => <span className="text-red-600">{formatINR(Number(v))}</span>,
        },
        {
            title: 'Net Pay',
            dataIndex: 'netPay',
            render: (v: number) => <span className="text-green-700 font-semibold">{formatINR(Number(v))}</span>,
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, r: any) => (
                <Tag color={r.payrollRun.status === 'FINALIZED' ? 'success' : 'warning'}>
                    {r.payrollRun.status}
                </Tag>
            ),
        },
    ];

    if (isLoading) return <div className="flex justify-center p-8"><Spin /></div>;
    if (payslips.length === 0) return <div className="text-slate-500 italic">No payslips available yet.</div>;

    return (
        <Table
            columns={columns}
            dataSource={payslips}
            rowKey="id"
            pagination={{ pageSize: 12 }}
            className="custom-table border border-slate-200 rounded-lg"
        />
    );
}
```

**Note:** The `EditOutlined` icon is already imported at the top of `EmployeeDetail.tsx`.

**Step 5: Build and commit**

```bash
cd sp_hr_portal_frontend && npm run build 2>&1 | tail -10
cd ..
git add sp_hr_portal_frontend/src/pages/employees/EmployeeDetail.tsx
git commit -m "feat: add Salary Structure and My Payslips tabs to EmployeeDetail"
```

---

## Task 9: Create PayrollRuns frontend page

**Files:**
- Create: `sp_hr_portal_frontend/src/pages/payroll/PayrollRuns.tsx`

**Step 1: Create the file**

```tsx
// sp_hr_portal_frontend/src/pages/payroll/PayrollRuns.tsx
import { Typography, Card, Table, Button, Tag, Modal, Form, Select, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const MONTHS = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
    { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
    { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({ label: String(currentYear - i), value: currentYear - i }));

export default function PayrollRuns() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = Modal.useModal ? [false, () => {}] : [false, () => {}];
    const [modalVisible, setModalVisible] = Form.useForm ? [false, () => {}] as any : [false, () => {}];

    // Use useState directly
    const [open, setOpen] = Form.useForm ? [false, () => {}] as any : [false, () => {}];

    const { data: runs = [], isLoading } = useQuery({
        queryKey: ['payroll', 'runs'],
        queryFn: async () => {
            const res = await apiClient.get('/payroll/runs');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => apiClient.post('/payroll/runs', values),
        onSuccess: () => {
            message.success('Payroll run created');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            form.resetFields();
        },
        onError: (err: any) => message.error(err.response?.data?.error || 'Failed to create payroll run'),
    });

    const finalizeMutation = useMutation({
        mutationFn: async (id: string) => apiClient.patch(`/payroll/runs/${id}/finalize`),
        onSuccess: () => {
            message.success('Payroll run finalized');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
        },
        onError: () => message.error('Failed to finalize run'),
    });

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const monthName = (m: number) => MONTHS.find(x => x.value === m)?.label ?? String(m);

    const columns = [
        {
            title: 'Period',
            key: 'period',
            render: (_: any, r: any) => <span className="font-medium">{monthName(r.month)} {r.year}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => <Tag color={s === 'FINALIZED' ? 'success' : 'warning'}>{s}</Tag>,
        },
        {
            title: 'Employees',
            dataIndex: 'employeeCount',
            render: (v: number) => v ?? '-',
        },
        {
            title: 'Total Net Pay',
            dataIndex: 'totalNetPay',
            render: (v: number) => <span className="font-mono">{v !== undefined ? formatINR(v) : '-'}</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, r: any) => (
                <div className="flex gap-2">
                    <Button size="small" onClick={() => navigate(`/payroll/${r.id}`)}>View</Button>
                    {r.status === 'DRAFT' && (
                        <Popconfirm
                            title="Finalize this payroll run?"
                            description="This cannot be undone. Payslips will be locked."
                            onConfirm={() => finalizeMutation.mutate(r.id)}
                            okText="Finalize"
                            okType="danger"
                        >
                            <Button size="small" danger loading={finalizeMutation.isPending}>Finalize</Button>
                        </Popconfirm>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <Title level={3} className="!mb-1">Payroll</Title>
                    <Text className="text-slate-500">Manage monthly payroll runs and payslips.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => form.resetFields() || setModalOpen(true)}>
                    Run Payroll
                </Button>
            </div>

            <Card bordered={false} className="shadow-sm">
                <Table
                    columns={columns}
                    dataSource={runs}
                    rowKey="id"
                    loading={isLoading}
                    pagination={false}
                    className="custom-table"
                />
            </Card>

            <Modal
                title="Create Payroll Run"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createMutation.isPending}
                okText="Generate Payslips"
            >
                <Form form={form} layout="vertical" onFinish={(v) => { createMutation.mutate(v); setModalOpen(false); }} className="mt-4">
                    <Form.Item name="month" label="Month" rules={[{ required: true }]}>
                        <Select options={MONTHS} placeholder="Select month" />
                    </Form.Item>
                    <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                        <Select options={YEARS} placeholder="Select year" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
```

**Important:** The above snippet uses `modalOpen`/`setModalOpen` state that needs to be added. Replace the broken placeholder lines with proper `useState`:

The full corrected component uses `useState` at the top:

```tsx
import { useState } from 'react';

// Inside component:
const [modalOpen, setModalOpen] = useState(false);
```

Remove the broken `[open, setOpen]` / `[modalVisible...]` lines. The final file should use only:
```tsx
const [modalOpen, setModalOpen] = useState(false);
```

And the button onClick:
```tsx
onClick={() => { form.resetFields(); setModalOpen(true); }}
```

**Step 2: Build to verify no TS errors**

```bash
cd sp_hr_portal_frontend && npm run build 2>&1 | tail -10
```

**Step 3: Commit**

```bash
cd ..
git add sp_hr_portal_frontend/src/pages/payroll/PayrollRuns.tsx
git commit -m "feat: add PayrollRuns frontend page"
```

---

## Task 10: Create PayrollRunDetail frontend page

**Files:**
- Create: `sp_hr_portal_frontend/src/pages/payroll/PayrollRunDetail.tsx`

**Step 1: Create the file**

```tsx
// sp_hr_portal_frontend/src/pages/payroll/PayrollRunDetail.tsx
import { useState } from 'react';
import { Typography, Card, Table, Tag, Button, Spin, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { exportToCsv, exportToPdf } from '../../utils/export';

const { Title, Text } = Typography;

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayrollRunDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: run, isLoading } = useQuery({
        queryKey: ['payroll', 'run', id],
        queryFn: async () => {
            const res = await apiClient.get(`/payroll/runs/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    const finalizeMutation = useMutation({
        mutationFn: async () => apiClient.patch(`/payroll/runs/${id}/finalize`),
        onSuccess: () => {
            message.success('Payroll run finalized');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'run', id] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
        },
        onError: () => message.error('Failed to finalize'),
    });

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v) || 0);

    const handleCsvExport = () => {
        const rows = (run?.payslips ?? []).map((p: any) => ({
            'Employee Code': p.employee.employeeCode,
            'Name': `${p.employee.firstName} ${p.employee.lastName}`,
            'Department': p.employee.department?.name ?? '-',
            'Designation': p.employee.designation?.name ?? '-',
            'Gross': Number(p.gross),
            'Deductions': Number(p.deductions),
            'Net Pay': Number(p.netPay),
        }));
        exportToCsv(`payroll_${run?.month}_${run?.year}`, rows);
    };

    const handlePdfExport = async () => {
        const rows = (run?.payslips ?? []).map((p: any) => [
            p.employee.employeeCode,
            `${p.employee.firstName} ${p.employee.lastName}`,
            p.employee.department?.name ?? '-',
            Number(p.gross),
            Number(p.deductions),
            Number(p.netPay),
        ]);
        await exportToPdf(
            `Payroll ${MONTHS[run?.month]} ${run?.year}`,
            ['Code', 'Name', 'Department', 'Gross', 'Deductions', 'Net Pay'],
            rows
        );
    };

    const columns = [
        {
            title: 'Employee',
            key: 'employee',
            render: (_: any, r: any) => (
                <div>
                    <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                    <div className="text-xs text-slate-400 font-mono">{r.employee.employeeCode}</div>
                </div>
            ),
        },
        {
            title: 'Department',
            key: 'dept',
            render: (_: any, r: any) => r.employee.department?.name ?? '-',
        },
        {
            title: 'Gross',
            dataIndex: 'gross',
            render: (v: number) => formatINR(v),
        },
        {
            title: 'Deductions',
            dataIndex: 'deductions',
            render: (v: number) => <span className="text-red-600">{formatINR(v)}</span>,
        },
        {
            title: 'Net Pay',
            dataIndex: 'netPay',
            render: (v: number) => <span className="text-green-700 font-semibold">{formatINR(v)}</span>,
        },
    ];

    if (isLoading) return <div className="flex justify-center p-12"><Spin size="large" /></div>;
    if (!run) return <div className="p-12 text-center text-slate-500">Payroll run not found.</div>;

    const totalNet = (run.payslips ?? []).reduce((s: number, p: any) => s + Number(p.netPay), 0);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div className="flex items-center gap-3">
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/payroll')} className="text-slate-500">
                        Back
                    </Button>
                    <div>
                        <Title level={3} className="!mb-0">{MONTHS[run.month]} {run.year} Payroll</Title>
                        <Text className="text-slate-500">{run.payslips?.length ?? 0} employees &bull; Total Net Pay: {formatINR(totalNet)}</Text>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Tag color={run.status === 'FINALIZED' ? 'success' : 'warning'} className="text-sm px-3 py-1">{run.status}</Tag>
                    <Button icon={<DownloadOutlined />} onClick={handlePdfExport}>PDF</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleCsvExport}>CSV</Button>
                    {run.status === 'DRAFT' && (
                        <Popconfirm
                            title="Finalize this payroll run?"
                            description="Payslips will be locked and visible to employees."
                            onConfirm={() => finalizeMutation.mutate()}
                            okText="Finalize"
                            okType="danger"
                        >
                            <Button type="primary" danger loading={finalizeMutation.isPending}>Finalize Run</Button>
                        </Popconfirm>
                    )}
                </div>
            </div>

            <Card bordered={false} className="shadow-sm">
                <Table
                    columns={columns}
                    dataSource={run.payslips ?? []}
                    rowKey="id"
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    className="custom-table"
                />
            </Card>
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add sp_hr_portal_frontend/src/pages/payroll/PayrollRunDetail.tsx
git commit -m "feat: add PayrollRunDetail frontend page"
```

---

## Task 11: Wire router and navigation for payroll

**Files:**
- Modify: `sp_hr_portal_frontend/src/router/index.tsx`
- Modify: `sp_hr_portal_frontend/src/components/Layout/AppLayout.tsx`

**Step 1: Add payroll imports and routes to `router/index.tsx`**

Add lazy imports after the existing lazy imports:

```typescript
const PayrollRuns = lazy(() => import('../pages/payroll/PayrollRuns'));
const PayrollRunDetail = lazy(() => import('../pages/payroll/PayrollRunDetail'));
```

Add payroll routes inside the authenticated children array (after the `reports` route block):

```typescript
// Payroll Routes
{
    path: 'payroll',
    element: <RequireRole roles={['HR_ADMIN', 'SUPER_ADMIN']} />,
    children: [
        { path: '', element: <PayrollRuns /> },
        { path: ':id', element: <PayrollRunDetail /> },
    ]
},
```

**Step 2: Add payroll nav item to `AppLayout.tsx`**

First, add `DollarOutlined` to the icon imports:

```typescript
// BEFORE:
import { ..., BarChartOutlined } from '@ant-design/icons';

// AFTER:
import { ..., BarChartOutlined, DollarOutlined } from '@ant-design/icons';
```

Then add the Payroll nav item after the Reports nav item (inside `getMenuItems()`):

```typescript
// After the Reports items.push block:
if (user?.role && ['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    items.push({
        key: '/payroll',
        icon: <DollarOutlined />,
        label: 'Payroll',
    });
}
```

**Step 3: Build and verify**

```bash
cd sp_hr_portal_frontend && npm run build 2>&1 | tail -10
```

Expected: successful build, no TypeScript errors.

**Step 4: Commit**

```bash
cd ..
git add sp_hr_portal_frontend/src/router/index.tsx sp_hr_portal_frontend/src/components/Layout/AppLayout.tsx
git commit -m "feat: add payroll routes and nav link to sidebar"
```

---

## Task 12: Run all backend tests and verify

**Step 1: Run the full test suite**

```bash
cd sp_hr_portal_backend
npm test 2>&1
```

Expected output: All tests pass. No failures. You should see the existing JWT tests + the new payroll service tests all pass.

**Step 2: If any test fails, read the error, fix the code, and re-run**

Common issues:
- Mock path mismatch: ensure `jest.mock("../../lib/prisma", ...)` path is correct relative to the test file at `src/__tests__/payroll.service.test.js`
- The service file path in `require("../../modules/payroll/payroll.service")` should be correct from `src/__tests__/`

**Step 3: Final build check**

```bash
cd ../sp_hr_portal_frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs` with no errors.

**Step 4: Final commit if needed**

```bash
cd ..
git add -A
git status  # verify only expected files
git commit -m "feat: complete HR portal missing features implementation"
```

---

## Summary of changes

| Feature | Files changed |
|---|---|
| CSV/PDF Export | `frontend/src/utils/export.ts` (new), `frontend/src/pages/reports/Reports.tsx` (modified) |
| Leave Types UI | `frontend/src/pages/admin/MasterDataManagement.tsx` (modified) |
| Salary Structures | `backend/src/modules/payroll/payroll.service.js` (new), `backend/src/modules/payroll/payroll.controller.js` (new), `backend/src/modules/payroll/payroll.routes.js` (new), `backend/src/index.js` (modified), `frontend/src/pages/employees/EmployeeDetail.tsx` (modified) |
| Payroll Module | All payroll backend files + `frontend/src/pages/payroll/PayrollRuns.tsx` (new) + `frontend/src/pages/payroll/PayrollRunDetail.tsx` (new) + router + AppLayout (modified) |
| Tests | `backend/src/__tests__/payroll.service.test.js` (new) |
