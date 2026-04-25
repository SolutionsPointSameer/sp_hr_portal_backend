const { prisma } = require("../../lib/prisma");
const { emailTemplates, sendEmail } = require("../../lib/notifications");

async function ensureLeaveBalances(employeeId, year) {
  const leaveTypes = await prisma.leaveType.findMany({
    select: { id: true, annualQuota: true },
  });

  if (!leaveTypes.length) return;

  const existingBalances = await prisma.leaveBalance.findMany({
    where: { employeeId, year },
    select: { leaveTypeId: true },
  });
  const existingTypeIds = new Set(existingBalances.map((balance) => balance.leaveTypeId));

  const missingBalances = leaveTypes
    .filter((leaveType) => !existingTypeIds.has(leaveType.id))
    .map((leaveType) => ({
      employeeId,
      leaveTypeId: leaveType.id,
      year,
      entitled: leaveType.annualQuota,
      used: 0,
      remaining: leaveType.annualQuota,
    }));

  if (!missingBalances.length) return;

  await prisma.leaveBalance.createMany({
    data: missingBalances,
    skipDuplicates: true,
  });
}

async function getTypes() {
  return prisma.leaveType.findMany();
}
async function createType(data) {
  return prisma.leaveType.create({ data });
}
async function updateType(id, data) {
  return prisma.leaveType.update({ where: { id }, data });
}

async function applyLeave({
  employeeId,
  leaveTypeId,
  fromDate,
  toDate,
  reason,
}) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const year = from.getFullYear();
  await ensureLeaveBalances(employeeId, year);

  // Fetch all official holidays for the year
  const holidaysList = await prisma.holiday.findMany({
    where: { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59.999Z`) } }
  });
  const holidayDateStrings = new Set(holidaysList.map(h => h.date.toISOString().split("T")[0]));

  let daysCount = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const isSunday = d.getDay() === 0;
    const isHoliday = holidayDateStrings.has(d.toISOString().split("T")[0]);
    if (!isSunday && !isHoliday) {
      daysCount++;
    }
  }

  if (daysCount === 0) {
    throw { status: 400, message: "Selected dates fall on non-working days or holidays. Leave duration cannot be 0 days." };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { manager: true },
  });
  if (!emp.managerId)
    throw { status: 400, message: "No manager assigned for approval" };


  const leaveTypeObj = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveTypeObj) throw { status: 400, message: "Invalid leave type" };

  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });

  if (leaveTypeObj.isPaid) {
    if (!balance || balance.remaining < daysCount)
      throw { status: 400, message: "Insufficient leave balance" };
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId,
      fromDate: from,
      toDate: to,
      daysCount,
      reason,
      approverId: emp.managerId,
    },
  });

  // Fetch admin emails
  const admins = await prisma.employee.findMany({
    where: { role: { in: ['HR_ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
    select: { email: true, firstName: true }
  });

  const datesStr = `${from.toISOString().split("T")[0]} to ${to.toISOString().split("T")[0]}`;
  const empName = `${emp.firstName} ${emp.lastName}`;

  // Notify manager
  if (emp.manager && emp.manager.email) {
    const { text, html } = emailTemplates.leaveApplied(emp.manager.firstName, empName, leaveTypeObj.name, datesStr);
    sendEmail({ to: emp.manager.email, subject: `Leave Application: ${empName}`, body: text, html }).catch(console.error);
  }

  // Notify admins
  for (const admin of admins) {
    if (admin.email && (!emp.manager || admin.email !== emp.manager.email)) {
      const { text, html } = emailTemplates.leaveApplied(admin.firstName, empName, leaveTypeObj.name, datesStr);
      sendEmail({ to: admin.email, subject: `Leave Application: ${empName}`, body: text, html }).catch(console.error);
    }
  }

  return leave;
}

async function getMyRequests(employeeId) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    include: { leaveType: true },
  });
}
async function getMyBalances(employeeId) {
  const year = new Date().getFullYear();
  await ensureLeaveBalances(employeeId, year);
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
  });
}

// Admins can view any employee's balances
async function getEmployeeBalances(employeeId) {
  const year = new Date().getFullYear();
  await ensureLeaveBalances(employeeId, year);
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
  });
}

// Admins can manually update an employee's leave balance
async function updateLeaveBalance(id, data) {
  return prisma.leaveBalance.update({
    where: { id },
    data: {
      entitled: data.entitled,
      used: data.used,
      remaining: data.remaining,
    }
  });
}
async function getPendingApprovals(approverId) {
  return prisma.leaveRequest.findMany({
    where: { approverId, status: "PENDING" },
    include: {
      leaveType: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  });
}
async function getTeamLeaves(approverId) {
  return prisma.leaveRequest.findMany({
    where: { approverId },
    include: {
      leaveType: true,
      employee: { select: { firstName: true, lastName: true, employeeCode: true } },
    },
    orderBy: { fromDate: "desc" },
  });
}
async function getAllRequests(query) {
  return prisma.leaveRequest.findMany({
    include: {
      leaveType: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  });
}

async function decideLeave(id, body, actorId, actorRole) {
  // Accept either `action` or `status` from the frontend payload
  const action = body.action || body.status;
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!leave || leave.status !== "PENDING")
    throw { status: 400, message: "Invalid leave request" };

  if (leave.approverId !== actorId && actorRole !== "SUPER_ADMIN") {
    throw { status: 403, message: "Forbidden: You are not the designated approver for this leave request" };
  }

  if (action === "APPROVED") {
    const year = leave.fromDate.getFullYear();
    await prisma.$transaction([
      prisma.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: leave.employeeId,
            leaveTypeId: leave.leaveTypeId,
            year,
          },
        },
        data: {
          used: { increment: leave.daysCount },
          remaining: { decrement: leave.daysCount },
        },
      }),
      prisma.leaveRequest.update({
        where: { id },
        data: { status: "APPROVED", decidedAt: new Date() },
      }),
    ]);
  } else {
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
  }

  // notify async
  const dates = `${leave.fromDate.toISOString().split("T")[0]} to ${leave.toDate.toISOString().split("T")[0]}`;
  const template = emailTemplates.leaveDecision(
    leave.employee.firstName,
    action,
    dates,
  );
  sendEmail({
    to: leave.employee.email,
    subject: `Leave ${action}`,
    body: template,
  }).catch(() => {});

  return { success: true };
}

async function cancelLeave(id, employeeId) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave || leave.employeeId !== employeeId || leave.status !== "PENDING")
    throw { status: 400, message: "Cannot cancel" };
  await prisma.leaveRequest.delete({ where: { id } });
}

module.exports = {
  getTypes,
  createType,
  updateType,
  applyLeave,
  getMyRequests,
  getMyBalances,
  getEmployeeBalances,
  updateLeaveBalance,
  getPendingApprovals,
  getTeamLeaves,
  getAllRequests,
  decideLeave,
  cancelLeave,
};
