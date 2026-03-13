"use strict";

jest.mock("../lib/prisma", () => ({
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

const { prisma } = require("../lib/prisma");
const {
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  listPayrollRuns,
  createPayrollRun,
  getPayrollRun,
  finalizePayrollRun,
  getMyPayslips,
} = require("../modules/payroll/payroll.service");

afterEach(() => {
  jest.clearAllMocks();
});

// ── getSalaryStructures ────────────────────────────────────────────────────────

describe("getSalaryStructures", () => {
  it("returns salary structures for the given employeeId", async () => {
    const mockStructures = [
      { id: "s1", employeeId: "emp1", basic: 50000, hra: 20000 },
      { id: "s2", employeeId: "emp1", basic: 45000, hra: 18000 },
    ];
    prisma.salaryStructure.findMany.mockResolvedValue(mockStructures);

    const result = await getSalaryStructures("emp1");

    expect(result).toEqual(mockStructures);
  });

  it("calls findMany with correct where and orderBy", async () => {
    prisma.salaryStructure.findMany.mockResolvedValue([]);

    await getSalaryStructures("emp42");

    expect(prisma.salaryStructure.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.salaryStructure.findMany).toHaveBeenCalledWith({
      where: { employeeId: "emp42" },
      orderBy: { effectiveDate: "desc" },
    });
  });
});

// ── createSalaryStructure ──────────────────────────────────────────────────────

describe("createSalaryStructure", () => {
  it("creates a salary structure and returns the result", async () => {
    const created = { id: "s1", employeeId: "emp1", basic: 50000 };
    prisma.salaryStructure.create.mockResolvedValue(created);

    const result = await createSalaryStructure({
      employeeId: "emp1",
      effectiveDate: "2024-01-01",
      basic: 50000,
      hra: 20000,
      allowances: { transport: 5000 },
      deductions: { pf: 6000 },
    });

    expect(result).toEqual(created);
  });

  it("converts effectiveDate string to a Date object", async () => {
    prisma.salaryStructure.create.mockResolvedValue({});

    await createSalaryStructure({
      employeeId: "emp1",
      effectiveDate: "2024-06-15",
      basic: 60000,
      hra: 25000,
    });

    const callArg = prisma.salaryStructure.create.mock.calls[0][0];
    expect(callArg.data.effectiveDate).toBeInstanceOf(Date);
    expect(callArg.data.effectiveDate).toEqual(new Date("2024-06-15"));
  });

  it("defaults allowances and deductions to empty objects when not provided", async () => {
    prisma.salaryStructure.create.mockResolvedValue({});

    await createSalaryStructure({
      employeeId: "emp2",
      effectiveDate: "2024-01-01",
      basic: 40000,
      hra: 15000,
    });

    const callArg = prisma.salaryStructure.create.mock.calls[0][0];
    expect(callArg.data.allowances).toEqual({});
    expect(callArg.data.deductions).toEqual({});
  });

  it("passes provided allowances and deductions through", async () => {
    prisma.salaryStructure.create.mockResolvedValue({});

    await createSalaryStructure({
      employeeId: "emp3",
      effectiveDate: "2024-03-01",
      basic: 55000,
      hra: 22000,
      allowances: { transport: 3000 },
      deductions: { pf: 6600 },
    });

    const callArg = prisma.salaryStructure.create.mock.calls[0][0];
    expect(callArg.data.allowances).toEqual({ transport: 3000 });
    expect(callArg.data.deductions).toEqual({ pf: 6600 });
  });
});

// ── updateSalaryStructure ──────────────────────────────────────────────────────

describe("updateSalaryStructure", () => {
  it("updates and returns the result", async () => {
    const updated = { id: "s1", basic: 55000 };
    prisma.salaryStructure.update.mockResolvedValue(updated);

    const result = await updateSalaryStructure("s1", { basic: 55000 });

    expect(result).toEqual(updated);
  });

  it("only includes provided fields in the update payload", async () => {
    prisma.salaryStructure.update.mockResolvedValue({});

    await updateSalaryStructure("s1", { basic: 55000 });

    const callArg = prisma.salaryStructure.update.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: "s1" });
    expect(callArg.data).toEqual({ basic: 55000 });
    expect(callArg.data).not.toHaveProperty("hra");
    expect(callArg.data).not.toHaveProperty("effectiveDate");
  });

  it("converts effectiveDate to a Date object when provided", async () => {
    prisma.salaryStructure.update.mockResolvedValue({});

    await updateSalaryStructure("s1", { effectiveDate: "2025-01-01", hra: 21000 });

    const callArg = prisma.salaryStructure.update.mock.calls[0][0];
    expect(callArg.data.effectiveDate).toBeInstanceOf(Date);
    expect(callArg.data.effectiveDate).toEqual(new Date("2025-01-01"));
    expect(callArg.data.hra).toBe(21000);
  });

  it("does not include effectiveDate in update when not provided", async () => {
    prisma.salaryStructure.update.mockResolvedValue({});

    await updateSalaryStructure("s1", { hra: 18000 });

    const callArg = prisma.salaryStructure.update.mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("effectiveDate");
    expect(callArg.data.hra).toBe(18000);
  });

  it("includes allowances and deductions when provided", async () => {
    prisma.salaryStructure.update.mockResolvedValue({});

    await updateSalaryStructure("s2", {
      allowances: { transport: 4000 },
      deductions: { pf: 7200 },
    });

    const callArg = prisma.salaryStructure.update.mock.calls[0][0];
    expect(callArg.data.allowances).toEqual({ transport: 4000 });
    expect(callArg.data.deductions).toEqual({ pf: 7200 });
  });
});

// ── listPayrollRuns ────────────────────────────────────────────────────────────

describe("listPayrollRuns", () => {
  it("maps runs to include totalNetPay and employeeCount", async () => {
    const rawRuns = [
      {
        id: "run1",
        month: 3,
        year: 2024,
        status: "DRAFT",
        payslips: [{ netPay: 50000 }, { netPay: 60000 }],
        _count: { payslips: 2 },
      },
    ];
    prisma.payrollRun.findMany.mockResolvedValue(rawRuns);

    const result = await listPayrollRuns();

    expect(result).toHaveLength(1);
    expect(result[0].totalNetPay).toBe(110000);
    expect(result[0].employeeCount).toBe(2);
  });

  it("strips raw payslips and _count from the result", async () => {
    const rawRuns = [
      {
        id: "run1",
        month: 3,
        year: 2024,
        status: "DRAFT",
        payslips: [{ netPay: 50000 }],
        _count: { payslips: 1 },
      },
    ];
    prisma.payrollRun.findMany.mockResolvedValue(rawRuns);

    const result = await listPayrollRuns();

    expect(result[0].payslips).toBeUndefined();
    expect(result[0]._count).toBeUndefined();
  });

  it("returns empty array when there are no runs", async () => {
    prisma.payrollRun.findMany.mockResolvedValue([]);

    const result = await listPayrollRuns();

    expect(result).toEqual([]);
  });

  it("computes totalNetPay as 0 for a run with no payslips", async () => {
    const rawRuns = [
      {
        id: "run2",
        month: 4,
        year: 2024,
        status: "DRAFT",
        payslips: [],
        _count: { payslips: 0 },
      },
    ];
    prisma.payrollRun.findMany.mockResolvedValue(rawRuns);

    const result = await listPayrollRuns();

    expect(result[0].totalNetPay).toBe(0);
    expect(result[0].employeeCount).toBe(0);
  });
});

// ── createPayrollRun ───────────────────────────────────────────────────────────

describe("createPayrollRun", () => {
  it("throws 409 when a run for the same month/year already exists", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({
      id: "existing",
      month: 3,
      year: 2024,
    });

    const err = await createPayrollRun({ month: 3, year: 2024 }, "admin1").catch(
      (e) => e
    );

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/already exists/i);
  });

  it("checks for existing run before starting the transaction", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({
      id: "existing",
      month: 5,
      year: 2024,
    });

    await createPayrollRun({ month: 5, year: 2024 }, "admin1").catch(() => {});

    expect(prisma.payrollRun.findUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 5, year: 2024 } },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// ── getPayrollRun ──────────────────────────────────────────────────────────────

describe("getPayrollRun", () => {
  it("throws 404 when the payroll run is not found", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue(null);

    const err = await getPayrollRun("nonexistent").catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toMatch(/not found/i);
  });

  it("returns the run with payslips when found", async () => {
    const mockRun = {
      id: "run1",
      month: 3,
      year: 2024,
      status: "DRAFT",
      payslips: [{ id: "ps1", employeeId: "emp1", netPay: 50000 }],
    };
    prisma.payrollRun.findUnique.mockResolvedValue(mockRun);

    const result = await getPayrollRun("run1");

    expect(result).toEqual(mockRun);
  });

  it("calls findUnique with the correct id and include", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({
      id: "run2",
      payslips: [],
    });

    await getPayrollRun("run2");

    const callArg = prisma.payrollRun.findUnique.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: "run2" });
    expect(callArg.include).toBeDefined();
    expect(callArg.include.payslips).toBeDefined();
  });
});

// ── finalizePayrollRun ─────────────────────────────────────────────────────────

describe("finalizePayrollRun", () => {
  it("throws 404 when the payroll run is not found", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue(null);

    const err = await finalizePayrollRun("bad-id").catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toMatch(/not found/i);
  });

  it("throws 400 when the run is already FINALIZED", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({
      id: "run1",
      status: "FINALIZED",
      _count: { payslips: 3 },
    });

    const err = await finalizePayrollRun("run1").catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.message).toMatch(/already finalized/i);
  });

  it("throws 400 with 'Cannot finalize an empty payroll run' when there are zero payslips", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({
      id: "run2",
      status: "DRAFT",
      _count: { payslips: 0 },
    });

    const err = await finalizePayrollRun("run2").catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Cannot finalize an empty payroll run");
  });

  it("updates status to FINALIZED for a valid DRAFT run with payslips", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue({
      id: "run3",
      status: "DRAFT",
      _count: { payslips: 2 },
    });
    const finalizedRun = { id: "run3", status: "FINALIZED" };
    prisma.payrollRun.update.mockResolvedValue(finalizedRun);

    const result = await finalizePayrollRun("run3");

    expect(result).toEqual(finalizedRun);
    expect(prisma.payrollRun.update).toHaveBeenCalledWith({
      where: { id: "run3" },
      data: { status: "FINALIZED" },
    });
  });

  it("does not call update when the run is not found", async () => {
    prisma.payrollRun.findUnique.mockResolvedValue(null);

    await finalizePayrollRun("missing").catch(() => {});

    expect(prisma.payrollRun.update).not.toHaveBeenCalled();
  });
});

// ── getMyPayslips ──────────────────────────────────────────────────────────────

describe("getMyPayslips", () => {
  it("returns payslips for the given employeeId", async () => {
    const mockPayslips = [
      { id: "ps1", employeeId: "emp5", netPay: 50000, payrollRun: { month: 3, year: 2024, status: "FINALIZED" } },
      { id: "ps2", employeeId: "emp5", netPay: 48000, payrollRun: { month: 2, year: 2024, status: "FINALIZED" } },
    ];
    prisma.payslip.findMany.mockResolvedValue(mockPayslips);

    const result = await getMyPayslips("emp5");

    expect(result).toEqual(mockPayslips);
  });

  it("calls findMany with the correct where clause", async () => {
    prisma.payslip.findMany.mockResolvedValue([]);

    await getMyPayslips("emp7");

    const callArg = prisma.payslip.findMany.mock.calls[0][0];
    expect(callArg.where).toEqual({ employeeId: "emp7" });
  });

  it("calls findMany with the correct orderBy (year desc, month desc)", async () => {
    prisma.payslip.findMany.mockResolvedValue([]);

    await getMyPayslips("emp8");

    const callArg = prisma.payslip.findMany.mock.calls[0][0];
    expect(callArg.orderBy).toEqual([
      { payrollRun: { year: "desc" } },
      { payrollRun: { month: "desc" } },
    ]);
  });

  it("includes payrollRun in the query", async () => {
    prisma.payslip.findMany.mockResolvedValue([]);

    await getMyPayslips("emp9");

    const callArg = prisma.payslip.findMany.mock.calls[0][0];
    expect(callArg.include).toBeDefined();
    expect(callArg.include.payrollRun).toBeDefined();
  });

  it("returns empty array when the employee has no payslips", async () => {
    prisma.payslip.findMany.mockResolvedValue([]);

    const result = await getMyPayslips("emp-no-payslips");

    expect(result).toEqual([]);
  });
});
