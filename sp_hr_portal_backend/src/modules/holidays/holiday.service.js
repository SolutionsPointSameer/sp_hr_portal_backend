const { prisma } = require("../../lib/prisma");

async function listHolidays(query) {
  const { year } = query;
  
  const where = {};
  if (year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
    where.date = {
      gte: startDate,
      lte: endDate
    };
  }

  return prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" }
  });
}

async function getHolidayById(id) {
  return prisma.holiday.findUnique({ where: { id } });
}

async function createHoliday(data) {
  return prisma.holiday.create({
    data: {
      name: data.name,
      date: new Date(data.date),
      type: data.type || "public"
    }
  });
}

async function updateHoliday(id, data) {
  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.date) updateData.date = new Date(data.date);
  if (data.type) updateData.type = data.type;

  return prisma.holiday.update({
    where: { id },
    data: updateData
  });
}

async function deleteHoliday(id) {
  return prisma.holiday.delete({ where: { id } });
}

module.exports = {
  listHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday
};
