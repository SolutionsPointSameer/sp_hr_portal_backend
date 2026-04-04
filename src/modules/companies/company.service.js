const { prisma } = require("../../lib/prisma");

async function listCompanies() {
  return prisma.company.findMany({
    orderBy: { name: "asc" },
  });
}

async function createCompany(data) {
  const existing = await prisma.company.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    throw { status: 400, message: "Company name already exists" };
  }
  return prisma.company.create({
    data: { name: data.name },
  });
}

async function updateCompany(id, data) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    throw { status: 404, message: "Company not found" };
  }
  return prisma.company.update({
    where: { id },
    data: { name: data.name },
  });
}

async function deleteCompany(id) {
  return prisma.company.delete({
    where: { id },
  });
}

module.exports = {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};
