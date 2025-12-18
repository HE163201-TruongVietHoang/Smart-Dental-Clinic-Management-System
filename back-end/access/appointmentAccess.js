const { sql, getPool } = require("../config/db");
const nodemailer = require("nodemailer");
// Tạo appointment, dùng transaction
async function create(
  { patientId, doctorId, slotId, reason, workDate, appointmentType },
  transaction
) {
  const request = transaction.request();
  const result = await request
    .input("patientId", sql.Int, patientId)
    .input("doctorId", sql.Int, doctorId)
    .input("slotId", sql.Int, slotId)
    .input("reason", sql.NVarChar, reason)
    .input("workDate", sql.Date, workDate)
    .input("status", sql.NVarChar, "Scheduled")
    .input("appointmentType", sql.NVarChar, appointmentType).query(`
      INSERT INTO Appointments (patientId, doctorId, slotId, reason, status,appointmentType, createdAt, updatedAt)
      VALUES (@patientId, @doctorId, @slotId, @reason, 'Scheduled',@appointmentType, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() AS appointmentId;
    `);
  return result.recordset[0];
}
async function getByUser(userId) {
  const pool = await getPool();
  const result = await pool.request().input("userId", sql.Int, userId).query(`
      SELECT a.appointmentId, a.reason, a.status, a.appointmentType, a.doctorId,
             s.startTime, s.endTime, sch.workDate,
             d.fullName AS doctorName, s.slotId,
             (
               SELECT 
                 srv.serviceId,
                 srv.serviceName,
                 srv.description AS serviceDescription,
                 srv.price AS servicePrice,
                 aps.createdAt AS addedAt
               FROM AppointmentServices aps
               JOIN Services srv ON aps.serviceId = srv.serviceId
               WHERE aps.appointmentId = a.appointmentId
               FOR JSON PATH
             ) AS services
      FROM Appointments a
      JOIN Slots s ON a.slotId = s.slotId
      JOIN Schedules sch ON s.scheduleId = sch.scheduleId
      JOIN Users d ON sch.doctorId = d.userId
      WHERE a.patientId = @userId
      ORDER BY sch.workDate, s.startTime
    `);
  return result.recordset.map(row => ({
    ...row,
    services: row.services ? JSON.parse(row.services) : []
  }));
}
async function getAll() {
  const pool = await getPool();
  const result = await pool.request().query(`
      SELECT a.*, s.startTime, s.endTime, d.fullName AS doctorName, p.fullName AS patientName, sch.workDate
      FROM Appointments a
      JOIN Slots s ON a.slotId = s.slotId
      JOIN Schedules sch ON s.scheduleId = sch.scheduleId
      JOIN Users d ON a.doctorId = d.userId
      JOIN Users p ON a.patientId = p.userId
      ORDER BY sch.workDate, s.startTime
    `);
  return result.recordset;
}

async function getById(appointmentId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("appointmentId", sql.Int, appointmentId).query(`
      SELECT 
        a.appointmentId,
    a.patientId,
    a.doctorId,
    a.slotId,
    a.reason,
    a.appointmentType,
    a.status,
    a.createdAt,
    a.updatedAt,
    
    -- slot info
    s.slotId AS slotIdFromSlot,
    s.startTime,
    s.endTime,

    sch.scheduleId,
    sch.workDate,
    sch.roomId,

    u.fullName AS patientName,
    u.email AS patientEmail,
    u.phone AS patientPhone,

    d.userId AS doctorUserId,
    d.fullName AS doctorName,
    d.email AS doctorEmail,
    d.phone AS doctorPhone,
        (
          SELECT 
            srv.serviceId,
            srv.serviceName,
            srv.description AS serviceDescription,
            srv.price AS servicePrice,
            aps.createdAt AS addedAt
          FROM AppointmentServices aps
          JOIN Services srv ON aps.serviceId = srv.serviceId
          WHERE aps.appointmentId = a.appointmentId
          FOR JSON PATH
        ) AS services
      FROM Appointments a
      JOIN Slots s ON a.slotId = s.slotId
      JOIN Schedules sch ON s.scheduleId = sch.scheduleId
      JOIN Users u ON a.patientId = u.userId
      JOIN Users d ON a.doctorId = d.userId
      WHERE a.appointmentId = @appointmentId
    `);

  const appointment = result.recordset[0];
  if (appointment && appointment.services) {
    appointment.services = JSON.parse(appointment.services);
  } else {
    appointment.services = [];
  }

  return appointment;
}

async function cancelAppointments(appointmentId, transaction) {
  const request = transaction.request();
  await request
    .input("appointmentId", sql.Int, appointmentId)
    .query(
      `UPDATE Appointments SET status = 'Cancelled' WHERE appointmentId = @appointmentId`
    );
}

async function countUserCancellations(patientId) {
  const pool = await getPool();
  const result = await pool.request().input("patientId", sql.Int, patientId)
    .query(`
      SELECT COUNT(*) AS cancelCount
      FROM Appointments
      WHERE patientId = @patientId
        AND status = 'Cancelled'
        AND MONTH(updatedAt) = MONTH(GETDATE())
        AND YEAR(updatedAt) = YEAR(GETDATE())
    `);
  return result.recordset[0].cancelCount;
}
// Cập nhật trạng thái appointment
async function updateStatus(appointmentId, status, transaction = null) {
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  await request
    .input("appointmentId", sql.Int, appointmentId)
    .input("status", sql.NVarChar, status).query(`
      UPDATE Appointments
      SET status = @status,
          updatedAt = GETDATE()
      WHERE appointmentId = @appointmentId
    `);
}
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

async function findUserByEmailOrPhone(email, phone) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email || "")
    .input("phone", sql.NVarChar, phone || "")
    .query(`SELECT * FROM Users WHERE email = @email OR phone = @phone`);
  return result.recordset[0] || null;
}

async function createUser({ email, phone, fullName, gender, dob, address }) {
  const pool = await getPool();
  const password = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  const roleResult = await pool
    .request()
    .input("roleName", sql.NVarChar, "Patient")
    .query(`SELECT roleId FROM dbo.Roles WHERE roleName = @roleName`);

  if (roleResult.recordset.length === 0) {
    throw new Error("Role 'Patient' not found in Roles table.");
  }

  const roleId = roleResult.recordset[0].roleId;
  const result = await pool
    .request()
    .input("email", sql.NVarChar, email || null)
    .input("phone", sql.NVarChar, phone || null)
    .input("fullName", sql.NVarChar, fullName || null)
    .input("password", sql.NVarChar, hashedPassword)
    .input("gender", sql.NVarChar, gender || null)
    .input("dob", sql.Date, dob || null)
    .input("address", sql.NVarChar, address || null)
    .input("roleId", sql.Int, roleId || null)
    .input("isActive", sql.Bit, 1)
    .input("isVerify", sql.Bit, 1).query(`
      INSERT INTO Users (email, phone, fullName, password, gender, dob, address,roleId, isActive, isVerify )
      OUTPUT INSERTED.userId
      VALUES (@email, @phone, @fullName, @password, @gender, @dob, @address, @roleId, @isActive, @isVerify)
    `);

  const userId = result.recordset[0].userId;

  // Gửi email thông tin tài khoản
  await sendAccountEmail({ email, password, fullName });

  return { userId, isNew: true };
}
async function sendAccountEmail({ email, fullName, password }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Smart Dental Clinic" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "Thông tin tài khoản Smart Dental Clinic",
    html: `
      <h2>Xin chào ${fullName}</h2>
      <p>Tài khoản của bạn đã được tạo trên hệ thống Smart Dental Clinic.</p>
      <ul>
        <li>Email: ${email}</li>
        <li>Password: <b>${password}</b></li>
      </ul>
      <p>Vui lòng đăng nhập và đổi mật khẩu sau khi đăng nhập lần đầu.</p>
      <br>
      <p>Smart Dental Team</p>
    `,
  });

  console.log(" Email tài khoản đã gửi tới:", email);
}

async function addServiceToAppointment(appointmentId, serviceId) {
  const pool = await getPool();
  // Lấy price từ Services
  const serviceResult = await pool
    .request()
    .input("serviceId", sql.Int, serviceId)
    .query(`SELECT price FROM Services WHERE serviceId = @serviceId`);

  if (serviceResult.recordset.length === 0) {
    throw new Error("Service not found");
  }

  const actualPrice = serviceResult.recordset[0].price;

  await pool
    .request()
    .input("appointmentId", sql.Int, appointmentId)
    .input("serviceId", sql.Int, serviceId)
    .input("quantity", sql.Int, 1)
    .input("actualPrice", sql.Decimal(10, 2), actualPrice)
    .input("status", sql.NVarChar, "Active").query(`
      INSERT INTO AppointmentServices (appointmentId, serviceId, quantity, actualPrice, status, createdAt, updatedAt)
      VALUES (@appointmentId, @serviceId, @quantity, @actualPrice, @status, GETDATE(), GETDATE())
    `);
}
async function hasCompletedAppointment(patientId, transaction) {
  const request = new sql.Request(transaction);

  const result = await request.query(`
    SELECT TOP 1 appointmentId
    FROM Appointments
    WHERE patientId = ${patientId}
      AND status = 'Completed'
  `);

  return result.recordset.length > 0;
}

module.exports = {
  create,
  getByUser,
  getAll,
  getById,
  cancelAppointments,
  countUserCancellations,
  updateStatus,
  findUserByEmailOrPhone,
  createUser,
  addServiceToAppointment,
  hasCompletedAppointment,
};
