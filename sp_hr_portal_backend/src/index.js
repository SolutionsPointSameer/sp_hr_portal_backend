require("dotenv").config();
const { loadSecretsToEnv } = require("./lib/keyVault");
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
const path = require("path");

const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false })); // allows serving static files
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(morgan("dev"));
app.use(express.json());

// Serve uploaded files statically
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

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  loadSecretsToEnv()
    .then((loaded) => {
      if (loaded.length > 0) {
        console.log(`[KeyVault] Loaded ${loaded.length} secret(s): ${loaded.join(", ")}`);
      } else {
        console.log("[KeyVault] No additional secrets loaded (all set via .env).");
      }
    })
    .catch((err) => {
      console.warn("[KeyVault] Could not load secrets (continuing):", err.message);
    })
    .finally(() => {
      app.listen(PORT, () => console.log(`API running on port ${PORT}`));
    });
}

module.exports = app;
