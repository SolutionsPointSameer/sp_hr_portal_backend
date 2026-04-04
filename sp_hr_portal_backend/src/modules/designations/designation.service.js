const { prisma } = require("../../lib/prisma");
async function list(departmentId) {
  const where = departmentId ? { departmentId } : {};
  return prisma.designation.findMany({ where, include: { department: true } });
}
async function create(data) {
  return prisma.designation.create({ data });
}
async function update(id, data) {
  return prisma.designation.update({ where: { id }, data });
}
module.exports = { list, create, update };
