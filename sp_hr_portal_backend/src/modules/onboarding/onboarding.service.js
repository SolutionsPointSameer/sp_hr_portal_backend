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

async function updateTaskStatus(id, status, actorId) {
  return prisma.onboardingTask.update({ where: { id }, data: { status } });
}

async function getEmployeeTasks(employeeId) {
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
