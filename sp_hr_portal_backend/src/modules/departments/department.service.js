const { prisma } = require("../../lib/prisma");

async function list() {
  return prisma.department.findMany({
    include: {
      headEmployee: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function create(data) {
  return prisma.department.create({ data });
}

async function update(id, data) {
  return prisma.department.update({ where: { id }, data });
}

module.exports = { list, create, update };
