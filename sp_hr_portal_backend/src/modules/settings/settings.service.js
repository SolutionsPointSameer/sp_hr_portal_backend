const { prisma } = require("../../lib/prisma");

const DEFAULT_SETTINGS = {
  companyName: "Solutions Point Pvt. Ltd.",
  workStartTime: "09:00",
  workEndTime: "18:00",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  currency: "inr",
  emailNotifications: true,
};

async function getSettings() {
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "GLOBAL" },
  });
  
  if (!setting) {
    return DEFAULT_SETTINGS;
  }
  return setting.details;
}

async function updateSettings(updates) {
  const existing = await getSettings();
  const merged = { ...existing, ...updates };

  const setting = await prisma.systemSetting.upsert({
    where: { id: "GLOBAL" },
    update: { details: merged },
    create: {
      id: "GLOBAL",
      details: merged,
    },
  });

  return setting.details;
}

module.exports = {
  getSettings,
  updateSettings,
};
