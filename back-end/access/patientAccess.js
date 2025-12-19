const { sql, getPool } = require("../config/db");

// Lấy tất cả patient
async function getAll() {
  const pool = await getPool();
  const result = await pool.request().query(`
      SELECT u.userId, u.fullName, u.email, u.address, u.gender, u.dob, u.phone, u.isActive, u.createdAt, u.updatedAt
      FROM Users u
      JOIN Roles r ON u.roleId = r.roleId
      WHERE r.roleName = 'Patient'
      ORDER BY u.fullName
    `);
  return result.recordset;
}

// Lấy patient theo userId
async function getById(patientId) {
  const pool = await getPool();
  const result = await pool.request().input("patientId", sql.Int, patientId)
    .query(`
      SELECT u.userId, u.fullName, u.email, u.address, u.gender, u.dob, u.phone, u.isActive, u.createdAt, u.updatedAt
      FROM Users u
      JOIN Roles r ON u.roleId = r.roleId
      WHERE u.userId = @patientId AND r.roleName = 'Patient'
    `);
  return result.recordset[0];
}
async function getByIdPatient(patientId) {
  const pool = await getPool();
  const result = await pool.request().input("patientId", sql.Int, patientId)
    .query(`
      SELECT u.userId, u.fullName, u.email, u.address, u.gender, u.dob, u.phone, u.isActive, u.createdAt, u.updatedAt
      FROM Users u
      JOIN Roles r ON u.roleId = r.roleId
      WHERE u.userId = @patientId AND r.roleName = 'Patient'
    `);
  return result.recordset[0];
}

async function getPatientMedicalRecord(patientId) {
  const pool = await getPool();

  const result = await pool.request().input("patientId", sql.Int, patientId)
    .query(`
      SELECT 
          a.appointmentId,
          a.appointmentType,
          a.reason,
          a.status AS appointmentStatus,
          sch.workDate,
CONVERT(VARCHAR(5), sl.startTime, 108) AS startTime,
CONVERT(VARCHAR(5), sl.endTime, 108) AS endTime,

          -- Doctor
          uDoc.fullName AS doctorName,

          -- Diagnosis
          d.diagnosisId,
          d.symptoms,
          d.diagnosisResult,
          d.doctorNote,
          d.createdAt AS diagnosisDate,

          -- Services
          srv.serviceId,
          srv.serviceName,
          ds.status AS serviceStatus,

          -- Prescription
          p.prescriptionId,
          m.medicineName,
          pi.quantity AS medicineQty,
          pi.dosage,
          pi.usageInstruction,

          -- Invoice
          inv.invoiceId,
          inv.totalAmount,
          inv.discountAmount,
          inv.finalAmount,
          inv.status AS invoiceStatus,

          -- Payment
          pay.paymentId,
          pay.paymentMethod,
          pay.amount AS paidAmount,
          pay.status AS paymentStatus

      FROM Appointments a
      LEFT JOIN Users uDoc ON a.doctorId = uDoc.userId
      LEFT JOIN Slots sl ON a.slotId = sl.slotId
      LEFT JOIN Schedules sch ON sl.scheduleId = sch.scheduleId

      LEFT JOIN Diagnoses d ON a.appointmentId = d.appointmentId
      LEFT JOIN DiagnosisServices ds ON d.diagnosisId = ds.diagnosisId
      LEFT JOIN Services srv ON ds.serviceId = srv.serviceId

      LEFT JOIN Prescriptions p ON d.diagnosisId = p.diagnosisId
      LEFT JOIN PrescriptionItems pi ON p.prescriptionId = pi.prescriptionId
      LEFT JOIN Medicines m ON pi.medicineId = m.medicineId

      LEFT JOIN Invoices inv ON inv.appointmentId = a.appointmentId
      LEFT JOIN Payments pay ON pay.invoiceId = inv.invoiceId

      WHERE 
    a.patientId = @patientId
    AND a.status IN ('Completed')

      ORDER BY a.appointmentId DESC, d.diagnosisId DESC
    `);

  return result.recordset;
}

module.exports = { getAll, getById, getPatientMedicalRecord, getByIdPatient };
