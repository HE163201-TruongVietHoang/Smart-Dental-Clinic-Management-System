// services/doctorDiagnosisAccess.js
const { sql, getPool } = require("../config/db");

module.exports = {
  /**
   * 1️⃣ Lấy danh sách ca khám đang InProgress
   */
  async getDoctorAppointments(doctorId) {
    const pool = await getPool();
    const result = await pool.request().input("doctorId", doctorId).query(`
      SELECT 
        a.appointmentId,
        a.reason,              
      a.appointmentType,
        u.fullName AS patientName,
        sch.workDate,
        CONVERT(varchar(8), sl.startTime, 108) AS startTime,
        CONVERT(varchar(8), sl.endTime, 108) AS endTime,
        a.status
      FROM Appointments a
      JOIN Users u ON a.patientId = u.userId
      JOIN Slots sl ON a.slotId = sl.slotId
      JOIN Schedules sch ON sl.scheduleId = sch.scheduleId
      WHERE a.doctorId = @doctorId
        AND a.status = 'InProgress'
        AND sch.workDate = CAST(GETDATE() AS DATE)
      ORDER BY sl.startTime ASC
    `);
    return result.recordset;
  },

  /**
   * 2️⃣ Tạo chẩn đoán + dịch vụ + thuốc
   *    → Update Appointment = DiagnosisCompleted
   *    → TỰ ĐỘNG tạo 1 Invoice (Pending)
   */
  async createDiagnosis({
    appointmentId,
    symptoms,
    diagnosisResult,
    doctorNote,
    services,
    medicines,
  }) {
    const pool = await getPool();
    const trx = pool.transaction();
    await trx.begin();

    // Đảm bảo luôn là mảng
    const serviceList = Array.isArray(services) ? services : [];
    const medicineList = Array.isArray(medicines) ? medicines : [];

    try {
      // 1. Insert Diagnosis
      const diagnosisRes = await trx
        .request()
        .input("appointmentId", appointmentId)
        .input("symptoms", symptoms || null)
        .input("diagnosisResult", diagnosisResult)
        .input("doctorNote", doctorNote || null).query(`
        INSERT INTO Diagnoses (appointmentId, symptoms, diagnosisResult, doctorNote, createdAt)
        OUTPUT INSERTED.diagnosisId
        VALUES (@appointmentId, @symptoms, @diagnosisResult, @doctorNote, GETDATE())
      `);

      const diagnosisId = diagnosisRes.recordset[0].diagnosisId;

      // 2. Insert services + tính tổng tiền dịch vụ
      let totalServiceCost = 0;

      for (const s of serviceList) {
        await trx
          .request()
          .input("diagnosisId", diagnosisId)
          .input("serviceId", s.serviceId)
          .input("note", s.note || null).query(`
          INSERT INTO DiagnosisServices (diagnosisId, serviceId, note, createdAt)
          VALUES (@diagnosisId, @serviceId, @note, GETDATE())
        `);

        // Lấy giá dịch vụ để cộng vào tổng
        const priceRes = await trx
          .request()
          .input("svcId", s.serviceId)
          .query(`SELECT price FROM Services WHERE serviceId = @svcId`);

        if (priceRes.recordset[0] && priceRes.recordset[0].price) {
          totalServiceCost += Number(priceRes.recordset[0].price);
        }
      }

      // 3. Insert Prescription
      const presRes = await trx.request().input("diagnosisId", diagnosisId)
        .query(`
        INSERT INTO Prescriptions (diagnosisId, createdAt)
        OUTPUT INSERTED.prescriptionId
        VALUES (@diagnosisId, GETDATE())
      `);

      const prescriptionId = presRes.recordset[0].prescriptionId;

      // 4. Insert Prescription Items (ĐƠN THUỐC – KHÔNG TÍNH TIỀN HÓA ĐƠN)
      for (const m of medicineList) {
        await trx
          .request()
          .input("prescriptionId", prescriptionId)
          .input("medicineId", m.medicineId)
          .input("quantity", m.quantity)
          .input("dosage", m.dosage)
          .input("usageInstruction", m.usageInstruction).query(`
          INSERT INTO PrescriptionItems (prescriptionId, medicineId, quantity, dosage, usageInstruction)
          VALUES (@prescriptionId, @medicineId, @quantity, @dosage, @usageInstruction)
        `);
      }

      // 5. Tạo INVOICE (Pending)
      //  - Chỉ tính tiền dịch vụ (totalServiceCost)
      //  - discountAmount = 0, finalAmount = totalServiceCost
      const invoiceRes = await trx
        .request()
        .input("appointmentId", appointmentId)
        .input("diagnosisId", diagnosisId)
        .input("prescriptionId", prescriptionId)
        .input("totalAmount", totalServiceCost).query(`
    INSERT INTO Invoices (
      appointmentId,
      diagnosisId,
      prescriptionId,
      totalAmount,
      discountAmount,
      status,
      issuedDate
    )
    OUTPUT INSERTED.invoiceId
    VALUES (
      @appointmentId,
      @diagnosisId,
      @prescriptionId,
      @totalAmount,
      0,
      'Pending',
      GETDATE()
    )
`);

      const invoiceId = invoiceRes.recordset[0].invoiceId;

      // 6. Update Appointment -> DiagnosisCompleted
      await trx.request().input("appointmentId", appointmentId).query(`
        UPDATE Appointments
        SET status = 'DiagnosisCompleted',
            updatedAt = GETDATE()
        WHERE appointmentId = @appointmentId
      `);

      await trx.commit();

      return { diagnosisId, prescriptionId, invoiceId, totalServiceCost };
    } catch (err) {
      console.error("❌ ERROR createDiagnosis:", err);
      await trx.rollback();
      throw err;
    }
  },

  /**
   * 3️⃣ Thêm dịch vụ (giữ nguyên)
   */
  async addDiagnosisServices(diagnosisId, services) {
    const pool = await getPool();

    for (const service of services) {
      await pool
        .request()
        .input("diagnosisId", diagnosisId)
        .input("serviceId", service.serviceId)
        .input("note", service.note || null).query(`
          INSERT INTO DiagnosisServices (diagnosisId, serviceId, note, createdAt)
          VALUES (@diagnosisId, @serviceId, @note, GETDATE())
        `);
    }

    return { success: true, added: services.length };
  },

  /**
   * 4️⃣ Lịch sử chẩn đoán
   */
  async getDiagnosisHistory({ doctorId, date, patient, serviceId }) {
    const pool = await getPool();

    let query = `
      SELECT 
        d.diagnosisId,
        a.appointmentId,
        u.fullName AS patientName,
        sch.workDate,
        COALESCE(CONVERT(varchar(5), sl.startTime, 108), '--:--') AS startTime,
        COALESCE(CONVERT(varchar(5), sl.endTime, 108), '--:--') AS endTime,
        d.symptoms,
        d.diagnosisResult,
        d.doctorNote,

        -- ⭐ Gộp nhiều dịch vụ thành một chuỗi
        STUFF((
            SELECT ', ' + s2.serviceName
            FROM DiagnosisServices ds2
            JOIN Services s2 ON s2.serviceId = ds2.serviceId
            WHERE ds2.diagnosisId = d.diagnosisId
            FOR XML PATH('')
        ), 1, 2, '') AS services
      FROM Diagnoses d
      JOIN Appointments a ON d.appointmentId = a.appointmentId
      JOIN Users u ON a.patientId = u.userId
      JOIN Slots sl ON a.slotId = sl.slotId
      JOIN Schedules sch ON sl.scheduleId = sch.scheduleId
      WHERE a.doctorId = @doctorId
    `;

    if (date) query += ` AND CAST(sch.workDate AS DATE) = CAST(@date AS DATE)`;
    if (patient) query += ` AND u.fullName LIKE '%' + @patient + '%'`;
    if (serviceId)
      query += ` AND EXISTS (
          SELECT 1 FROM DiagnosisServices ds3 
          WHERE ds3.diagnosisId = d.diagnosisId 
          AND ds3.serviceId = @serviceId
      )`;

    query += ` ORDER BY sch.workDate DESC, sl.startTime ASC`;

    const result = await pool
      .request()
      .input("doctorId", doctorId)
      .input("date", date || null)
      .input("patient", patient || null)
      .input("serviceId", serviceId || null)
      .query(query);

    return result.recordset;
  },

  getMedicinesByDiagnosis: async (diagnosisId) => {
    const pool = await getPool();

    const result = await pool.request().input("id", sql.Int, diagnosisId)
      .query(`
      SELECT 
        M.medicineName,
        PI.quantity,
        PI.dosage,
        PI.usageInstruction
      FROM PrescriptionItems PI
      JOIN Prescriptions P ON P.prescriptionId = PI.prescriptionId
      JOIN Medicines M ON M.medicineId = PI.medicineId
      WHERE P.diagnosisId = @id
    `);

    return result.recordset;
  },
};
