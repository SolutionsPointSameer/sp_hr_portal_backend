const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { loadSecretsToEnv } = require("./lib/keyVault");

function getAllowedOrigins() {
  return (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function createCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      // Allow non-browser and same-origin requests.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  };
}

async function loadAppSecrets() {
  if (process.env.KEYVAULT_SECRETS_LOADED === "1") {
    return [];
  }

  const loadedSecrets = await loadSecretsToEnv();
  process.env.KEYVAULT_SECRETS_LOADED = "1";
  return loadedSecrets;
}

async function createApp() {
  const loadedSecrets = await loadAppSecrets();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL was not loaded from Azure Key Vault.");
  }

  const express = require("express");
  const cors = require("cors");
  const helmet = require("helmet");
  const morgan = require("morgan");
  const authRoutes = require("./modules/auth/auth.routes");
  const usersRoutes = require("./modules/users/users.routes");
  const employeeRoutes = require("./modules/employees/employee.routes");
  const departmentRoutes = require("./modules/departments/department.routes");
  const designationRoutes = require("./modules/designations/designation.routes");
  const attendanceRoutes = require("./modules/attendance/attendance.routes");
  const leaveRoutes = require("./modules/leave/leave.routes");
  const onboardingRoutes = require("./modules/onboarding/onboarding.routes");
  const reportsRoutes = require("./modules/reports/reports.routes");
  const locationsRoutes = require("./modules/locations/location.routes");
  const companiesRoutes = require("./modules/companies/company.routes");
  const holidayRoutes = require("./modules/holidays/holiday.routes");
  const settingsRoutes = require("./modules/settings/settings.routes");
  const payrollRoutes = require("./modules/payroll/payroll.routes");
  const errorHandler = require("./middleware/errorHandler");

  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors(createCorsOptions()));
  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/auth", authRoutes);
  app.use("/users", usersRoutes);
  app.use("/employees", employeeRoutes);
  app.use("/departments", departmentRoutes);
  app.use("/designations", designationRoutes);
  app.use("/attendance", attendanceRoutes);
  app.use("/leave", leaveRoutes);
  app.use("/onboarding", onboardingRoutes);
  app.use("/reports", reportsRoutes);
  app.use("/locations", locationsRoutes);
  app.use("/companies", companiesRoutes);
  app.use("/holidays", holidayRoutes);
  app.use("/settings", settingsRoutes);
  app.use("/payroll", payrollRoutes);

  app.use(errorHandler);

  return { app, loadedSecrets };
}

async function startServer() {
  const { app, loadedSecrets } = await createApp();
  const PORT = process.env.PORT || 3000;

  if (loadedSecrets.length > 0) {
    console.log(`[KeyVault] Loaded ${loadedSecrets.length} secret(s): ${loadedSecrets.join(", ")}`);
  } else {
    console.log("[KeyVault] No secrets found in Azure Key Vault.");
  }

  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("[bootstrap] Failed to start API:", err.message);
    process.exit(1);
  });
}

module.exports = { createApp, startServer };
