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
    const err = new Error(`Payroll run for ${month}/${year} already exists`);
    err.status = 409;
    throw err;
  }

  // Cutoff: last day of the payroll month
  const cutoffDate = new Date(year, month, 0);

  // Fetch all active employees and all applicable salary structures in two queries (not N+1)
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const allStructures = await prisma.salaryStructure.findMany({
    where: { effectiveDate: { lte: cutoffDate } },
    orderBy: { effectiveDate: "desc" },
  });

  // Group: pick the latest structure per employee
  const latestByEmployee = new Map();
  for (const struct of allStructures) {
    if (!latestByEmployee.has(struct.employeeId)) {
      latestByEmployee.set(struct.employeeId, struct);
    }
  }

  const run = await prisma.$transaction(async (tx) => {
    const newRun = await tx.payrollRun.create({
      data: { month, year, processedById, status: "DRAFT" },
    });

    const payslipData = [];
    for (const emp of employees) {
      const struct = latestByEmployee.get(emp.id);
      if (!struct) continue;

      const allowances = struct.allowances ?? {};
      const deductions = struct.deductions ?? {};
      const grossAllowances = Object.values(allowances).reduce(
        (s, v) => s + Number(v || 0), 0
      );
      const gross = Number(struct.basic) + Number(struct.hra) + grossAllowances;
      const totalDeductions = Object.values(deductions).reduce(
        (s, v) => s + Number(v || 0), 0
      );
      const netPay = gross - totalDeductions;

      payslipData.push({
        payrollRunId: newRun.id,
        employeeId: emp.id,
        gross,
        deductions: totalDeductions,
        netPay,
      });
    }

    if (payslipData.length > 0) {
      await tx.payslip.createMany({ data: payslipData });
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
  if (!run) {
    const err = new Error("Payroll run not found");
    err.status = 404;
    throw err;
  }
  return run;
}

async function finalizePayrollRun(id) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { _count: { select: { payslips: true } } }
  });
  if (!run) {
    const err = new Error("Payroll run not found");
    err.status = 404;
    throw err;
  }
  if (run.status === "FINALIZED") {
    const err = new Error("Already finalized");
    err.status = 400;
    throw err;
  }
  if (run._count.payslips === 0) {
    const err = new Error("Cannot finalize an empty payroll run");
    err.status = 400;
    throw err;
  }
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
