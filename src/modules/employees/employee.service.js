const { prisma } = require("../../lib/prisma");
const bcrypt = require("bcryptjs");
const { createAuditLog } = require("../../lib/audit");
const { getSasUploadUrl, getSasDownloadUrl, uploadBlob } = require("../../lib/azureBlob");
const { sendEmail, emailTemplates } = require("../../lib/notifications");
const crypto = require("crypto");

async function getSolutionsPointCompanyId() {
  const existing = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: "SP Solutions Point", mode: "insensitive" } },
        { name: { equals: "SolutionsPoint", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    const renamed = await prisma.company.update({
      where: { id: existing.id },
      data: { name: "SP Solutions Point" },
      select: { id: true },
    });
    return renamed.id;
  }

  const created = await prisma.company.create({
    data: { name: "SP Solutions Point" },
    select: { id: true },
  });

  return created.id;
}

async function listEmployees(query) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const where = {};
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { employeeCode: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.designationId) where.designationId = query.designationId;
  if (query.status) where.status = query.status;
  if (query.employmentType) where.employmentType = query.employmentType;
  if (query.employeeCategory) where.employeeCategory = query.employeeCategory;

  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        employeeCategory: true,
        employmentType: true,
        dateOfJoining: true,
        managerId: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        ctc: true,
        inHandSalary: true,
      },
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

async function getOrgChartData() {
  return prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      managerId: true,
      role: true,
      designation: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
}

async function getEmployeeById(id) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      company: true,
      department: true,
      designation: true,
      location: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!employee) throw { status: 404, message: "Employee not found" };
  delete employee.passwordHash;
  return employee;
}

async function createEmployee(data, actorId) {
  const { password, ctc, inHandSalary, role, ...rest } = data;

  // Protect salary fields
  let actorRole = "EMPLOYEE"; // Default if no actorId
  if (actorId) {
    const actor = await prisma.employee.findUnique({ where: { id: actorId } });
    if (actor) actorRole = actor.role;
  }

  const isAdmin = actorRole === "HR_ADMIN" || actorRole === "SUPER_ADMIN";
  const finalCtc = isAdmin ? (ctc !== undefined ? ctc : null) : null;
  const finalInHandSalary = isAdmin ? (inHandSalary !== undefined ? inHandSalary : null) : null;

  let finalRole = "EMPLOYEE";
  if (role && isAdmin) {
    if (role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
      throw { status: 403, message: "Only SUPER_ADMIN can create a SUPER_ADMIN" };
    }
    finalRole = role;
  }

  const safeFields = {};
  const allowedFields = [
    "firstName", "lastName", "email", "phone", "employeeCode",
    "employeeCategory", "employmentType", "status", "dateOfJoining",
    "departmentId", "designationId", "locationId", "companyId", "managerId"
  ];
  for (const field of allowedFields) {
    if (rest[field] !== undefined) safeFields[field] = rest[field];
  }

  if (!safeFields.employeeCategory) {
    safeFields.employeeCategory = "DIRECT";
  }

  if (safeFields.employeeCategory === "DIRECT") {
    safeFields.companyId = await getSolutionsPointCompanyId();
  } else if (!safeFields.companyId) {
    throw { status: 400, message: "Client company is required for deployed manpower employees" };
  }

  // Auto-generate employeeCode if not provided
  let generatedCode = safeFields.employeeCode;
  if (!generatedCode) {
    const firstInitial = (safeFields.firstName ? safeFields.firstName.charAt(0) : "X").toUpperCase();
    const lastInitial = (safeFields.lastName ? safeFields.lastName.charAt(0) : "X").toUpperCase();
    const prefix = `SP${firstInitial}${lastInitial}`;
    
    // Find the latest employee code with this prefix to get the next sequence
    const latestCode = await prisma.employee.findFirst({
      where: { employeeCode: { startsWith: prefix } },
      orderBy: { employeeCode: 'desc' },
      select: { employeeCode: true }
    });

    let seq = 1;
    if (latestCode && latestCode.employeeCode) {
      const match = latestCode.employeeCode.match(/\d+$/);
      if (match) {
        seq = parseInt(match[0], 10) + 1;
      }
    }
    generatedCode = `${prefix}${seq.toString().padStart(4, "0")}`;
    safeFields.employeeCode = generatedCode;
  }

  const existing = await prisma.employee.findFirst({
    where: {
      OR: [
        { employeeCode: safeFields.employeeCode },
        { email: safeFields.email }
      ]
    }
  });

  if (existing) {
    if (existing.employeeCode === safeFields.employeeCode) {
      throw { status: 400, message: "Employee code already exists" };
    }
    throw { status: 400, message: "Email already exists" };
  }

  const tempPwd = password || crypto.randomBytes(8).toString("hex");
  const passwordHash = await bcrypt.hash(tempPwd, 10);

  const emp = await prisma.employee.create({
    data: {
      ...safeFields,
      role: finalRole,
      ctc: finalCtc,
      inHandSalary: finalInHandSalary,
      passwordHash,
      dateOfJoining: new Date(safeFields.dateOfJoining),
      requiresOnboarding: true,
    },
  });

  await createAuditLog(actorId, "CREATE", "Employee", emp.id, { new: safeFields });
  delete emp.passwordHash;

  // Send welcome email with temp password — fire and forget (don't block response)
  const { text, html } = emailTemplates.welcomeEmployee({
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    employeeCode: emp.employeeCode,
    tempPassword: tempPwd,
  });
  sendEmail({
    to: emp.email,
    subject: "Welcome to SP HR Portal — Your Login Details",
    body: text,
    html,
  }).catch((err) =>
    console.error(`[email] Failed to send welcome email to ${emp.email}:`, err.message)
  );

  return emp;
}

async function updateEmployee(id, data, actorId) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw { status: 404, message: "Employee not found" };

  const { ctc, inHandSalary, role, ...updateData } = data;
  
  // Protect salary fields
  let actorRole = "EMPLOYEE";
  if (actorId) {
    const actor = await prisma.employee.findUnique({ where: { id: actorId } });
    if (actor) actorRole = actor.role;
  }
  const isAdmin = actorRole === "HR_ADMIN" || actorRole === "SUPER_ADMIN";

  const safeFields = {};
  const allowedFields = [
    "firstName", "lastName", "email", "phone", "employeeCode",
    "employeeCategory", "employmentType", "status", "dateOfJoining", "dateOfLeaving",
    "departmentId", "designationId", "locationId", "companyId", "managerId",
    "requiresOnboarding"
  ];
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) safeFields[field] = updateData[field];
  }

  // Admin and role checks
  if (role && isAdmin) {
    if (role === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
      throw { status: 403, message: "Only SUPER_ADMIN can change a role to SUPER_ADMIN" };
    }
    safeFields.role = role;
  }

  const nextEmployeeCategory = safeFields.employeeCategory || existing.employeeCategory;
  const nextCompanyId = safeFields.companyId !== undefined ? safeFields.companyId : existing.companyId;

  if (nextEmployeeCategory === "DIRECT") {
    safeFields.companyId = await getSolutionsPointCompanyId();
  } else if (!nextCompanyId) {
    throw { status: 400, message: "Client company is required for deployed manpower employees" };
  }

  if (ctc !== undefined && isAdmin) {
    safeFields.ctc = ctc;
  }
  if (inHandSalary !== undefined && isAdmin) {
    safeFields.inHandSalary = inHandSalary;
  }

  const emp = await prisma.employee.update({
    where: { id },
    data: safeFields,
  });

  await createAuditLog(actorId, "UPDATE", "Employee", id, {
    old: existing,
    new: emp,
  });
  delete emp.passwordHash;
  return emp;
}

async function deleteEmployee(id, actorId) {
  const emp = await prisma.employee.update({
    where: { id },
    data: { status: "TERMINATED", dateOfLeaving: new Date() },
  });
  await createAuditLog(actorId, "DELETE (SOFT)", "Employee", id, {
    status: "TERMINATED",
  });
}

async function completeOnboarding(id) {
  const emp = await prisma.employee.update({
    where: { id },
    data: { requiresOnboarding: false },
  });
  return emp;
}

async function listDocuments(employeeId) {
  const documents = await prisma.employeeDocument.findMany({ where: { employeeId } });
  
  const container = process.env.AZURE_STORAGE_CONTAINER || "hr-portal-documents";
  
  const docsWithViewUrl = await Promise.all(
    documents.map(async (doc) => {
      try {
        if (!doc.fileUrl) return doc;
        
        // Extract blob name from fileUrl
        // URL format: https://account.blob.core.windows.net/container/blobName
        const urlObj = new URL(doc.fileUrl);
        const pathParts = urlObj.pathname.split('/');
        
        // Ensure we strip the container from the path to get just the blobName
        // pathParts might be ["", "hr-portal-documents", "employeeId", "uuid-filename.ext"]
        const containerIndex = pathParts.indexOf(container);
        let blobName = "";
        if (containerIndex !== -1 && containerIndex < pathParts.length - 1) {
             blobName = pathParts.slice(containerIndex + 1).join('/');
        }
        
        if (!blobName) {
           return doc; // fallback
        }

        const viewUrl = await getSasDownloadUrl(container, blobName, 60); // 60 min expiry
        
        return {
          ...doc,
          viewUrl,       // Add the actual SAS url for backwards compatibility if needed
          fileUrl: viewUrl // Overwrite original url so frontend doesn't need changes
        };
      } catch (err) {
        console.error(`[listDocuments] Error generating SAS URL for doc ${doc.id}:`, err.message);
        return doc; // Keep the original document object if generation fails
      }
    })
  );

  return docsWithViewUrl;
}

async function getUploadUrl(employeeId, fileName, contentType) {
  const container =
    process.env.AZURE_STORAGE_CONTAINER || "hr-portal-documents";
  const blobName = `${employeeId}/${crypto.randomUUID()}-${fileName}`;
  const { uploadUrl, blobUrl } = await getSasUploadUrl(
    container,
    blobName,
    contentType
  );
  return { uploadUrl, fileUrl: blobUrl };
}

async function saveDocumentRecord(employeeId, data) {
  return prisma.employeeDocument.create({
    data: { employeeId, type: data.type, fileUrl: data.fileUrl },
  });
}

async function deleteDocument(docId) {
  await prisma.employeeDocument.delete({ where: { id: docId } });
}

async function uploadMyDocument(employeeId, type, file) {
  if (!file) {
    throw { status: 400, message: "File is required" };
  }

  const container =
    process.env.AZURE_STORAGE_CONTAINER || "hr-portal-documents";
  const ext = file.originalname.split(".").pop();
  const blobName = `${employeeId}/${crypto.randomUUID()}.${ext}`;

  // Upload buffer (multer memoryStorage) directly to Azure Blob Storage
  const fileUrl = await uploadBlob(
    container,
    blobName,
    file.buffer,
    file.mimetype
  );

  return prisma.employeeDocument.create({
    data: { employeeId, type, fileUrl },
  });
}

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  completeOnboarding,
  listDocuments,
  getUploadUrl,
  saveDocumentRecord,
  deleteDocument,
  uploadMyDocument,
  getOrgChartData,
};
