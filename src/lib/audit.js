const { prisma } = require("./prisma");

async function createAuditLog(actorId, action, entity, entityId, changes) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, entity, entityId, changes },
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

module.exports = { createAuditLog };
