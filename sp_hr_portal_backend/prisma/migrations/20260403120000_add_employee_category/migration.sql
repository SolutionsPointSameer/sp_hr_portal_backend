CREATE TYPE "EmployeeCategory" AS ENUM ('DIRECT', 'DEPLOYED_MANPOWER');

ALTER TABLE "Employee"
ADD COLUMN "employeeCategory" "EmployeeCategory" NOT NULL DEFAULT 'DIRECT';
