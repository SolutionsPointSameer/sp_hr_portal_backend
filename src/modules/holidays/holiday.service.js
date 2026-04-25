const { prisma } = require("../../lib/prisma");

async function listHolidays(query) {
  const { year } = query;
  
  const where = {};
  let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  if (year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
    where.date = {
      gte: startDate,
      lte: endDate
    };
  }

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" }
  });

  const sundays = [];
  const start = new Date(`${targetYear}-01-01`);
  const end = new Date(`${targetYear}-12-31T23:59:59.999Z`);

  // Fast-forward to the first Sunday
  while (start.getDay() !== 0 && start <= end) {
    start.setDate(start.getDate() + 1);
  }

  let current = new Date(start);
  while (current <= end) {
    const dateString = current.toISOString().split("T")[0];
    const exists = holidays.some(h => h.date.toISOString().split("T")[0] === dateString);

    if (!exists) {
      sundays.push({
        id: `sunday-${dateString}`,
        name: "Sunday",
        date: new Date(current),
        type: "public"
      });
    }
    current.setDate(current.getDate() + 7);
  }

  const allHolidays = [...holidays, ...sundays].sort((a, b) => a.date - b.date);
  return allHolidays;
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
  if (id.startsWith("sunday-")) {
    throw { status: 400, message: "Cannot edit default Sunday holidays" };
  }

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
  if (id.startsWith("sunday-")) {
    throw { status: 400, message: "Cannot delete default Sunday holidays" };
  }
  return prisma.holiday.delete({ where: { id } });
}

module.exports = {
  listHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday
};
