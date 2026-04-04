# Backend Specification — HR Management Portal

**Date:** 2026-02-28
**Version:** 1.1 (updated: TypeScript → JavaScript)
**Parent BRD:** [2026-02-28-hr-management-portal-design.md](./2026-02-28-hr-management-portal-design.md)

---

## 1. Tech Stack

| Concern | Library / Tool | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Language | JavaScript | ES2022 (CommonJS modules) |
| Framework | Express | 5 |
| ORM | Prisma | 5 |
| Database | PostgreSQL | 16 |
| Auth | jsonwebtoken + bcryptjs | — |
| Validation | Joi | 17 |
| File storage | AWS SDK v3 — `@aws-sdk/client-s3` | 3 |
| Email | AWS SDK v3 — `@aws-sdk/client-ses` | 3 |
| Dev server | nodemon | — |
| Testing | Jest + Supertest | — |
| Process manager | PM2 (production) | — |
| Hosting | AWS Elastic Beanstalk (EC2 t3.medium) | — |

> **Note:** No build step required. JavaScript source files are run directly by Node.js. Prisma still uses `schema.prisma` for schema definition and generates its own client.

---

## 2. Folder Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma              # Full data model
│   ├── migrations/                # Prisma migration history
│   └── seed.js                    # Dev seed (super admin + sample data)
├── src/
│   ├── index.js                   # Express app bootstrap, route registration
│   ├── lib/
│   │   ├── prisma.js              # Prisma client singleton
│   │   ├── jwt.js                 # signAccessToken, signRefreshToken, verify*
│   │   ├── s3.js                  # getPresignedUploadUrl, getPresignedDownloadUrl
│   │   ├── notifications.js       # sendEmail via AWS SES
│   │   └── audit.js               # createAuditLog helper
│   ├── middleware/
│   │   ├── authenticate.js        # JWT bearer token validation → req.user
│   │   ├── authorize.js           # Role-based access control guard
│   │   └── errorHandler.js        # Global Express error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.routes.js
│   │   ├── employees/
│   │   │   ├── employee.service.js
│   │   │   ├── employee.controller.js
│   │   │   └── employee.routes.js
│   │   ├── attendance/
│   │   │   ├── attendance.service.js
│   │   │   ├── attendance.controller.js
│   │   │   └── attendance.routes.js
│   │   ├── leave/
│   │   │   ├── leave.service.js
│   │   │   ├── leave.controller.js
│   │   │   └── leave.routes.js
│   │   ├── payroll/
│   │   │   ├── payroll.service.js
│   │   │   ├── payroll.controller.js
│   │   │   └── payroll.routes.js
│   │   ├── onboarding/
│   │   │   ├── onboarding.service.js
│   │   │   ├── onboarding.controller.js
│   │   │   └── onboarding.routes.js
│   │   └── reports/
│   │       ├── reports.service.js
│   │       ├── reports.controller.js
│   │       └── reports.routes.js
│   └── __tests__/
│       ├── lib/
│       │   └── jwt.test.js
│       ├── auth/
│       │   └── auth.test.js
│       ├── employees/
│       │   └── employee.service.test.js
│       ├── leave/
│       │   └── leave.service.test.js
│       ├── payroll/
│       │   └── payroll.service.test.js
│       └── integration/
│           └── smoke.test.js
├── .env.example
├── jest.config.js
└── package.json
```

---

## 3. Package Configuration

### `apps/api/package.json` scripts

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "jest --runInBand"
  }
}
```

### Dependencies

```bash
# Runtime
npm install express cors helmet morgan bcryptjs jsonwebtoken \
  @prisma/client @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  @aws-sdk/client-ses joi date-fns dotenv

# Dev
npm install -D nodemon jest supertest prisma
```

> No `typescript`, `ts-node`, `ts-jest`, or `@types/*` packages needed.

### `jest.config.js`

```js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
};
```

---

## 4. Environment Variables

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hr_portal

# JWT
JWT_SECRET=minimum-32-character-secret-here
JWT_REFRESH_SECRET=minimum-32-character-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_DOCUMENTS=hr-portal-documents
S3_BUCKET_PAYSLIPS=hr-portal-payslips

# Email
SES_SENDER=noreply@yourcompany.com
```

In production, all secrets are pulled from **AWS Secrets Manager** at startup rather than environment variables.

---

## 5. Code Patterns

### Entry point `src/index.js`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.routes');
const employeeRoutes = require('./modules/employees/employee.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const leaveRoutes = require('./modules/leave/leave.routes');
const payrollRoutes = require('./modules/payroll/payroll.routes');
const onboardingRoutes = require('./modules/onboarding/onboarding.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leave', leaveRoutes);
app.use('/payroll', payrollRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/reports', reportsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));

module.exports = app;
```

### Lib — `src/lib/prisma.js`

```js
const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = { prisma };
```

### Lib — `src/lib/jwt.js`

```js
const jwt = require('jsonwebtoken');

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
```

### Middleware — `src/middleware/authenticate.js`

```js
const { verifyAccessToken } = require('../lib/jwt');

function authenticate(req, res, next) {
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

module.exports = { authenticate };
```

### Middleware — `src/middleware/authorize.js`

```js
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authorize };
```

### Middleware — `src/middleware/errorHandler.js`

```js
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message;
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
```

### Validation — Joi schemas (example for auth)

```js
const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };
}

module.exports = { loginSchema, validate };
```

---

## 6. API Endpoints

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Email + password → access + refresh tokens |
| POST | `/auth/refresh` | None | Refresh token → new token pair |
| POST | `/auth/logout` | None | Invalidate refresh token |

---

### Employees — `/employees`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/employees` | MANAGER, HR_ADMIN, SUPER_ADMIN | List with pagination, search, filters |
| GET | `/employees/me` | All | Get own profile |
| GET | `/employees/:id` | MANAGER, HR_ADMIN, SUPER_ADMIN | Get employee by ID |
| POST | `/employees` | HR_ADMIN, SUPER_ADMIN | Create new employee |
| PATCH | `/employees/:id` | HR_ADMIN, SUPER_ADMIN | Update employee fields |
| DELETE | `/employees/:id` | SUPER_ADMIN | Deactivate (soft delete — sets status = TERMINATED) |
| GET | `/employees/:id/documents` | HR_ADMIN, SUPER_ADMIN | List documents |
| POST | `/employees/:id/documents/upload-url` | HR_ADMIN, SUPER_ADMIN | Get S3 presigned upload URL |
| DELETE | `/employees/:id/documents/:docId` | HR_ADMIN, SUPER_ADMIN | Delete document |

**Query params for `GET /employees`:**
- `page` (default: 1), `limit` (default: 20, max: 100)
- `search` (searches firstName, lastName, email, employeeCode)
- `departmentId`, `designationId`, `status`, `employmentType`

---

### Departments & Designations — `/departments`, `/designations`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/departments` | All | List all departments |
| POST | `/departments` | HR_ADMIN, SUPER_ADMIN | Create department |
| PATCH | `/departments/:id` | HR_ADMIN, SUPER_ADMIN | Update department |
| GET | `/designations` | All | List (optionally filtered by departmentId) |
| POST | `/designations` | HR_ADMIN, SUPER_ADMIN | Create designation |
| PATCH | `/designations/:id` | HR_ADMIN, SUPER_ADMIN | Update designation |

---

### Attendance — `/attendance`

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/attendance/check-in` | All | Record check-in for today |
| POST | `/attendance/check-out` | All | Record check-out for today |
| GET | `/attendance/mine` | All | My records (`?month=&year=`) |
| GET | `/attendance/employee/:id` | MANAGER, HR_ADMIN, SUPER_ADMIN | Employee records |
| POST | `/attendance/regularize` | HR_ADMIN, SUPER_ADMIN | Correct past attendance entry |
| GET | `/attendance/team` | MANAGER, HR_ADMIN, SUPER_ADMIN | Team summary (`?month=&year=`) |

---

### Leave — `/leave`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/leave/types` | All | List leave types |
| POST | `/leave/types` | HR_ADMIN, SUPER_ADMIN | Create leave type |
| PATCH | `/leave/types/:id` | HR_ADMIN, SUPER_ADMIN | Update leave type |
| POST | `/leave/apply` | All | Submit leave request |
| GET | `/leave/my-requests` | All | My leave requests |
| GET | `/leave/my-balances` | All | My leave balances for current year |
| GET | `/leave/pending-approvals` | MANAGER, HR_ADMIN, SUPER_ADMIN | Requests pending approval by me |
| GET | `/leave/all` | HR_ADMIN, SUPER_ADMIN | All leave requests (filterable) |
| PATCH | `/leave/:id/decide` | MANAGER, HR_ADMIN, SUPER_ADMIN | Approve or reject (`{ action: 'APPROVED' \| 'REJECTED' }`) |
| DELETE | `/leave/:id` | All (own only) | Cancel PENDING request |

---

### Payroll — `/payroll`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/payroll/my-payslips` | All | My payslips with payroll run info |
| GET | `/payroll/my-payslips/:id/download` | All | Presigned S3 URL for payslip PDF |
| POST | `/payroll/runs` | HR_ADMIN, SUPER_ADMIN | Initiate new payroll run |
| GET | `/payroll/runs` | HR_ADMIN, SUPER_ADMIN | List all payroll runs |
| GET | `/payroll/runs/:id` | HR_ADMIN, SUPER_ADMIN | Run details with payslips |
| POST | `/payroll/runs/:id/generate` | HR_ADMIN, SUPER_ADMIN | Compute payslips for all active employees |
| POST | `/payroll/runs/:id/finalize` | HR_ADMIN, SUPER_ADMIN | Lock run and publish payslips |
| GET | `/payroll/salary-structure/:employeeId` | HR_ADMIN, SUPER_ADMIN | Employee salary history |
| POST | `/payroll/salary-structure` | HR_ADMIN, SUPER_ADMIN | Create/update salary structure |

---

### Onboarding — `/onboarding`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/onboarding/my-tasks` | All | Tasks assigned to me |
| POST | `/onboarding/tasks` | HR_ADMIN, SUPER_ADMIN | Create onboarding task |
| PATCH | `/onboarding/tasks/:id/status` | All | Update task status |
| GET | `/onboarding/employee/:id` | HR_ADMIN, SUPER_ADMIN, MANAGER | All tasks for an employee |
| GET | `/onboarding/overdue` | HR_ADMIN, SUPER_ADMIN | All overdue tasks |
| DELETE | `/onboarding/tasks/:id` | HR_ADMIN, SUPER_ADMIN | Remove task |

---

### Reports — `/reports`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/reports/headcount` | HR_ADMIN, SUPER_ADMIN | Active employees by dept/designation |
| GET | `/reports/attendance` | HR_ADMIN, SUPER_ADMIN | Monthly summary (`?month=&year=`) |
| GET | `/reports/leave-utilization` | HR_ADMIN, SUPER_ADMIN | Leave taken vs. balance (`?year=`) |
| GET | `/reports/payroll-cost` | HR_ADMIN, SUPER_ADMIN | Dept-wise cost (`?month=&year=`) |
| GET | `/reports/attrition` | HR_ADMIN, SUPER_ADMIN | Joiners/leavers (`?months=3`) |
| GET | `/reports/onboarding` | HR_ADMIN, SUPER_ADMIN | Onboarding task completion status |

---

## 7. Authentication & Authorization

### JWT Strategy
- **Access token:** short-lived (15 min), signed with `JWT_SECRET`
- **Refresh token:** long-lived (7 days), signed with `JWT_REFRESH_SECRET`, stored in `RefreshToken` table
- On login, both tokens issued; refresh token stored in DB
- On refresh, old token deleted and new pair issued (rotation)
- On logout, refresh token deleted from DB

### RBAC Middleware

```
authenticate  →  verifies Bearer token → attaches req.user = { id, role }
authorize(...roles)  →  checks req.user.role is in allowed roles list
```

Applied at route level per endpoint. Example:
```js
router.post('/employees', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), controller.create);
```

### Role Hierarchy
```
SUPER_ADMIN > HR_ADMIN > MANAGER > EMPLOYEE
```
Roles are not inherited in middleware — each endpoint explicitly declares allowed roles.

---

## 8. Data Model (Prisma Schema)

### Enums
```prisma
enum Role            { EMPLOYEE, MANAGER, HR_ADMIN, SUPER_ADMIN }
enum EmploymentType  { FULL_TIME, CONTRACT, INTERN }
enum EmployeeStatus  { ACTIVE, ON_LEAVE, TERMINATED }
enum LeaveRequestStatus { PENDING, APPROVED, REJECTED }
enum PayrollRunStatus   { DRAFT, FINALIZED }
enum OnboardingTaskStatus { PENDING, IN_PROGRESS, COMPLETED, OVERDUE }
```

### Entity Relationships

```
Employee ──< EmployeeDocument
Employee ──< AttendanceRecord  (unique per employee+date)
Employee ──< LeaveRequest      (as applicant)
Employee ──< LeaveRequest      (as approver)
Employee ──< LeaveBalance      (unique per employee+leaveType+year)
Employee ──< SalaryStructure
Employee ──< Payslip
Employee ──< OnboardingTask    (as new hire)
Employee ──< OnboardingTask    (as assignee)
Employee ──< RefreshToken
Employee ──< AuditLog          (as actor)
Employee >── Department        (member)
Employee >── Designation
Employee >── Employee          (manager self-reference)
Employee >── Department        (head of dept)
Department ──< Designation
PayrollRun ──< Payslip
LeaveType ──< LeaveRequest
LeaveType ──< LeaveBalance
```

### Key Constraints
- `AttendanceRecord`: unique on `(employeeId, date)`
- `LeaveBalance`: unique on `(employeeId, leaveTypeId, year)`
- `Payslip`: unique on `(payrollRunId, employeeId)`
- `PayrollRun`: unique on `(month, year)`
- `Employee.email`: unique
- `Employee.employeeCode`: unique

---

## 9. Business Logic

### Leave Application
1. Validate `fromDate <= toDate`
2. Calculate `daysCount` = working days (exclude weekends) between dates
3. Check `LeaveBalance.remaining >= daysCount` — throw `INSUFFICIENT_BALANCE` if not
4. Create `LeaveRequest` with status `PENDING`, `approverId` = employee's `managerId`
5. Send SES notification to manager

### Leave Approval / Rejection
1. Verify request exists and is `PENDING`
2. Verify actor is the assigned approver or HR_ADMIN / SUPER_ADMIN
3. Update status to `APPROVED` or `REJECTED` + `decidedAt = now()`
4. If `APPROVED`: decrement `LeaveBalance.remaining` and increment `LeaveBalance.used`
5. Send SES notification to employee

### Payroll Run
1. `INIT` — create `PayrollRun` record for month/year; reject if one already exists
2. `GENERATE` — for each `ACTIVE` employee with a `SalaryStructure`: compute `gross = basic + hra + sum(allowances)`, `totalDeductions = sum(deductions)`, `netPay = gross - totalDeductions`; upsert `Payslip`
3. `FINALIZE` — set `PayrollRun.status = FINALIZED`; send SES notification to each employee

### Attendance Regularization
- Only `HR_ADMIN` / `SUPER_ADMIN` can create/edit past attendance records for others
- Employees can submit regularization requests (future feature — currently HR directly edits)

### Onboarding Task Overdue Check
- Tasks where `dueDate < today` AND `status IN (PENDING, IN_PROGRESS)` are flagged as overdue
- `GET /onboarding/overdue` returns these; a scheduled CloudWatch Events job (future) can auto-update status

---

## 10. AWS Integration

### S3 — Document & Payslip Storage

```
Bucket: hr-portal-documents  (employee documents)
Bucket: hr-portal-payslips   (generated payslip PDFs)
```

**Upload flow (documents):**
1. Client requests presigned URL: `POST /employees/:id/documents/upload-url` with `{ fileName, contentType }`
2. Backend generates S3 presigned PUT URL (15 min expiry) via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
3. Client uploads directly to S3 (no data passes through backend)
4. Client confirms upload: `POST /employees/:id/documents` with `{ fileUrl, type }`
5. Backend saves `EmployeeDocument` record

**Download flow:**
1. Client requests presigned download URL
2. Backend generates S3 presigned GET URL (5 min expiry)
3. Client opens URL in browser / triggers download

All buckets have **public access blocked**. Access only via presigned URLs.

**`src/lib/s3.js`:**
```js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function getPresignedUploadUrl(bucket, key, contentType) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min
}

async function getPresignedDownloadUrl(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
}

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl };
```

### SES — Email Notifications

Region: `ap-south-1`
Sender: verified SES domain / email identity

| Event | Template |
|---|---|
| Leave submitted | `Hi {manager}, {employee} has applied for leave {dates}. Review in portal.` |
| Leave approved | `Hi {employee}, your leave for {dates} has been approved.` |
| Leave rejected | `Hi {employee}, your leave for {dates} has been rejected.` |
| Payslip published | `Hi {employee}, your payslip for {month} {year} is ready. Download in portal.` |
| Onboarding task assigned | `Hi {assignee}, you have a new onboarding task: {taskName}. Due: {dueDate}.` |

In development (`AWS_ACCESS_KEY_ID` not set), emails are logged to console instead of sent.

**`src/lib/notifications.js`:**
```js
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function sendEmail({ to, subject, body }) {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await ses.send(new SendEmailCommand({
    Source: process.env.SES_SENDER,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: body } },
    },
  }));
}

const emailTemplates = {
  leaveDecision: (name, status, dates) =>
    `Hi ${name},\n\nYour leave request for ${dates} has been ${status.toLowerCase()}.\n\nHR Portal`,
  payslipPublished: (name, month, year) =>
    `Hi ${name},\n\nYour payslip for ${month}/${year} is ready in the HR portal.\n\nHR Portal`,
  onboardingTaskAssigned: (name, taskName, dueDate) =>
    `Hi ${name},\n\nYou have a new onboarding task: "${taskName}". Due: ${dueDate}.\n\nHR Portal`,
};

module.exports = { sendEmail, emailTemplates };
```

### Secrets Manager

At application startup in production, secrets are fetched from AWS Secrets Manager:

```
Secret name: hr-portal/production/secrets
Keys: JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL, SES_SENDER
```

---

## 11. Error Handling

### Global Error Handler (`middleware/errorHandler.js`)

All unhandled errors propagate to the global Express error handler which:
- Logs error with stack trace to CloudWatch
- Returns consistent JSON shape: `{ error: string }`
- Never leaks stack traces to clients in production

### Standard HTTP Status Codes

| Scenario | Status |
|---|---|
| Success | 200 / 201 |
| Validation error | 400 |
| Unauthenticated | 401 |
| Insufficient role | 403 |
| Resource not found | 404 |
| Duplicate / conflict | 409 |
| Server error | 500 |

### Prisma Error Mapping

| Prisma code | Meaning | HTTP status |
|---|---|---|
| `P2002` | Unique constraint violation | 409 |
| `P2025` | Record not found | 404 |
| `P2003` | Foreign key constraint | 400 |

---

## 12. Security

| Control | Implementation |
|---|---|
| HTTPS | Enforced at CloudFront / ELB level; HTTP → HTTPS redirect |
| Password hashing | bcrypt, cost factor 10 |
| JWT expiry | Access token: 15 min; Refresh token: 7 days |
| Token rotation | New refresh token on every `/auth/refresh` call; old one deleted |
| Input validation | Joi schemas on all request bodies via `validate()` middleware |
| SQL injection | Prevented by Prisma parameterized queries |
| Sensitive data at rest | Salary and bank account fields encrypted (RDS encryption enabled) |
| Audit logging | Every `CREATE`, `UPDATE`, `DELETE` on core entities logged to `AuditLog` |
| S3 access | All buckets private; access via presigned URLs with short TTL |
| CORS | Allowed origin restricted to `FRONTEND_URL` env var |
| Helmet | HTTP security headers set via `helmet` middleware |
| Rate limiting | `express-rate-limit` on `/auth/login` (max 10 req/min per IP) |

---

## 13. Deployment (AWS Elastic Beanstalk)

### Instance
- Platform: `64bit Amazon Linux 2023 v6.x running Node.js 20`
- Instance type: `t3.medium` (2 vCPU, 4 GB RAM)
- Environment type: `SingleInstance` (no load balancer for this scale — saves ~₹1,700/mo)

### Process
1. **No build step** — JavaScript source runs directly on Node.js
2. GitHub Actions zips `apps/api/` (excluding `node_modules`) into a deployment package
3. Deploys to Elastic Beanstalk using `einaregilsson/beanstalk-deploy` action
4. EB runs `npm install --production` on deploy
5. EB pulls secrets from Secrets Manager on startup
6. Prisma migrations run via EB post-deploy hook: `npx prisma migrate deploy`

### Health Check
```
GET /health → 200 { status: 'ok', timestamp: '...' }
```
Elastic Beanstalk health check configured to hit `/health`.

---

## 14. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest | Business logic in services (leave day calculation, payroll net pay computation) |
| Integration | Jest + Supertest | Full HTTP request/response per endpoint against a real test DB |
| Smoke | Jest + Supertest | End-to-end flow: login → check-in → apply leave → generate payslip |

### Test Database
- Separate PostgreSQL DB (`hr_portal_test`) used for all tests
- `beforeAll` seeds minimal required data; `afterAll` cleans up
- Tests run with `--runInBand` (serial) to avoid concurrent DB state conflicts

### Example test (`src/__tests__/lib/jwt.test.js`)

```js
const { signAccessToken, verifyAccessToken } = require('../../lib/jwt');

process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!!';

describe('JWT utilities', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'emp-123', role: 'EMPLOYEE' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('emp-123');
    expect(decoded.role).toBe('EMPLOYEE');
  });

  it('throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid')).toThrow();
  });
});
```

### Key Test Cases

| Module | Test |
|---|---|
| Auth | Login returns tokens; wrong password returns 401; inactive account returns 403 |
| Employees | List returns paginated data; create requires HR_ADMIN; EMPLOYEE cannot access /employees |
| Leave | Apply deducts balance; approve updates status + balance; reject keeps balance unchanged |
| Payroll | `computeNetPay` returns correct gross/deductions/net; generate creates payslips for all active employees |
| Onboarding | Create task; update status; overdue list returns tasks past due date |
| RBAC | Each protected route returns 403 for insufficient role |
