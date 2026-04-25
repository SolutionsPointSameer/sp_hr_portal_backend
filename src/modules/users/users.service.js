const crypto = require("crypto");
const { prisma } = require("../../lib/prisma");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../../lib/notifications");

async function listUsers() {
  const users = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Map the database shape to the exact shape the frontend requested
  return users.map((u) => ({
    id: u.id,
    code: u.employeeCode,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: u.role,
    active: u.status === "ACTIVE",
  }));
}

async function updateUserStatus(id, active, actorId) {
  const newStatus = active ? "ACTIVE" : "TERMINATED";
  const user = await prisma.employee.update({
    where: { id },
    data: { status: newStatus },
  });

  return {
    id: user.id,
    active: user.status === "ACTIVE",
    status: user.status,
  };
}

async function resetPassword(id) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw { status: 404, message: "User not found" };

  const tempPassword = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.employee.update({
    where: { id },
    data: { passwordHash, requiresOnboarding: true },
  });

  const portalUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const text = `Hi ${employee.firstName},\n\nYour HR Portal password has been reset by an administrator.\nYour new temporary password is: ${tempPassword}\nPlease login at ${portalUrl}/login and change your password immediately.`;
  const html = `<p>Hi <strong>${employee.firstName}</strong>,</p><p>Your HR Portal password has been reset by an administrator.</p><p>Your new temporary password is: <strong>${tempPassword}</strong></p><p>Please <a href="${portalUrl}/login">login</a> and change your password immediately.</p>`;

  sendEmail({
    to: employee.email,
    subject: "Your HR Portal Password Has Been Reset",
    body: text,
    html: html
  }).catch((err) => console.error("[email] Password reset email failed:", err.message));

  return { message: "Password reset successfully. An email has been sent to the user." };
}

module.exports = {
  listUsers,
  updateUserStatus,
  resetPassword,
};
