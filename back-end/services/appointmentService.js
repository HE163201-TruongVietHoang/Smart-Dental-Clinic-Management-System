const { getPool, sql } = require("../config/db");
const {
  checkSlot,
  markAsBooked,
  unmarkAsBooked,
} = require("../access/slotAccess");
const { sendNotificationToMany } = require("../access/notificationAccess");
const { getByIdPatient } = require("../access/patientAccess");
const {
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
} = require("../access/appointmentAccess");
const { normalizeTime, minutesToHHMM } = require("../utils/timeUtils");
const { getIO } = require("../utils/socket");
const appointmentService = {
  async makeAppointment(
    { patientId, doctorId, slotId, reason, workDate, appointmentType },
    io
  ) {
    const pool = await getPool();

    /* ================== 1. CHECK USER ================== */
    const userResult = await pool.request().input("userId", sql.Int, patientId)
      .query(`
      SELECT isActive
      FROM Users
      WHERE userId = @userId
    `);

    if (!userResult.recordset.length) {
      throw new Error("Người dùng không tồn tại");
    }

    if (Number(userResult.recordset[0].isActive) === 0) {
      throw new Error(
        "Tài khoản của bạn đã bị khóa do hủy lịch quá nhiều lần. Vui lòng liên hệ lễ tân."
      );
    }

    /* ============ 2. CHỐNG SPAM ĐẶT LỊCH ============ */
    const scheduledResult = await pool
      .request()
      .input("patientId", sql.Int, patientId).query(`
      SELECT COUNT(*) AS total
      FROM Appointments
      WHERE patientId = @patientId
        AND status = 'Scheduled'
    `);

    const scheduledCount = scheduledResult.recordset[0].total;

    if (scheduledCount >= 2) {
      throw new Error(
        "Bạn chỉ được có tối đa 2 lịch đang chờ khám. Vui lòng hoàn thành hoặc hủy bớt lịch."
      );
    }

    /* ================== 3. TRANSACTION ================== */
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    let appointment;
    let slot;

    try {
      // Check slot
      slot = await checkSlot(slotId, transaction);
      if (!slot) throw new Error("Slot không tồn tại");
      if (slot.isBooked) throw new Error("Slot đã được đặt");

      // Mark slot booked
      await markAsBooked(slotId, transaction);

      // Create appointment
      appointment = await create(
        {
          patientId,
          doctorId,
          slotId,
          reason,
          workDate,
          appointmentType,
        },
        transaction
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    /* ================== 4. REALTIME ================== */
    io.emit("slotBooked", { slotId });

    /* ================== 5. NOTIFICATION ================== */
    slot = await checkSlot(slotId);

    const timeStr =
      slot.startTime instanceof Date
        ? slot.startTime.toISOString().substring(11, 16)
        : slot.startTime;

    const workDateStr = slot.workDate
      ? slot.workDate.toISOString().slice(0, 10)
      : "";

    const patient = await getByIdPatient(patientId);

    await sendNotificationToMany([
      {
        receiverId: patientId,
        senderId: null,
        title: "Đặt lịch thành công",
        message: `Bạn đã đặt lịch vào ${timeStr} ${workDateStr}`,
        type: "appointment",
      },
      {
        receiverId: doctorId,
        senderId: patientId,
        title: "Có lịch hẹn mới",
        message: `Bệnh nhân ${patient.fullName} vừa đặt lịch vào ${timeStr} ${workDateStr}`,
        type: "appointment",
      },
    ]);

    return appointment;
  },

  async getUserAppointments(userId) {
    const appointments = await getByUser(userId);
    return appointments.map((a) => ({
      ...a,
      workDate: a.workDate ? a.workDate.toISOString().slice(0, 10) : null,
      startTime: a.startTime.toISOString().slice(11, 16),
      endTime: a.endTime.toISOString().slice(11, 16),
    }));
  },
  async getAllAppointments() {
    const appointments = await getAll();
    return appointments.map((a) => ({
      ...a,
      workDate: a.workDate ? a.workDate.toISOString().slice(0, 10) : null,
      startTime: a.startTime.toISOString().slice(11, 16),
      endTime: a.endTime.toISOString().slice(11, 16),
    }));
  },

  async cancelAppointment(appointmentId, userId, io) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Lấy appointment
      const appointment = await getById(appointmentId);
      if (!appointment) {
        await transaction.rollback();
        return { success: false, message: "Không tìm thấy cuộc hẹn" };
      }

      if (appointment.patientId !== userId) {
        await transaction.rollback();
        return { success: false, message: "Không có quyền hủy cuộc hẹn này" };
      }

      // 2. Kiểm tra rule 12h
      const appointmentDate = new Date(appointment.workDate);
      const [h, m] = normalizeTime(appointment.startTime)
        .split(":")
        .map(Number);
      appointmentDate.setHours(h, m, 0, 0);

      const now = new Date();
      const diffHours = (appointmentDate - now) / (1000 * 60 * 60);
      if (diffHours < 12) {
        await transaction.rollback();
        return {
          success: false,
          message: "Không thể hủy — chỉ được hủy trước ít nhất 12 giờ",
        };
      }

      // 3. Hủy appointment hiện tại
      await cancelAppointments(appointmentId, transaction);

      // 4. Mở lại slot
      await unmarkAsBooked(appointment.slotId, transaction);

      // 5. Update updatedAt
      await transaction
        .request()
        .input("appointmentId", sql.Int, appointmentId)
        .query(
          `UPDATE Appointments 
         SET updatedAt = GETDATE() 
         WHERE appointmentId = @appointmentId`
        );

      await transaction.commit();

      // 🔔 Realtime
      if (io) io.emit("slotReleased", { slotId: appointment.slotId });

      // ============================
      // 6. ĐẾM SỐ LẦN HỦY (SAU COMMIT)
      // ============================
      const cancelCount = await countUserCancellations(userId);

      // ⚠️ Cảnh báo lần 3
      if (cancelCount === 3) {
        await sendNotificationToMany([
          {
            receiverId: userId,
            senderId: null,
            title: "Cảnh báo hủy lịch",
            message:
              "Bạn đã hủy 3 lần trong tháng này. Hủy thêm 2 lần nữa sẽ bị khóa tài khoản.",
            type: "appointment",
          },
        ]);
      }

      // 🔒 Nếu >= 5 → KHÓA + AUTO HỦY PHẦN CÒN LẠI
      if (cancelCount >= 5) {
        // 7. Khóa tài khoản
        await pool
          .request()
          .input("userId", sql.Int, userId)
          .query(`UPDATE Users SET isActive = 0 WHERE userId = @userId`);

        // 8. Lấy các appointment Scheduled còn lại
        const remaining = await pool.request().input("userId", sql.Int, userId)
          .query(`
          SELECT appointmentId, slotId
          FROM Appointments
          WHERE patientId = @userId AND status = 'Scheduled'
        `);

        // 9. Auto hủy toàn bộ
        for (const appt of remaining.recordset) {
          const t = new sql.Transaction(pool);
          try {
            await t.begin();

            await cancelAppointments(appt.appointmentId, t);
            await unmarkAsBooked(appt.slotId, t);

            await t.commit();

            if (io) io.emit("slotReleased", { slotId: appt.slotId });
          } catch (e) {
            await t.rollback();
            console.error(
              "Auto-cancel failed for appointment:",
              appt.appointmentId,
              e
            );
          }
        }

        // 10. Notify user bị khóa
        await sendNotificationToMany([
          {
            receiverId: userId,
            senderId: null,
            title: "Tài khoản bị khóa",
            message:
              "Bạn đã hủy quá 5 lần. Tài khoản đã bị khóa và các lịch hẹn còn lại đã bị hủy.",
            type: "system",
          },
        ]);
      }

      return {
        success: true,
        message: "Hủy cuộc hẹn thành công",
      };
    } catch (err) {
      try {
        await transaction.rollback();
      } catch (_) {}
      return { success: false, message: err.message };
    }
  },
  async markInProgress(appointmentId) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Update status thành "InProgress"
      await updateStatus(appointmentId, "InProgress", transaction);

      await transaction.commit();
      return {
        success: true,
        message: "Appointment đã chuyển sang InProgress",
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  async autoCancelNoShow(io) {
    try {
      const pool = await getPool();
      const io = getIO();
      // Lấy tất cả appointment đang Scheduled
      const result = await pool.request().query(`
        SELECT a.appointmentId, a.patientId, a.slotId, s.startTime, sch.workDate
        FROM Appointments a
        JOIN Slots s ON a.slotId = s.slotId
        JOIN Schedules sch ON s.scheduleId = sch.scheduleId
        WHERE a.status = 'Scheduled'
      `);

      const appointments = result.recordset;

      const now = new Date();

      for (const appt of appointments) {
        try {
          if (!appt.startTime || !appt.workDate) continue;

          const startStr = normalizeTime(appt.startTime);
          const [h, m] = startStr.split(":").map(Number);

          const workDate = new Date(
            new Date(appt.workDate).toLocaleString("en-US", {
              timeZone: "Asia/Ho_Chi_Minh",
            })
          );
          workDate.setHours(h, m, 0, 0);

          const now = new Date();
          const diffMinutes = (now - workDate) / (1000 * 60);

          if (diffMinutes >= 10) {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            // Hủy appointment
            await cancelAppointments(appt.appointmentId, transaction);

            // Mở lại slot
            await unmarkAsBooked(appt.slotId, transaction);

            // Cập nhật updatedAt
            await transaction
              .request()
              .input("appointmentId", sql.Int, appt.appointmentId)
              .query(
                `UPDATE Appointments SET updatedAt = GETDATE() WHERE appointmentId = @appointmentId`
              );

            await transaction.commit();

            // Realtime
            if (io) io.emit("slotReleased", { slotId: appt.slotId });

            // Kiểm tra số lần hủy
            const cancelCount = await countUserCancellations(appt.patientId);
            if (cancelCount >= 5) {
              await pool
                .request()
                .input("userId", sql.Int, appt.patientId)
                .query(`UPDATE Users SET isActive = 0 WHERE userId = @userId`);
            }
            if (cancelCount === 3) {
              await sendNotificationToMany([
                {
                  receiverId: userId,
                  senderId: null,
                  title: "Cảnh báo hủy lịch",
                  message: `Bạn đã hủy 3 lần hẹn trong tháng này. Hủy thêm 2 lần nữa sẽ bị khóa tài khoản!`,
                  type: "appointment",
                },
              ]);
            }
          }
        } catch (innerErr) {
          console.error(
            `Error processing appointment ${appt.appointmentId}:`,
            innerErr
          );
        }
      }
    } catch (err) {
      console.error("Error in auto-cancel no-show:", err);
    }
  },
  async makeAppointmentForReceptionist(
    {
      email,
      phone,
      fullName,
      gender,
      dob,
      address,
      doctorId,
      slotId,
      reason,
      workDate,
      appointmentType,
    },
    io
  ) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      //  Tìm user theo email hoặc sđt
      let patient = await findUserByEmailOrPhone(email, phone);

      //  Nếu chưa tồn tại thì tạo mới
      if (!patient) {
        patient = await createUser({
          email,
          phone,
          fullName,
          gender,
          dob,
          address,
        });
      }

      //  Kiểm tra slot
      const slot = await checkSlot(slotId, transaction);
      if (!slot) throw new Error("Slot không tồn tại");
      if (slot.isBooked) throw new Error("Slot đã được đặt");

      await markAsBooked(slotId, transaction);

      // 4 Tạo appointment
      const appointment = await create(
        {
          patientId: patient.userId,
          doctorId,
          slotId,
          reason,
          workDate,
          appointmentType,
        },
        transaction
      );

      await transaction.commit();

      if (io) io.emit("slotBooked", { slotId });

      return { success: true, appointment, patientId: patient.userId };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getAppointmentById(appointmentId) {
    const appointment = await getById(appointmentId);
    if (!appointment) throw new Error("Không tìm thấy cuộc hẹn");

    return {
      ...appointment,
      workDate: appointment.workDate
        ? appointment.workDate.toISOString().slice(0, 10)
        : null,
      startTime: appointment.startTime.toISOString().slice(11, 16),
      endTime: appointment.endTime.toISOString().slice(11, 16),
    };
  },

  async addServiceToAppointment(appointmentId, serviceId) {
    await addServiceToAppointment(appointmentId, serviceId);
    return { success: true, message: "Dịch vụ đã được thêm vào cuộc hẹn" };
  },
};
module.exports = { appointmentService };
