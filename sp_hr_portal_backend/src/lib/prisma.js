const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Load Azure Key Vault secrets before importing Prisma modules."
  );
}

const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

module.exports = { prisma };
