const { prisma } = require("../../lib/prisma");
const https = require("https");

/**
 * Reverse-geocode coordinates to a human-readable address using
 * OpenStreetMap Nominatim (free, no API key required).
 */
async function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    https
      .get(url, { headers: { "User-Agent": "HRPortal/1.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.display_name || null);
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

async function checkIn(employeeId, { latitude, longitude } = {}) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  let address = null;
  if (latitude != null && longitude != null) {
    address = await reverseGeocode(latitude, longitude).catch(() => null);
  }

  return prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: {
      checkIn: new Date(),
      checkInLat: latitude ?? null,
      checkInLng: longitude ?? null,
      checkInAddress: address,
    },
    create: {
      employeeId,
      date,
      checkIn: new Date(),
      source: "system",
      checkInLat: latitude ?? null,
      checkInLng: longitude ?? null,
      checkInAddress: address,
    },
  });
}

async function checkOut(employeeId, { latitude, longitude } = {}) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  let address = null;
  if (latitude != null && longitude != null) {
    address = await reverseGeocode(latitude, longitude).catch(() => null);
  }

  return prisma.attendanceRecord.update({
    where: { employeeId_date: { employeeId, date } },
    data: {
      checkOut: new Date(),
      checkOutLat: latitude ?? null,
      checkOutLng: longitude ?? null,
      checkOutAddress: address,
    },
  });
}

async function getMine(employeeId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  return prisma.attendanceRecord.findMany({
    where: { employeeId, date: { gte: startDate, lt: endDate } },
    orderBy: { date: "asc" },
  });
}

async function getEmployeeRecords(employeeId, month, year) {
  return getMine(employeeId, month, year);
}

async function getAllAttendance(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  return prisma.attendanceRecord.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });
}

async function regularize(data) {
  return prisma.attendanceRecord.upsert({
    where: {
      employeeId_date: {
        employeeId: data.employeeId,
        date: new Date(data.date),
      },
    },
    update: {
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      status: data.status,
      source: "manual",
    },
    create: {
      employeeId: data.employeeId,
      date: new Date(data.date),
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      status: data.status || "present",
      source: "manual",
    },
  });
}

async function getTeamSummary(managerId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  return prisma.attendanceRecord.findMany({
    where: {
      employee: { managerId },
      date: { gte: startDate, lt: endDate },
    },
    orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    },
  });
}

module.exports = {
  checkIn,
  checkOut,
  getMine,
  getEmployeeRecords,
  getAllAttendance,
  regularize,
  getTeamSummary,
};
