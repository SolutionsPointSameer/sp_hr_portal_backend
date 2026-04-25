const { prisma } = require("../../lib/prisma");
const { emailTemplates, sendEmail } = require("../../lib/notifications");

async function getMyTasks(employeeId) {
  return prisma.onboardingTask.findMany({
    where: { assignedToId: employeeId },
  });
}

async function createTask(data, actorId) {
  const taskName = data.description 
    ? `${data.title} - ${data.description}` 
    : data.title;

  const task = await prisma.onboardingTask.create({
    data: { 
      employeeId: data.employeeId,
      taskName,
      assignedToId: data.assignedToId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null 
    },
    include: { assignedTo: { select: { email: true, firstName: true } } },
  });

  if (task.assignedTo && task.assignedTo.email) {
    const template = emailTemplates.onboardingTaskAssigned(
      task.assignedTo.firstName,
      task.taskName,
      task.dueDate ? task.dueDate.toISOString().split("T")[0] : "None",
    );
    sendEmail({
      to: task.assignedTo.email,
      subject: "New Onboarding Task Assigned",
      body: template,
    }).catch(() => {});
  }

  delete task.assignedTo;
  return task;
}

async function updateTaskStatus(id, status, actorId, actorRole) {
  // Only the assigned user, or HR/Admin, can update
  const task = await prisma.onboardingTask.findUnique({ where: { id } });
  if (!task) throw { status: 404, message: 'Task not found' };

  const isAdminOrHr = ['HR_ADMIN', 'SUPER_ADMIN'].includes(actorRole);
  if (!isAdminOrHr && task.assignedToId !== actorId) {
    throw { status: 403, message: 'You do not have permission to update this task' };
  }

  return prisma.onboardingTask.update({ where: { id }, data: { status } });
}

async function getEmployeeTasks(employeeId, actorId, actorRole) {
  // Managers can only view tasks for employees who report to them
  if (actorRole === 'MANAGER') {
    const target = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true }
    });
    if (!target || target.managerId !== actorId) {
      throw { status: 403, message: 'Access denied: employee is not in your team' };
    }
  }
  return prisma.onboardingTask.findMany({ where: { employeeId } });
}

async function getOverdueTasks() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return prisma.onboardingTask.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });
}

async function deleteTask(id) {
  await prisma.onboardingTask.delete({ where: { id } });
}

async function getAllTasks() {
  return prisma.onboardingTask.findMany({
    include: {
      employee: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
    orderBy: { dueDate: 'asc' }
  });
}

module.exports = {
  getMyTasks,
  createTask,
  updateTaskStatus,
  getEmployeeTasks,
  getOverdueTasks,
  getAllTasks,
  deleteTask,
};
