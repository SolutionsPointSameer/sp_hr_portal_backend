const { prisma } = require("../../lib/prisma");

async function listLocations() {
  return prisma.location.findMany({
    orderBy: { name: "asc" },
  });
}

async function createLocation(data) {
  const existing = await prisma.location.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    throw { status: 400, message: "Location name already exists" };
  }
  return prisma.location.create({
    data: { name: data.name },
  });
}

async function updateLocation(id, data) {
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    throw { status: 404, message: "Location not found" };
  }
  return prisma.location.update({
    where: { id },
    data: { name: data.name },
  });
}

async function deleteLocation(id) {
  return prisma.location.delete({
    where: { id },
  });
}

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
};
