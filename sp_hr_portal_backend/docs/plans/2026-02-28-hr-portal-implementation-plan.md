# HR Management Portal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based HR Management Portal for 100–500 employees covering Employee Records, Attendance & Leave, Payroll, and Onboarding with 4 user roles (Employee, Manager, HR Admin, Super Admin).

**Architecture:** Modular monolith — React (TypeScript) frontend + Node.js/Express (JavaScript) backend + PostgreSQL via Prisma ORM. All modules share one deployment but have clearly bounded service and route layers.

**Tech Stack:** React 18, TypeScript 5, Vite, Ant Design, React Query, Zustand, React Router v6, Vitest (frontend) | Node.js 20, Express 5, JavaScript ES2022 CommonJS, Prisma 5, PostgreSQL 16, Jest, Supertest (backend) | AWS (Elastic Beanstalk, S3, CloudFront, RDS PostgreSQL, Secrets Manager, SES, CloudWatch)

---

## Phase 0: Project Scaffold

### Task 1: Initialize Monorepo Structure

**Files:**
- Create: `package.json` (root)
- Create: `apps/api/` (backend)
- Create: `apps/web/` (frontend)
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Create root workspace**

```bash
mkdir -p apps/api apps/web
```

Create root `package.json`:
```json
{
  "name": "hr-portal",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/api\" \"npm run dev -w apps/web\"",
    "test": "npm run test -w apps/api && npm run test -w apps/web",
    "build": "npm run build -w apps/api && npm run build -w apps/web"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

**Step 2: Create `.gitignore`**

```
node_modules/
dist/
build/
.env
.env.local
.env*.local
*.log
.DS_Store
coverage/
```

**Step 3: Install root deps**

```bash
npm install
```

Expected: `node_modules/` created at root.

**Step 4: Commit**

```bash
git init
git add .gitignore package.json README.md
git commit -m "chore: initialize monorepo workspace"
```

---

### Task 2: Scaffold Backend (Express + TypeScript)

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/.env.example`

**Step 1: Initialize backend package**

```bash
cd apps/api
npm init -y
```

**Step 2: Install backend dependencies**

```bash
npm install express cors helmet morgan bcryptjs jsonwebtoken @prisma/client @aws-sdk/client-s3 @aws-sdk/client-ses zod
npm install -D typescript ts-node-dev @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/node @types/morgan jest ts-jest supertest @types/jest @types/supertest prisma
```

**Step 3: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create `apps/api/src/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

export default app;
```

**Step 5: Add scripts to `apps/api/package.json`**

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand"
  }
}
```

**Step 6: Create `apps/api/.env.example`**

```
DATABASE_URL=postgresql://user:password@localhost:5432/hr_portal
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_DOCUMENTS=hr-portal-documents
S3_BUCKET_PAYSLIPS=hr-portal-payslips
SES_SENDER=noreply@yourcompany.com
PORT=3000
```

**Step 7: Write the first health check test**

Create `apps/api/src/__tests__/health.test.ts`:

```typescript
import request from 'supertest';
import app from '../index';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
```

**Step 8: Create `apps/api/jest.config.ts`**

```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
};
```

**Step 9: Run the test**

```bash
npm test
```

Expected: PASS `health.test.ts`

**Step 10: Commit**

```bash
git add apps/api/
git commit -m "chore: scaffold backend with express, typescript, jest"
```

---

### Task 3: Scaffold Frontend (React + Vite + TypeScript)

**Files:**
- Create: `apps/web/` (Vite scaffold)
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

**Step 1: Scaffold with Vite**

```bash
cd apps/web
npm create vite@latest . -- --template react-ts
```

**Step 2: Install frontend dependencies**

```bash
npm install antd @ant-design/icons react-router-dom @tanstack/react-query zustand axios
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: Update `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
});
```

**Step 4: Create `apps/web/src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

**Step 5: Write a smoke test**

Create `apps/web/src/__tests__/App.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });
});
```

**Step 6: Run frontend tests**

```bash
npm run test
```

Expected: PASS

**Step 7: Commit**

```bash
git add apps/web/
git commit -m "chore: scaffold frontend with react, vite, ant design"
```

---

## Phase 1: Database Schema

### Task 4: Initialize Prisma and Define Full Schema

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`

**Step 1: Initialize Prisma**

```bash
cd apps/api
npx prisma init
```

Expected: `prisma/schema.prisma` and `.env` created.

**Step 2: Copy `.env.example` to `.env` and fill in local DB URL**

```bash
cp .env.example .env
# Edit DATABASE_URL to point to local PostgreSQL
```

**Step 3: Write the full schema**

Replace `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  EMPLOYEE
  MANAGER
  HR_ADMIN
  SUPER_ADMIN
}

enum EmploymentType {
  FULL_TIME
  CONTRACT
  INTERN
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
}

enum LeaveRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

enum PayrollRunStatus {
  DRAFT
  FINALIZED
}

enum OnboardingTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}

model Department {
  id            String       @id @default(cuid())
  name          String       @unique
  headEmployee  Employee?    @relation("DeptHead", fields: [headEmployeeId], references: [id])
  headEmployeeId String?
  employees     Employee[]   @relation("DeptMembers")
  designations  Designation[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model Designation {
  id           String     @id @default(cuid())
  name         String
  level        Int        @default(1)
  department   Department @relation(fields: [departmentId], references: [id])
  departmentId String
  employees    Employee[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Employee {
  id             String         @id @default(cuid())
  employeeCode   String         @unique
  firstName      String
  lastName       String
  email          String         @unique
  phone          String?
  passwordHash   String
  role           Role           @default(EMPLOYEE)
  employmentType EmploymentType @default(FULL_TIME)
  status         EmployeeStatus @default(ACTIVE)
  dateOfJoining  DateTime
  dateOfLeaving  DateTime?
  department     Department?    @relation("DeptMembers", fields: [departmentId], references: [id])
  departmentId   String?
  designation    Designation?   @relation(fields: [designationId], references: [id])
  designationId  String?
  manager        Employee?      @relation("Reports", fields: [managerId], references: [id])
  managerId      String?
  reports        Employee[]     @relation("Reports")
  deptHeadOf     Department[]   @relation("DeptHead")
  documents      EmployeeDocument[]
  attendanceRecords AttendanceRecord[]
  leaveRequests  LeaveRequest[]
  leaveApprovals LeaveRequest[] @relation("Approver")
  leaveBalances  LeaveBalance[]
  salaryStructures SalaryStructure[]
  payslips       Payslip[]
  onboardingTasks OnboardingTask[]
  assignedTasks  OnboardingTask[] @relation("TaskAssignee")
  payrollRuns    PayrollRun[]   @relation("PayrollProcessor")
  auditLogs      AuditLog[]
  refreshTokens  RefreshToken[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model RefreshToken {
  id         String   @id @default(cuid())
  token      String   @unique
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model EmployeeDocument {
  id         String   @id @default(cuid())
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId String
  type       String
  fileUrl    String
  uploadedAt DateTime @default(now())
}

model AttendanceRecord {
  id         String   @id @default(cuid())
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId String
  date       DateTime @db.Date
  checkIn    DateTime?
  checkOut   DateTime?
  status     String   @default("present")
  source     String   @default("manual")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([employeeId, date])
}

model LeaveType {
  id               String        @id @default(cuid())
  name             String        @unique
  annualQuota      Int
  carryForwardLimit Int          @default(0)
  isPaid           Boolean       @default(true)
  leaveRequests    LeaveRequest[]
  leaveBalances    LeaveBalance[]
  createdAt        DateTime      @default(now())
}

model LeaveRequest {
  id          String             @id @default(cuid())
  employee    Employee           @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId  String
  leaveType   LeaveType          @relation(fields: [leaveTypeId], references: [id])
  leaveTypeId String
  fromDate    DateTime           @db.Date
  toDate      DateTime           @db.Date
  daysCount   Int
  status      LeaveRequestStatus @default(PENDING)
  reason      String?
  approver    Employee?          @relation("Approver", fields: [approverId], references: [id])
  approverId  String?
  appliedAt   DateTime           @default(now())
  decidedAt   DateTime?
}

model LeaveBalance {
  id          String    @id @default(cuid())
  employee    Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId  String
  leaveType   LeaveType @relation(fields: [leaveTypeId], references: [id])
  leaveTypeId String
  year        Int
  entitled    Int
  used        Int       @default(0)
  remaining   Int

  @@unique([employeeId, leaveTypeId, year])
}

model SalaryStructure {
  id          String   @id @default(cuid())
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId  String
  effectiveDate DateTime @db.Date
  basic       Decimal  @db.Decimal(12, 2)
  hra         Decimal  @db.Decimal(12, 2)
  allowances  Json     @default("{}")
  deductions  Json     @default("{}")
  createdAt   DateTime @default(now())
}

model PayrollRun {
  id          String           @id @default(cuid())
  month       Int
  year        Int
  status      PayrollRunStatus @default(DRAFT)
  processedBy Employee         @relation("PayrollProcessor", fields: [processedById], references: [id])
  processedById String
  processedAt DateTime         @default(now())
  payslips    Payslip[]

  @@unique([month, year])
}

model Payslip {
  id           String     @id @default(cuid())
  payrollRun   PayrollRun @relation(fields: [payrollRunId], references: [id])
  payrollRunId String
  employee     Employee   @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId   String
  gross        Decimal    @db.Decimal(12, 2)
  deductions   Decimal    @db.Decimal(12, 2)
  netPay       Decimal    @db.Decimal(12, 2)
  fileUrl      String?
  createdAt    DateTime   @default(now())

  @@unique([payrollRunId, employeeId])
}

model OnboardingTask {
  id          String               @id @default(cuid())
  employee    Employee             @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId  String
  taskName    String
  assignedTo  Employee?            @relation("TaskAssignee", fields: [assignedToId], references: [id])
  assignedToId String?
  dueDate     DateTime?            @db.Date
  status      OnboardingTaskStatus @default(PENDING)
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  actor     Employee @relation(fields: [actorId], references: [id])
  actorId   String
  action    String
  entity    String
  entityId  String
  changes   Json
  timestamp DateTime @default(now())
}
```

**Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration files created in `prisma/migrations/`, DB tables created.

**Step 5: Generate Prisma client**

```bash
npx prisma generate
```

**Step 6: Create seed file `apps/api/prisma/seed.ts`**

```typescript
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const dept = await prisma.department.create({ data: { name: 'Engineering' } });
  const desig = await prisma.designation.create({ data: { name: 'Software Engineer', level: 2, departmentId: dept.id } });

  const passwordHash = await bcrypt.hash('Admin@123', 10);
  await prisma.employee.create({
    data: {
      employeeCode: 'EMP001',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@company.com',
      passwordHash,
      role: Role.SUPER_ADMIN,
      dateOfJoining: new Date(),
      departmentId: dept.id,
      designationId: desig.id,
    },
  });
  console.log('Seed complete. Login: admin@company.com / Admin@123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Add to `apps/api/package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

**Step 7: Run seed**

```bash
npx prisma db seed
```

Expected: `Seed complete.` logged.

**Step 8: Commit**

```bash
git add apps/api/prisma/ apps/api/src/
git commit -m "feat: add prisma schema with all HR entities and seed"
```

---

## Phase 2: Authentication

### Task 5: Auth Service & JWT Utilities

**Files:**
- Create: `apps/api/src/lib/prisma.ts`
- Create: `apps/api/src/lib/jwt.ts`
- Create: `apps/api/src/lib/audit.ts`
- Create: `apps/api/src/__tests__/lib/jwt.test.ts`

**Step 1: Write failing test for JWT sign/verify**

`apps/api/src/__tests__/lib/jwt.test.ts`:

```typescript
import { signAccessToken, signRefreshToken, verifyAccessToken } from '../../lib/jwt';

process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

describe('JWT utilities', () => {
  it('signs and verifies an access token', () => {
    const payload = { sub: 'emp-123', role: 'EMPLOYEE' };
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('emp-123');
    expect(decoded.role).toBe('EMPLOYEE');
  });

  it('throws on invalid access token', () => {
    expect(() => verifyAccessToken('invalid')).toThrow();
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=jwt
```

Expected: FAIL `Cannot find module '../../lib/jwt'`

**Step 3: Implement `apps/api/src/lib/jwt.ts`**

```typescript
import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: { sub: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string };
}
```

**Step 4: Create `apps/api/src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Step 5: Create `apps/api/src/lib/audit.ts`**

```typescript
import { prisma } from './prisma';

export async function createAuditLog(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  changes: object
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, changes },
  });
}
```

**Step 6: Run test — expect PASS**

```bash
npm test -- --testPathPattern=jwt
```

Expected: PASS

**Step 7: Commit**

```bash
git add apps/api/src/lib/
git commit -m "feat: add jwt utilities and prisma client singleton"
```

---

### Task 6: Auth Routes (Login, Refresh, Logout)

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.routes.ts`
- Create: `apps/api/src/middleware/authenticate.ts`
- Create: `apps/api/src/__tests__/auth/auth.test.ts`

**Step 1: Write failing integration test**

`apps/api/src/__tests__/auth/auth.test.ts`:

```typescript
import request from 'supertest';
import app from '../../index';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';

beforeAll(async () => {
  await prisma.employee.deleteMany({ where: { email: 'test-auth@example.com' } });
  await prisma.employee.create({
    data: {
      employeeCode: 'TST001',
      firstName: 'Test',
      lastName: 'User',
      email: 'test-auth@example.com',
      passwordHash: await bcrypt.hash('Password@123', 10),
      role: 'EMPLOYEE',
      dateOfJoining: new Date(),
    },
  });
});

afterAll(async () => {
  await prisma.employee.deleteMany({ where: { email: 'test-auth@example.com' } });
  await prisma.$disconnect();
});

describe('POST /auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test-auth@example.com', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('returns 401 on invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test-auth@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=auth
```

Expected: FAIL 404

**Step 3: Implement `apps/api/src/modules/auth/auth.service.ts`**

```typescript
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { addDays } from 'date-fns';

export const authService = {
  async login(email: string, password: string) {
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee) throw new Error('INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) throw new Error('INVALID_CREDENTIALS');

    if (employee.status !== 'ACTIVE') throw new Error('ACCOUNT_INACTIVE');

    const accessToken = signAccessToken({ sub: employee.id, role: employee.role });
    const refreshToken = signRefreshToken({ sub: employee.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        employeeId: employee.id,
        expiresAt: addDays(new Date(), 7),
      },
    });

    return { accessToken, refreshToken, employee: { id: employee.id, role: employee.role } };
  },

  async refresh(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) throw new Error('INVALID_TOKEN');

    const { sub } = verifyRefreshToken(token);
    const employee = await prisma.employee.findUnique({ where: { id: sub } });
    if (!employee) throw new Error('INVALID_TOKEN');

    await prisma.refreshToken.delete({ where: { token } });
    const newRefreshToken = signRefreshToken({ sub: employee.id });
    const accessToken = signAccessToken({ sub: employee.id, role: employee.role });

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, employeeId: employee.id, expiresAt: addDays(new Date(), 7) },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  },
};
```

**Step 4: Implement `apps/api/src/modules/auth/auth.controller.ts`**

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async login(req: Request, res: Response) {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid input' });

    try {
      const result = await authService.login(parse.data.email, parse.data.password);
      res.json(result);
    } catch (e: any) {
      if (e.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid email or password' });
      if (e.message === 'ACCOUNT_INACTIVE') return res.status(403).json({ error: 'Account is inactive' });
      res.status(500).json({ error: 'Server error' });
    }
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    try {
      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ message: 'Logged out' });
  },
};
```

**Step 5: Implement `apps/api/src/modules/auth/auth.routes.ts`**

```typescript
import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
```

**Step 6: Create `apps/api/src/middleware/authenticate.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

**Step 7: Register auth routes in `apps/api/src/index.ts`**

```typescript
// Add after existing imports:
import authRoutes from './modules/auth/auth.routes';

// Add after middleware setup:
app.use('/auth', authRoutes);
```

**Step 8: Install date-fns**

```bash
npm install date-fns
```

**Step 9: Run tests — expect PASS**

```bash
npm test -- --testPathPattern=auth
```

Expected: PASS all 2 tests

**Step 10: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/src/middleware/ apps/api/src/index.ts
git commit -m "feat: implement JWT auth with login, refresh, logout"
```

---

## Phase 3: Employee Records Module

### Task 7: Employee Service & API

**Files:**
- Create: `apps/api/src/modules/employees/employee.service.ts`
- Create: `apps/api/src/modules/employees/employee.controller.ts`
- Create: `apps/api/src/modules/employees/employee.routes.ts`
- Create: `apps/api/src/__tests__/employees/employee.service.test.ts`

**Step 1: Write failing service test**

`apps/api/src/__tests__/employees/employee.service.test.ts`:

```typescript
import { employeeService } from '../../modules/employees/employee.service';
import { prisma } from '../../lib/prisma';

afterAll(() => prisma.$disconnect());

describe('employeeService.list', () => {
  it('returns paginated employees', async () => {
    const result = await employeeService.list({ page: 1, limit: 10 });
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.data)).toBe(true);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=employee.service
```

**Step 3: Implement `apps/api/src/modules/employees/employee.service.ts`**

```typescript
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import bcrypt from 'bcryptjs';

interface ListParams {
  page: number;
  limit: number;
  departmentId?: string;
  status?: string;
  search?: string;
}

export const employeeService = {
  async list({ page, limit, departmentId, status, search }: ListParams) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, employeeCode: true, firstName: true, lastName: true,
          email: true, phone: true, role: true, employmentType: true,
          status: true, dateOfJoining: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ]);
    return { data, total, page, limit };
  },

  async getById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      select: {
        id: true, employeeCode: true, firstName: true, lastName: true,
        email: true, phone: true, role: true, employmentType: true,
        status: true, dateOfJoining: true, dateOfLeaving: true,
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        reports: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
      },
    });
  },

  async create(data: any, actorId: string) {
    const passwordHash = await bcrypt.hash(data.password || 'Welcome@123', 10);
    const employee = await prisma.employee.create({
      data: {
        ...data,
        passwordHash,
        password: undefined,
      },
    });
    await createAuditLog(actorId, 'CREATE', 'Employee', employee.id, { employeeCode: employee.employeeCode });
    return employee;
  },

  async update(id: string, data: any, actorId: string) {
    const employee = await prisma.employee.update({ where: { id }, data });
    await createAuditLog(actorId, 'UPDATE', 'Employee', id, data);
    return employee;
  },

  async deactivate(id: string, actorId: string) {
    const employee = await prisma.employee.update({
      where: { id },
      data: { status: 'TERMINATED', dateOfLeaving: new Date() },
    });
    await createAuditLog(actorId, 'DEACTIVATE', 'Employee', id, {});
    return employee;
  },
};
```

**Step 4: Implement `apps/api/src/modules/employees/employee.controller.ts`**

```typescript
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { employeeService } from './employee.service';
import { z } from 'zod';

const createSchema = z.object({
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']).default('EMPLOYEE'),
  employmentType: z.enum(['FULL_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  dateOfJoining: z.string(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  managerId: z.string().optional(),
});

export const employeeController = {
  async list(req: AuthRequest, res: Response) {
    const { page = '1', limit = '20', departmentId, status, search } = req.query as any;
    const result = await employeeService.list({ page: +page, limit: +limit, departmentId, status, search });
    res.json(result);
  },

  async getById(req: AuthRequest, res: Response) {
    const employee = await employeeService.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  },

  async create(req: AuthRequest, res: Response) {
    const parse = createSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      const employee = await employeeService.create(parse.data, req.user!.id);
      res.status(201).json(employee);
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'Email or employee code already exists' });
      res.status(500).json({ error: 'Server error' });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const employee = await employeeService.update(req.params.id, req.body, req.user!.id);
      res.json(employee);
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  },

  async deactivate(req: AuthRequest, res: Response) {
    await employeeService.deactivate(req.params.id, req.user!.id);
    res.json({ message: 'Employee deactivated' });
  },

  async getMe(req: AuthRequest, res: Response) {
    const employee = await employeeService.getById(req.user!.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    res.json(employee);
  },
};
```

**Step 5: Implement `apps/api/src/modules/employees/employee.routes.ts`**

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { employeeController } from './employee.controller';

const router = Router();

router.use(authenticate);

router.get('/me', employeeController.getMe);
router.get('/', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), employeeController.list);
router.get('/:id', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), employeeController.getById);
router.post('/', authorize('HR_ADMIN', 'SUPER_ADMIN'), employeeController.create);
router.patch('/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), employeeController.update);
router.delete('/:id', authorize('SUPER_ADMIN'), employeeController.deactivate);

export default router;
```

**Step 6: Register in `apps/api/src/index.ts`**

```typescript
import employeeRoutes from './modules/employees/employee.routes';
app.use('/employees', employeeRoutes);
```

**Step 7: Run tests**

```bash
npm test -- --testPathPattern=employee
```

Expected: PASS

**Step 8: Commit**

```bash
git add apps/api/src/modules/employees/
git commit -m "feat: add employee records CRUD with RBAC"
```

---

## Phase 4: Attendance & Leave Module

### Task 8: Attendance Service & API

**Files:**
- Create: `apps/api/src/modules/attendance/attendance.service.ts`
- Create: `apps/api/src/modules/attendance/attendance.controller.ts`
- Create: `apps/api/src/modules/attendance/attendance.routes.ts`

**Step 1: Implement `apps/api/src/modules/attendance/attendance.service.ts`**

```typescript
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { startOfMonth, endOfMonth } from 'date-fns';

export const attendanceService = {
  async checkIn(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: { checkIn: new Date(), status: 'present' },
      create: { employeeId, date: today, checkIn: new Date(), status: 'present' },
    });
  },

  async checkOut(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.attendanceRecord.update({
      where: { employeeId_date: { employeeId, date: today } },
      data: { checkOut: new Date() },
    });
  },

  async getMonthlySummary(employeeId: string, month: number, year: number) {
    const from = startOfMonth(new Date(year, month - 1));
    const to = endOfMonth(new Date(year, month - 1));
    return prisma.attendanceRecord.findMany({
      where: { employeeId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  },

  async regularize(employeeId: string, date: Date, checkIn: string, checkOut: string, actorId: string) {
    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: { checkIn: new Date(checkIn), checkOut: new Date(checkOut), source: 'regularized' },
      create: { employeeId, date, checkIn: new Date(checkIn), checkOut: new Date(checkOut), source: 'regularized' },
    });
    await createAuditLog(actorId, 'REGULARIZE', 'AttendanceRecord', record.id, { date, checkIn, checkOut });
    return record;
  },
};
```

**Step 2: Implement controller and routes**

`apps/api/src/modules/attendance/attendance.controller.ts`:

```typescript
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { attendanceService } from './attendance.service';

export const attendanceController = {
  async checkIn(req: AuthRequest, res: Response) {
    const record = await attendanceService.checkIn(req.user!.id);
    res.json(record);
  },

  async checkOut(req: AuthRequest, res: Response) {
    const record = await attendanceService.checkOut(req.user!.id);
    res.json(record);
  },

  async getMine(req: AuthRequest, res: Response) {
    const { month, year } = req.query as any;
    const records = await attendanceService.getMonthlySummary(
      req.user!.id, +month || new Date().getMonth() + 1, +year || new Date().getFullYear()
    );
    res.json(records);
  },

  async getForEmployee(req: AuthRequest, res: Response) {
    const { month, year } = req.query as any;
    const records = await attendanceService.getMonthlySummary(
      req.params.employeeId, +month || new Date().getMonth() + 1, +year || new Date().getFullYear()
    );
    res.json(records);
  },

  async regularize(req: AuthRequest, res: Response) {
    const { employeeId, date, checkIn, checkOut } = req.body;
    const record = await attendanceService.regularize(employeeId, new Date(date), checkIn, checkOut, req.user!.id);
    res.json(record);
  },
};
```

`apps/api/src/modules/attendance/attendance.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { attendanceController } from './attendance.controller';

const router = Router();
router.use(authenticate);

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/mine', attendanceController.getMine);
router.get('/employee/:employeeId', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), attendanceController.getForEmployee);
router.post('/regularize', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.regularize);

export default router;
```

**Step 3: Register in `apps/api/src/index.ts`**

```typescript
import attendanceRoutes from './modules/attendance/attendance.routes';
app.use('/attendance', attendanceRoutes);
```

**Step 4: Commit**

```bash
git add apps/api/src/modules/attendance/
git commit -m "feat: add attendance check-in/check-out and monthly summary"
```

---

### Task 9: Leave Service & API

**Files:**
- Create: `apps/api/src/modules/leave/leave.service.ts`
- Create: `apps/api/src/modules/leave/leave.controller.ts`
- Create: `apps/api/src/modules/leave/leave.routes.ts`
- Create: `apps/api/src/__tests__/leave/leave.service.test.ts`

**Step 1: Write failing test**

`apps/api/src/__tests__/leave/leave.service.test.ts`:

```typescript
import { leaveService } from '../../modules/leave/leave.service';

describe('leaveService.calculateDays', () => {
  it('calculates working days between two dates', () => {
    const days = leaveService.calculateDays(new Date('2026-03-02'), new Date('2026-03-06'));
    expect(days).toBe(5);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=leave.service
```

**Step 3: Implement `apps/api/src/modules/leave/leave.service.ts`**

```typescript
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { eachDayOfInterval, isWeekend, differenceInCalendarDays } from 'date-fns';

export const leaveService = {
  calculateDays(from: Date, to: Date): number {
    const days = eachDayOfInterval({ start: from, end: to });
    return days.filter(d => !isWeekend(d)).length;
  },

  async applyLeave(employeeId: string, data: { leaveTypeId: string; fromDate: Date; toDate: Date; reason?: string }) {
    const daysCount = this.calculateDays(data.fromDate, data.toDate);

    const balance = await prisma.leaveBalance.findFirst({
      where: { employeeId, leaveTypeId: data.leaveTypeId, year: new Date().getFullYear() },
    });
    if (!balance || balance.remaining < daysCount) throw new Error('INSUFFICIENT_BALANCE');

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });

    return prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: data.leaveTypeId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        daysCount,
        reason: data.reason,
        approverId: employee?.managerId || undefined,
      },
    });
  },

  async approveOrReject(requestId: string, approverId: string, action: 'APPROVED' | 'REJECTED') {
    const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('NOT_FOUND');
    if (request.status !== 'PENDING') throw new Error('ALREADY_DECIDED');

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: action, approverId, decidedAt: new Date() },
    });

    if (action === 'APPROVED') {
      await prisma.leaveBalance.updateMany({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: new Date().getFullYear() },
        data: {
          used: { increment: request.daysCount },
          remaining: { decrement: request.daysCount },
        },
      });
    }

    await createAuditLog(approverId, action, 'LeaveRequest', requestId, {});
    return updated;
  },

  async getBalances(employeeId: string) {
    return prisma.leaveBalance.findMany({
      where: { employeeId, year: new Date().getFullYear() },
      include: { leaveType: true },
    });
  },

  async listRequests(filters: { employeeId?: string; approverId?: string; status?: string }) {
    return prisma.leaveRequest.findMany({
      where: filters,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { name: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
  },
};
```

**Step 4: Implement controller and routes**

`apps/api/src/modules/leave/leave.controller.ts`:

```typescript
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { leaveService } from './leave.service';
import { z } from 'zod';

const applySchema = z.object({
  leaveTypeId: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  reason: z.string().optional(),
});

export const leaveController = {
  async apply(req: AuthRequest, res: Response) {
    const parse = applySchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      const request = await leaveService.applyLeave(req.user!.id, {
        ...parse.data,
        fromDate: new Date(parse.data.fromDate),
        toDate: new Date(parse.data.toDate),
      });
      res.status(201).json(request);
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_BALANCE') return res.status(400).json({ error: 'Insufficient leave balance' });
      res.status(500).json({ error: 'Server error' });
    }
  },

  async decide(req: AuthRequest, res: Response) {
    const { action } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    try {
      const result = await leaveService.approveOrReject(req.params.id, req.user!.id, action);
      res.json(result);
    } catch (e: any) {
      if (e.message === 'ALREADY_DECIDED') return res.status(409).json({ error: 'Already decided' });
      res.status(500).json({ error: 'Server error' });
    }
  },

  async getMyRequests(req: AuthRequest, res: Response) {
    const requests = await leaveService.listRequests({ employeeId: req.user!.id });
    res.json(requests);
  },

  async getPendingApprovals(req: AuthRequest, res: Response) {
    const requests = await leaveService.listRequests({ approverId: req.user!.id, status: 'PENDING' });
    res.json(requests);
  },

  async getMyBalances(req: AuthRequest, res: Response) {
    const balances = await leaveService.getBalances(req.user!.id);
    res.json(balances);
  },

  async getAllRequests(req: AuthRequest, res: Response) {
    const requests = await leaveService.listRequests({});
    res.json(requests);
  },
};
```

`apps/api/src/modules/leave/leave.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { leaveController } from './leave.controller';

const router = Router();
router.use(authenticate);

router.post('/apply', leaveController.apply);
router.get('/my-requests', leaveController.getMyRequests);
router.get('/my-balances', leaveController.getMyBalances);
router.get('/pending-approvals', authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'), leaveController.getPendingApprovals);
router.patch('/:id/decide', authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'), leaveController.decide);
router.get('/all', authorize('HR_ADMIN', 'SUPER_ADMIN'), leaveController.getAllRequests);

export default router;
```

**Step 5: Register in `apps/api/src/index.ts`**

```typescript
import leaveRoutes from './modules/leave/leave.routes';
app.use('/leave', leaveRoutes);
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern=leave
```

Expected: PASS

**Step 7: Commit**

```bash
git add apps/api/src/modules/leave/ apps/api/src/modules/attendance/
git commit -m "feat: add leave apply/approve/reject with balance tracking"
```

---

## Phase 5: Payroll Module

### Task 10: Payroll Service & API

**Files:**
- Create: `apps/api/src/modules/payroll/payroll.service.ts`
- Create: `apps/api/src/modules/payroll/payroll.controller.ts`
- Create: `apps/api/src/modules/payroll/payroll.routes.ts`
- Create: `apps/api/src/__tests__/payroll/payroll.service.test.ts`

**Step 1: Write failing test**

`apps/api/src/__tests__/payroll/payroll.service.test.ts`:

```typescript
import { payrollService } from '../../modules/payroll/payroll.service';

describe('payrollService.computeNetPay', () => {
  it('computes net pay from salary structure', () => {
    const result = payrollService.computeNetPay({
      basic: 50000,
      hra: 20000,
      allowances: { transport: 5000 },
      deductions: { pf: 6000, tds: 4000 },
    });
    expect(result.gross).toBe(75000);
    expect(result.totalDeductions).toBe(10000);
    expect(result.netPay).toBe(65000);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=payroll.service
```

**Step 3: Implement `apps/api/src/modules/payroll/payroll.service.ts`**

```typescript
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';

interface SalaryComponents {
  basic: number;
  hra: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
}

export const payrollService = {
  computeNetPay(salary: SalaryComponents) {
    const allowancesTotal = Object.values(salary.allowances).reduce((s, v) => s + v, 0);
    const gross = salary.basic + salary.hra + allowancesTotal;
    const totalDeductions = Object.values(salary.deductions).reduce((s, v) => s + v, 0);
    const netPay = gross - totalDeductions;
    return { gross, totalDeductions, netPay };
  },

  async initRun(month: number, year: number, actorId: string) {
    const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month, year } } });
    if (existing) throw new Error('RUN_EXISTS');

    const run = await prisma.payrollRun.create({ data: { month, year, processedById: actorId } });
    await createAuditLog(actorId, 'INIT_PAYROLL', 'PayrollRun', run.id, { month, year });
    return run;
  },

  async generatePayslips(runId: string, actorId: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new Error('NOT_FOUND');
    if (run.status === 'FINALIZED') throw new Error('ALREADY_FINALIZED');

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructures: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    const payslips = [];
    for (const emp of employees) {
      if (!emp.salaryStructures.length) continue;
      const s = emp.salaryStructures[0];
      const { gross, totalDeductions, netPay } = this.computeNetPay({
        basic: Number(s.basic),
        hra: Number(s.hra),
        allowances: s.allowances as Record<string, number>,
        deductions: s.deductions as Record<string, number>,
      });

      await prisma.payslip.upsert({
        where: { payrollRunId_employeeId: { payrollRunId: runId, employeeId: emp.id } },
        update: { gross, deductions: totalDeductions, netPay },
        create: { payrollRunId: runId, employeeId: emp.id, gross, deductions: totalDeductions, netPay },
      });
      payslips.push({ employeeId: emp.id, gross, netPay });
    }

    await createAuditLog(actorId, 'GENERATE_PAYSLIPS', 'PayrollRun', runId, { count: payslips.length });
    return payslips;
  },

  async finalizeRun(runId: string, actorId: string) {
    const run = await prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'FINALIZED', processedAt: new Date() },
    });
    await createAuditLog(actorId, 'FINALIZE_PAYROLL', 'PayrollRun', runId, {});
    return run;
  },

  async getPayslipsForEmployee(employeeId: string) {
    return prisma.payslip.findMany({
      where: { employeeId },
      include: { payrollRun: { select: { month: true, year: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getRun(runId: string) {
    return prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { payslips: { include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } } } },
    });
  },
};
```

**Step 4: Implement controller and routes**

`apps/api/src/modules/payroll/payroll.controller.ts`:

```typescript
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { payrollService } from './payroll.service';

export const payrollController = {
  async initRun(req: AuthRequest, res: Response) {
    const { month, year } = req.body;
    try {
      const run = await payrollService.initRun(+month, +year, req.user!.id);
      res.status(201).json(run);
    } catch (e: any) {
      if (e.message === 'RUN_EXISTS') return res.status(409).json({ error: 'Payroll run already exists for this period' });
      res.status(500).json({ error: 'Server error' });
    }
  },

  async generatePayslips(req: AuthRequest, res: Response) {
    try {
      const payslips = await payrollService.generatePayslips(req.params.runId, req.user!.id);
      res.json({ generated: payslips.length, payslips });
    } catch (e: any) {
      if (e.message === 'ALREADY_FINALIZED') return res.status(409).json({ error: 'Run already finalized' });
      res.status(500).json({ error: 'Server error' });
    }
  },

  async finalizeRun(req: AuthRequest, res: Response) {
    const run = await payrollService.finalizeRun(req.params.runId, req.user!.id);
    res.json(run);
  },

  async getMyPayslips(req: AuthRequest, res: Response) {
    const payslips = await payrollService.getPayslipsForEmployee(req.user!.id);
    res.json(payslips);
  },

  async getRun(req: AuthRequest, res: Response) {
    const run = await payrollService.getRun(req.params.runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  },
};
```

`apps/api/src/modules/payroll/payroll.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { payrollController } from './payroll.controller';

const router = Router();
router.use(authenticate);

router.get('/my-payslips', payrollController.getMyPayslips);
router.post('/runs', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.initRun);
router.get('/runs/:runId', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.getRun);
router.post('/runs/:runId/generate', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.generatePayslips);
router.post('/runs/:runId/finalize', authorize('HR_ADMIN', 'SUPER_ADMIN'), payrollController.finalizeRun);

export default router;
```

**Step 5: Register in `apps/api/src/index.ts`**

```typescript
import payrollRoutes from './modules/payroll/payroll.routes';
app.use('/payroll', payrollRoutes);
```

**Step 6: Run tests**

```bash
npm test -- --testPathPattern=payroll
```

Expected: PASS

**Step 7: Commit**

```bash
git add apps/api/src/modules/payroll/
git commit -m "feat: add payroll run lifecycle and payslip generation"
```

---

## Phase 6: Onboarding Module

### Task 11: Onboarding Service & API

**Files:**
- Create: `apps/api/src/modules/onboarding/onboarding.service.ts`
- Create: `apps/api/src/modules/onboarding/onboarding.controller.ts`
- Create: `apps/api/src/modules/onboarding/onboarding.routes.ts`

**Step 1: Implement `apps/api/src/modules/onboarding/onboarding.service.ts`**

```typescript
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';

export const onboardingService = {
  async createTask(data: {
    employeeId: string;
    taskName: string;
    assignedToId?: string;
    dueDate?: Date;
  }, actorId: string) {
    const task = await prisma.onboardingTask.create({ data });
    await createAuditLog(actorId, 'CREATE', 'OnboardingTask', task.id, { taskName: data.taskName });
    return task;
  },

  async updateStatus(taskId: string, status: string, actorId: string) {
    const task = await prisma.onboardingTask.update({
      where: { id: taskId },
      data: { status: status as any },
    });
    await createAuditLog(actorId, 'UPDATE_STATUS', 'OnboardingTask', taskId, { status });
    return task;
  },

  async getForEmployee(employeeId: string) {
    return prisma.onboardingTask.findMany({
      where: { employeeId },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  },

  async getOverdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.onboardingTask.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, email: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
  },
};
```

**Step 2: Implement controller**

`apps/api/src/modules/onboarding/onboarding.controller.ts`:

```typescript
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { onboardingService } from './onboarding.service';
import { z } from 'zod';

const createTaskSchema = z.object({
  employeeId: z.string(),
  taskName: z.string().min(1),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
});

export const onboardingController = {
  async createTask(req: AuthRequest, res: Response) {
    const parse = createTaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const task = await onboardingService.createTask(
      { ...parse.data, dueDate: parse.data.dueDate ? new Date(parse.data.dueDate) : undefined },
      req.user!.id
    );
    res.status(201).json(task);
  },

  async updateStatus(req: AuthRequest, res: Response) {
    const { status } = req.body;
    const task = await onboardingService.updateStatus(req.params.taskId, status, req.user!.id);
    res.json(task);
  },

  async getForEmployee(req: AuthRequest, res: Response) {
    const tasks = await onboardingService.getForEmployee(req.params.employeeId);
    res.json(tasks);
  },

  async getMyTasks(req: AuthRequest, res: Response) {
    const tasks = await onboardingService.getForEmployee(req.user!.id);
    res.json(tasks);
  },

  async getOverdue(req: AuthRequest, res: Response) {
    const tasks = await onboardingService.getOverdueTasks();
    res.json(tasks);
  },
};
```

**Step 3: Implement routes**

`apps/api/src/modules/onboarding/onboarding.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { onboardingController } from './onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my-tasks', onboardingController.getMyTasks);
router.post('/tasks', authorize('HR_ADMIN', 'SUPER_ADMIN'), onboardingController.createTask);
router.patch('/tasks/:taskId/status', onboardingController.updateStatus);
router.get('/employee/:employeeId', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), onboardingController.getForEmployee);
router.get('/overdue', authorize('HR_ADMIN', 'SUPER_ADMIN'), onboardingController.getOverdue);

export default router;
```

**Step 4: Register in `apps/api/src/index.ts`**

```typescript
import onboardingRoutes from './modules/onboarding/onboarding.routes';
app.use('/onboarding', onboardingRoutes);
```

**Step 5: Commit**

```bash
git add apps/api/src/modules/onboarding/
git commit -m "feat: add onboarding task management"
```

---

## Phase 7: Notifications

### Task 12: Email Notification Service

**Files:**
- Create: `apps/api/src/lib/notifications.ts`

**Step 1: Implement `apps/api/src/lib/notifications.ts`**

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const sender = process.env.SES_SENDER!;

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: EmailMessage) {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await ses.send(new SendEmailCommand({
    Source: sender,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: body } },
    },
  }));
}

export const emailTemplates = {
  leaveRequestSubmitted: (managerName: string, employeeName: string, dates: string) =>
    `Hi ${managerName},\n\n${employeeName} has applied for leave from ${dates}. Please review and approve/reject in the HR portal.\n\nHR Portal`,

  leaveDecision: (employeeName: string, status: string, dates: string) =>
    `Hi ${employeeName},\n\nYour leave request for ${dates} has been ${status.toLowerCase()}.\n\nHR Portal`,

  payslipPublished: (name: string, month: string) =>
    `Hi ${name},\n\nYour payslip for ${month} is now available in the HR portal.\n\nHR Portal`,

  onboardingTaskAssigned: (name: string, taskName: string, dueDate: string) =>
    `Hi ${name},\n\nYou have been assigned an onboarding task: "${taskName}" due by ${dueDate}.\n\nHR Portal`,
};
```

**Step 2: Wire notifications into leave service**

In `apps/api/src/modules/leave/leave.service.ts`, after the approve/reject update:

```typescript
// Add import at top:
import { sendEmail, emailTemplates } from '../../lib/notifications';

// After prisma.leaveRequest.update in approveOrReject:
const employee = await prisma.employee.findUnique({
  where: { id: request.employeeId },
  select: { email: true, firstName: true },
});
if (employee) {
  await sendEmail({
    to: employee.email,
    subject: `Leave request ${action.toLowerCase()}`,
    body: emailTemplates.leaveDecision(
      employee.firstName,
      action,
      `${request.fromDate.toDateString()} – ${request.toDate.toDateString()}`
    ),
  });
}
```

**Step 3: Commit**

```bash
git add apps/api/src/lib/notifications.ts apps/api/src/modules/leave/leave.service.ts
git commit -m "feat: add email notifications via azure communication services"
```

---

## Phase 8: Reports

### Task 13: Reports API

**Files:**
- Create: `apps/api/src/modules/reports/reports.service.ts`
- Create: `apps/api/src/modules/reports/reports.controller.ts`
- Create: `apps/api/src/modules/reports/reports.routes.ts`

**Step 1: Implement `apps/api/src/modules/reports/reports.service.ts`**

```typescript
import { prisma } from '../../lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const reportsService = {
  async headcount() {
    return prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
        employees: {
          where: { status: 'ACTIVE' },
          select: { designation: { select: { name: true } } },
        },
      },
    });
  },

  async attendanceSummary(month: number, year: number) {
    const from = startOfMonth(new Date(year, month - 1));
    const to = endOfMonth(new Date(year, month - 1));
    return prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, firstName: true, lastName: true, employeeCode: true,
        attendanceRecords: {
          where: { date: { gte: from, lte: to } },
          select: { date: true, status: true, checkIn: true, checkOut: true },
        },
      },
    });
  },

  async leaveUtilization(year: number) {
    return prisma.leaveBalance.findMany({
      where: { year },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { name: true } },
      },
    });
  },

  async payrollCostSummary(month: number, year: number) {
    const run = await prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    return run;
  },

  async attrition(months: number = 3) {
    const from = subMonths(new Date(), months);
    const [joiners, leavers] = await Promise.all([
      prisma.employee.count({ where: { dateOfJoining: { gte: from } } }),
      prisma.employee.count({ where: { dateOfLeaving: { gte: from } } }),
    ]);
    return { joiners, leavers, period: `Last ${months} months` };
  },

  async onboardingStatus() {
    return prisma.employee.findMany({
      where: { status: 'ACTIVE', dateOfJoining: { gte: subMonths(new Date(), 3) } },
      select: {
        firstName: true, lastName: true, dateOfJoining: true,
        onboardingTasks: { select: { taskName: true, status: true, dueDate: true } },
      },
    });
  },
};
```

**Step 2: Implement controller and routes**

`apps/api/src/modules/reports/reports.controller.ts`:

```typescript
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { reportsService } from './reports.service';

export const reportsController = {
  async headcount(_req: AuthRequest, res: Response) {
    res.json(await reportsService.headcount());
  },
  async attendance(req: AuthRequest, res: Response) {
    const { month, year } = req.query as any;
    res.json(await reportsService.attendanceSummary(+month || new Date().getMonth() + 1, +year || new Date().getFullYear()));
  },
  async leaveUtilization(req: AuthRequest, res: Response) {
    const { year } = req.query as any;
    res.json(await reportsService.leaveUtilization(+year || new Date().getFullYear()));
  },
  async payrollCost(req: AuthRequest, res: Response) {
    const { month, year } = req.query as any;
    res.json(await reportsService.payrollCostSummary(+month || new Date().getMonth() + 1, +year || new Date().getFullYear()));
  },
  async attrition(req: AuthRequest, res: Response) {
    const { months } = req.query as any;
    res.json(await reportsService.attrition(+months || 3));
  },
  async onboarding(_req: AuthRequest, res: Response) {
    res.json(await reportsService.onboardingStatus());
  },
};
```

`apps/api/src/modules/reports/reports.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { reportsController } from './reports.controller';

const router = Router();
router.use(authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'));

router.get('/headcount', reportsController.headcount);
router.get('/attendance', reportsController.attendance);
router.get('/leave-utilization', reportsController.leaveUtilization);
router.get('/payroll-cost', reportsController.payrollCost);
router.get('/attrition', reportsController.attrition);
router.get('/onboarding', reportsController.onboarding);

export default router;
```

**Step 3: Register in `apps/api/src/index.ts`**

```typescript
import reportsRoutes from './modules/reports/reports.routes';
app.use('/reports', reportsRoutes);
```

**Step 4: Commit**

```bash
git add apps/api/src/modules/reports/
git commit -m "feat: add HR reports API (headcount, attendance, payroll, attrition)"
```

---

## Phase 9: Frontend

### Task 14: Frontend Foundation — Auth, Routing, Layout

**Files:**
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/store/auth.store.ts`
- Create: `apps/web/src/pages/Login.tsx`
- Create: `apps/web/src/components/Layout/AppLayout.tsx`
- Create: `apps/web/src/router/index.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`

**Step 1: Create `apps/web/src/api/client.ts`**

```typescript
import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) { window.location.href = '/login'; return; }
      const res = await axios.post('/api/auth/refresh', { refreshToken });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      original.headers.Authorization = `Bearer ${res.data.accessToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);
```

**Step 2: Create `apps/web/src/store/auth.store.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { id: string; role: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: any, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: 'auth-store' }
  )
);
```

**Step 3: Create `apps/web/src/pages/Login.tsx`**

```typescript
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const res = await api.post('/auth/login', values);
      login(res.data.employee, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch {
      message.error('Invalid email or password');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>HR Portal</Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Sign In</Button>
        </Form>
      </Card>
    </div>
  );
}
```

**Step 4: Create `apps/web/src/components/Layout/AppLayout.tsx`**

```typescript
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
  TeamOutlined, CalendarOutlined, DollarOutlined, CheckSquareOutlined,
  BarChartOutlined, LogoutOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isAdmin = ['HR_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  const items = [
    { key: '/dashboard', icon: <TeamOutlined />, label: 'Dashboard' },
    { key: '/employees', icon: <TeamOutlined />, label: 'Employees', hidden: !isAdmin },
    { key: '/attendance', icon: <CalendarOutlined />, label: 'Attendance' },
    { key: '/leave', icon: <CalendarOutlined />, label: 'Leave' },
    { key: '/payroll', icon: <DollarOutlined />, label: 'Payroll' },
    { key: '/onboarding', icon: <CheckSquareOutlined />, label: 'Onboarding', hidden: !isAdmin },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports', hidden: !isAdmin },
  ].filter(i => !i.hidden);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ color: 'white', padding: 16, fontWeight: 'bold', fontSize: 18 }}>HR Portal</div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
        <Menu
          theme="dark"
          style={{ position: 'absolute', bottom: 0, width: '100%' }}
          items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout' }]}
          onClick={() => { logout(); navigate('/login'); }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', fontWeight: 'bold' }}>
          Welcome, {user?.id}
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

**Step 5: Create `apps/web/src/router/index.tsx`**

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Login from '../pages/Login';
import AppLayout from '../components/Layout/AppLayout';

function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', lazy: () => import('../pages/Dashboard').then(m => ({ Component: m.default })) },
      { path: 'employees/*', lazy: () => import('../pages/Employees').then(m => ({ Component: m.default })) },
      { path: 'attendance/*', lazy: () => import('../pages/Attendance').then(m => ({ Component: m.default })) },
      { path: 'leave/*', lazy: () => import('../pages/Leave').then(m => ({ Component: m.default })) },
      { path: 'payroll/*', lazy: () => import('../pages/Payroll').then(m => ({ Component: m.default })) },
      { path: 'onboarding/*', lazy: () => import('../pages/Onboarding').then(m => ({ Component: m.default })) },
      { path: 'reports/*', lazy: () => import('../pages/Reports').then(m => ({ Component: m.default })) },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
```

**Step 6: Update `apps/web/src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { router } from './router';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Step 7: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add frontend auth, layout, and router scaffold"
```

---

### Task 15: Frontend Pages — Employees, Attendance, Leave, Payroll, Onboarding

**Files:**
- Create: `apps/web/src/pages/Dashboard.tsx`
- Create: `apps/web/src/pages/Employees.tsx`
- Create: `apps/web/src/pages/Attendance.tsx`
- Create: `apps/web/src/pages/Leave.tsx`
- Create: `apps/web/src/pages/Payroll.tsx`
- Create: `apps/web/src/pages/Onboarding.tsx`
- Create: `apps/web/src/pages/Reports.tsx`

**Step 1: Create `apps/web/src/pages/Dashboard.tsx`**

```typescript
import { Card, Row, Col, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Dashboard() {
  const { data: headcount } = useQuery({
    queryKey: ['headcount'],
    queryFn: () => api.get('/reports/headcount').then(r => r.data),
  });

  const total = headcount?.reduce((s: number, d: any) => s + d._count.employees, 0) || 0;

  return (
    <div>
      <h2>Dashboard</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="Total Employees" value={total} /></Card>
        </Col>
      </Row>
    </div>
  );
}
```

**Step 2: Create `apps/web/src/pages/Employees.tsx`**

```typescript
import { Table, Button, Space, Tag, Input } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState } from 'react';

export default function Employees() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => api.get('/employees', { params: { search, limit: 50 } }).then(r => r.data),
  });

  const columns = [
    { title: 'Code', dataIndex: 'employeeCode' },
    { title: 'Name', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { title: 'Department', render: (_: any, r: any) => r.department?.name },
    { title: 'Designation', render: (_: any, r: any) => r.designation?.name },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s}</Tag> },
    { title: 'Joining Date', dataIndex: 'dateOfJoining', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <h2>Employees</h2>
        <Input.Search placeholder="Search..." onSearch={setSearch} style={{ width: 250 }} />
      </Space>
      <Table columns={columns} dataSource={data?.data} loading={isLoading} rowKey="id" />
    </div>
  );
}
```

**Step 3: Create `apps/web/src/pages/Attendance.tsx`**

```typescript
import { Table, Button, Card, Space, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Attendance() {
  const qc = useQueryClient();
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-mine', month, year],
    queryFn: () => api.get('/attendance/mine', { params: { month, year } }).then(r => r.data),
  });

  const checkIn = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onSuccess: () => { message.success('Checked in'); qc.invalidateQueries({ queryKey: ['attendance-mine'] }); },
  });

  const checkOut = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onSuccess: () => { message.success('Checked out'); qc.invalidateQueries({ queryKey: ['attendance-mine'] }); },
  });

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Check In', dataIndex: 'checkIn', render: (d: string) => d ? new Date(d).toLocaleTimeString() : '-' },
    { title: 'Check Out', dataIndex: 'checkOut', render: (d: string) => d ? new Date(d).toLocaleTimeString() : '-' },
    { title: 'Status', dataIndex: 'status' },
  ];

  return (
    <div>
      <h2>Attendance</h2>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" onClick={() => checkIn.mutate()} loading={checkIn.isPending}>Check In</Button>
          <Button onClick={() => checkOut.mutate()} loading={checkOut.isPending}>Check Out</Button>
        </Space>
      </Card>
      <Table columns={columns} dataSource={data} loading={isLoading} rowKey="id" />
    </div>
  );
}
```

**Step 4: Create `apps/web/src/pages/Leave.tsx`**

```typescript
import { Tabs, Table, Button, Form, Select, DatePicker, Input, Modal, Tag, message, Card, Statistic, Row, Col } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState } from 'react';

export default function Leave() {
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: requests } = useQuery({ queryKey: ['my-leave'], queryFn: () => api.get('/leave/my-requests').then(r => r.data) });
  const { data: balances } = useQuery({ queryKey: ['my-balances'], queryFn: () => api.get('/leave/my-balances').then(r => r.data) });
  const { data: pending } = useQuery({ queryKey: ['pending-approvals'], queryFn: () => api.get('/leave/pending-approvals').then(r => r.data) });

  const apply = useMutation({
    mutationFn: (v: any) => api.post('/leave/apply', { ...v, fromDate: v.dates[0].toISOString(), toDate: v.dates[1].toISOString() }),
    onSuccess: () => { message.success('Leave applied'); setApplyOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ['my-leave'] }); },
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.patch(`/leave/${id}/decide`, { action }),
    onSuccess: () => { message.success('Decision saved'); qc.invalidateQueries({ queryKey: ['pending-approvals'] }); },
  });

  const cols = [
    { title: 'Type', render: (_: any, r: any) => r.leaveType?.name },
    { title: 'From', dataIndex: 'fromDate', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'To', dataIndex: 'toDate', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Days', dataIndex: 'daysCount' },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange'}>{s}</Tag> },
  ];

  const approvalCols = [
    { title: 'Employee', render: (_: any, r: any) => `${r.employee?.firstName} ${r.employee?.lastName}` },
    ...cols,
    {
      title: 'Action', render: (_: any, r: any) => (
        <Button.Group>
          <Button size="small" type="primary" onClick={() => decide.mutate({ id: r.id, action: 'APPROVED' })}>Approve</Button>
          <Button size="small" danger onClick={() => decide.mutate({ id: r.id, action: 'REJECTED' })}>Reject</Button>
        </Button.Group>
      ),
    },
  ];

  return (
    <div>
      <h2>Leave Management</h2>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {balances?.map((b: any) => (
          <Col key={b.id} span={6}>
            <Card><Statistic title={b.leaveType.name} value={b.remaining} suffix={`/ ${b.entitled}`} /></Card>
          </Col>
        ))}
      </Row>
      <Button type="primary" onClick={() => setApplyOpen(true)} style={{ marginBottom: 16 }}>Apply for Leave</Button>
      <Tabs items={[
        { key: '1', label: 'My Requests', children: <Table columns={cols} dataSource={requests} rowKey="id" /> },
        { key: '2', label: 'Pending Approvals', children: <Table columns={approvalCols} dataSource={pending} rowKey="id" /> },
      ]} />
      <Modal open={applyOpen} title="Apply for Leave" onCancel={() => setApplyOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(v) => apply.mutate(v)}>
          <Form.Item name="leaveTypeId" label="Leave Type" rules={[{ required: true }]}>
            <Select options={balances?.map((b: any) => ({ label: b.leaveType.name, value: b.leaveTypeId }))} />
          </Form.Item>
          <Form.Item name="dates" label="Dates" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

**Step 5: Create `apps/web/src/pages/Payroll.tsx`**

```typescript
import { Table, Button, Tag, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

export default function Payroll() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const isAdmin = ['HR_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: payslips } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => api.get('/payroll/my-payslips').then(r => r.data),
  });

  const initRun = useMutation({
    mutationFn: () => {
      const now = new Date();
      return api.post('/payroll/runs', { month: now.getMonth() + 1, year: now.getFullYear() });
    },
    onSuccess: () => { message.success('Payroll run initiated'); qc.invalidateQueries({ queryKey: ['my-payslips'] }); },
    onError: () => message.error('Failed to initiate run'),
  });

  const columns = [
    { title: 'Month', render: (_: any, r: any) => `${r.payrollRun?.month}/${r.payrollRun?.year}` },
    { title: 'Gross', dataIndex: 'gross', render: (v: string) => `₹${Number(v).toLocaleString()}` },
    { title: 'Deductions', dataIndex: 'deductions', render: (v: string) => `₹${Number(v).toLocaleString()}` },
    { title: 'Net Pay', dataIndex: 'netPay', render: (v: string) => `₹${Number(v).toLocaleString()}` },
    { title: 'Status', render: (_: any, r: any) => <Tag color={r.payrollRun?.status === 'FINALIZED' ? 'green' : 'orange'}>{r.payrollRun?.status}</Tag> },
  ];

  return (
    <div>
      <h2>Payroll</h2>
      {isAdmin && <Button type="primary" onClick={() => initRun.mutate()} style={{ marginBottom: 16 }}>Initiate Payroll Run</Button>}
      <Table columns={columns} dataSource={payslips} rowKey="id" />
    </div>
  );
}
```

**Step 6: Create `apps/web/src/pages/Onboarding.tsx`**

```typescript
import { Table, Tag, Button, Modal, Form, Input, DatePicker, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState } from 'react';

export default function Onboarding() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: overdue } = useQuery({ queryKey: ['overdue-tasks'], queryFn: () => api.get('/onboarding/overdue').then(r => r.data) });

  const create = useMutation({
    mutationFn: (v: any) => api.post('/onboarding/tasks', { ...v, dueDate: v.dueDate?.toISOString() }),
    onSuccess: () => { message.success('Task created'); setOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ['overdue-tasks'] }); },
  });

  const cols = [
    { title: 'Employee', render: (_: any, r: any) => `${r.employee?.firstName} ${r.employee?.lastName}` },
    { title: 'Task', dataIndex: 'taskName' },
    { title: 'Assigned To', render: (_: any, r: any) => r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : 'Unassigned' },
    { title: 'Due', dataIndex: 'dueDate', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'COMPLETED' ? 'green' : s === 'OVERDUE' ? 'red' : 'orange'}>{s}</Tag> },
  ];

  return (
    <div>
      <h2>Onboarding</h2>
      <Button type="primary" onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>Create Task</Button>
      <Table columns={cols} dataSource={overdue} rowKey="id" />
      <Modal open={open} title="Create Onboarding Task" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="taskName" label="Task Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="assignedToId" label="Assign To (Employee ID)"><Input /></Form.Item>
          <Form.Item name="dueDate" label="Due Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

**Step 7: Create `apps/web/src/pages/Reports.tsx`**

```typescript
import { Tabs, Table, Card, Statistic, Row, Col } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Reports() {
  const { data: headcount } = useQuery({ queryKey: ['headcount'], queryFn: () => api.get('/reports/headcount').then(r => r.data) });
  const { data: attrition } = useQuery({ queryKey: ['attrition'], queryFn: () => api.get('/reports/attrition').then(r => r.data) });

  return (
    <div>
      <h2>Reports</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Joiners (3mo)" value={attrition?.joiners || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="Leavers (3mo)" value={attrition?.leavers || 0} /></Card></Col>
      </Row>
      <Tabs items={[
        {
          key: '1',
          label: 'Headcount by Department',
          children: (
            <Table
              rowKey="id"
              dataSource={headcount}
              columns={[
                { title: 'Department', dataIndex: 'name' },
                { title: 'Employees', render: (_: any, r: any) => r._count.employees },
              ]}
            />
          ),
        },
      ]} />
    </div>
  );
}
```

**Step 8: Run frontend build check**

```bash
cd apps/web && npm run build
```

Expected: Build succeeds with no type errors.

**Step 9: Commit**

```bash
git add apps/web/src/pages/
git commit -m "feat: add all frontend pages (employees, attendance, leave, payroll, onboarding, reports)"
```

---

## Phase 10: Azure Infrastructure & CI/CD

### Task 16: AWS Infrastructure Setup

**Files:**
- Create: `infra/cloudformation.yml`
- Create: `infra/eb-config/.ebextensions/nodecommand.config`

**Step 1: Create `infra/cloudformation.yml`**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: HR Portal Infrastructure — ap-south-1

Parameters:
  AppName:
    Type: String
    Default: hr-portal
  DBPassword:
    Type: String
    NoEcho: true
  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]

Resources:
  # S3 — Documents bucket
  DocumentsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "${AppName}-documents-${Environment}"
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  # S3 — Payslips bucket
  PayslipsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "${AppName}-payslips-${Environment}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  # S3 — Frontend (React static site)
  FrontendBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "${AppName}-frontend-${Environment}"
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: index.html

  # CloudFront distribution for React frontend
  FrontendDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt FrontendBucket.RegionalDomainName
            S3OriginConfig:
              OriginAccessIdentity: ''
        DefaultCacheBehavior:
          ViewerProtocolPolicy: redirect-to-https
          TargetOriginId: S3Origin
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6  # CachingOptimized
        DefaultRootObject: index.html
        Enabled: true
        HttpVersion: http2

  # RDS PostgreSQL
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: HR Portal DB subnet group
      SubnetIds: !Split [',', !ImportValue DefaultSubnetIds]

  HRPortalDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub "${AppName}-db-${Environment}"
      DBInstanceClass: db.t3.medium
      Engine: postgres
      EngineVersion: '16'
      MasterUsername: hrportal
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: '32'
      StorageType: gp2
      MultiAZ: false
      BackupRetentionPeriod: 7
      DeletionProtection: true

  # Secrets Manager
  AppSecrets:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub "${AppName}/${Environment}/secrets"
      Description: HR Portal application secrets
      SecretString: !Sub |
        {
          "JWT_SECRET": "REPLACE_ME",
          "JWT_REFRESH_SECRET": "REPLACE_ME",
          "DATABASE_URL": "postgresql://hrportal:${DBPassword}@${HRPortalDB.Endpoint.Address}:5432/hr_portal"
        }

  # Elastic Beanstalk Application
  EBApplication:
    Type: AWS::ElasticBeanstalk::Application
    Properties:
      ApplicationName: !Sub "${AppName}-api"

  EBEnvironment:
    Type: AWS::ElasticBeanstalk::Environment
    Properties:
      ApplicationName: !Ref EBApplication
      EnvironmentName: !Sub "${AppName}-api-${Environment}"
      SolutionStackName: "64bit Amazon Linux 2023 v6.1.0 running Node.js 20"
      OptionSettings:
        - Namespace: aws:autoscaling:launchconfiguration
          OptionName: InstanceType
          Value: t3.medium
        - Namespace: aws:elasticbeanstalk:environment
          OptionName: EnvironmentType
          Value: SingleInstance
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: NODE_ENV
          Value: !Ref Environment
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: AWS_REGION
          Value: ap-south-1

Outputs:
  FrontendURL:
    Value: !Sub "https://${FrontendDistribution.DomainName}"
  DBEndpoint:
    Value: !GetAtt HRPortalDB.Endpoint.Address
```

**Step 2: Create `infra/eb-config/.ebextensions/nodecommand.config`**

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "node dist/index.js"
  aws:elasticbeanstalk:application:environment:
    PORT: 8080
```

**Step 3: Commit infra**

```bash
git add infra/
git commit -m "infra: add aws cloudformation templates for eb, rds, s3, cloudfront, secrets manager"
```

---

### Task 17: GitHub Actions CI/CD Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

**Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-api:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: hr_portal_test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build -w apps/api
      - run: npx prisma migrate deploy
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/hr_portal_test
      - run: npm test -w apps/api
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/hr_portal_test
          JWT_SECRET: test-secret-minimum-32-characters-here
          JWT_REFRESH_SECRET: test-refresh-minimum-32-characters

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build -w apps/web
      - run: npm test -w apps/web
```

**Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build -w apps/api
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v22
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: hr-portal-api
          environment_name: hr-portal-api-production
          region: ap-south-1
          deployment_package: apps/api

  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build -w apps/web
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - name: Sync to S3
        run: aws s3 sync apps/web/dist s3://hr-portal-frontend-production --delete
      - name: Invalidate CloudFront cache
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

**Step 3: Commit**

```bash
git add .github/
git commit -m "ci: add github actions for ci and azure deployment"
```

---

## Phase 11: Final Integration & Smoke Tests

### Task 18: End-to-End Smoke Test

**Files:**
- Create: `apps/api/src/__tests__/integration/smoke.test.ts`

**Step 1: Write smoke test covering the full user journey**

`apps/api/src/__tests__/integration/smoke.test.ts`:

```typescript
import request from 'supertest';
import app from '../../index';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';

let accessToken: string;
let employeeId: string;

beforeAll(async () => {
  await prisma.employee.deleteMany({ where: { email: 'smoke@test.com' } });
  const emp = await prisma.employee.create({
    data: {
      employeeCode: 'SMK001',
      firstName: 'Smoke',
      lastName: 'Test',
      email: 'smoke@test.com',
      passwordHash: await bcrypt.hash('Test@123', 10),
      role: 'HR_ADMIN',
      dateOfJoining: new Date(),
    },
  });
  employeeId = emp.id;
});

afterAll(async () => {
  await prisma.employee.deleteMany({ where: { email: 'smoke@test.com' } });
  await prisma.$disconnect();
});

describe('Smoke: full HR flow', () => {
  it('logs in as HR admin', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'smoke@test.com', password: 'Test@123' });
    expect(res.status).toBe(200);
    accessToken = res.body.accessToken;
  });

  it('gets employee list', async () => {
    const res = await request(app).get('/employees').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('checks in', async () => {
    const res = await request(app).post('/attendance/check-in').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('gets attendance', async () => {
    const res = await request(app).get('/attendance/mine').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

**Step 2: Run smoke test**

```bash
npm test -- --testPathPattern=smoke
```

Expected: All PASS

**Step 3: Final commit**

```bash
git add apps/api/src/__tests__/integration/
git commit -m "test: add integration smoke test for full HR flow"
```

---

## Summary

| Phase | Tasks | Deliverable |
|---|---|---|
| 0 | 1–3 | Monorepo scaffold, frontend + backend boilerplate |
| 1 | 4 | Full Prisma schema with all HR entities |
| 2 | 5–6 | JWT auth — login, refresh, logout, RBAC middleware |
| 3 | 7 | Employee CRUD with audit logging |
| 4 | 8–9 | Attendance check-in/out + Leave apply/approve |
| 5 | 10 | Payroll runs, payslip generation, finalization |
| 6 | 11 | Onboarding task management |
| 7 | 12 | Email notifications via Azure Communication Services |
| 8 | 13 | Reports API (headcount, attendance, leave, payroll, attrition) |
| 9 | 14–15 | All frontend pages wired to backend |
| 10 | 16–17 | AWS CloudFormation infra + GitHub Actions CI/CD |
| 11 | 18 | Integration smoke tests |
