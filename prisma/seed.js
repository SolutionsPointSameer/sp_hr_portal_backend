const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.create({
    data: { name: "Engineering" },
  });
  const desig = await prisma.designation.create({
    data: { name: "Software Engineer", level: 2, departmentId: dept.id },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  await prisma.employee.create({
    data: {
      employeeCode: "EMP001",
      firstName: "Super",
      lastName: "Admin",
      email: "admin@company.com",
      passwordHash,
      role: "SUPER_ADMIN",
      dateOfJoining: new Date(),
      departmentId: dept.id,
      designationId: desig.id,
    },
  });
  console.log("Seed complete. Login: admin@company.com / Admin@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
