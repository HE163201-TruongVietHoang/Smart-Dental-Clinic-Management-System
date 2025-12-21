const {
  createMultipleSchedules,
  checkAvailability,
  listScheduleRequests,
  getScheduleRequestDetails,
  adminApproveRequest,
  adminRejectRequest,
  getSchedulesByDoctor,
  getDoctorScheduleDetailService,
  cancelScheduleRequestService,
} = require("../services/scheduleService");
const { getIO } = require("../utils/socket");

async function createScheduleRequestController(req, res) {
  try {
    const doctorId = req.user?.userId;
    const { note, schedules } = req.body;

    if (!doctorId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: "Danh sách lịch không hợp lệ." });
    }

    const result = await createMultipleSchedules(doctorId, note, schedules);

    if (result.conflicts?.length > 0) {
      const dbConflicts = result.conflicts.filter((c) => c.type === "Database");
      const internalConflicts = result.conflicts.filter(
        (c) => c.type === "Internal"
      );

      let message = "";

      if (dbConflicts.length > 0) {
        message += " Trùng với lịch có sẵn trong hệ thống:\n";
        dbConflicts.forEach((c) => {
          message += `- Ngày ${c.workDate} từ ${c.startTime} đến ${c.endTime}. Lý do: ${c.message}\n`;
        });
      }

      if (internalConflicts.length > 0) {
        message += " Các khung giờ bạn chọn bị trùng nhau:\n";
        internalConflicts.forEach((c) => {
          message += `- Ngày ${c.workDate}: ${c.message}\n`;
        });
      }

      return res.status(409).json({
        success: false,
        message: message.trim(),
        databaseConflicts: dbConflicts,
        internalConflicts: internalConflicts,
      });
    }

    if (result.unavailable?.length > 0) {
      return res.status(207).json({
        message: "Một số khung giờ không còn phòng trống, vui lòng chọn lại.",
        success: false,
        unavailable: result.unavailable,
      });
    }
    // 🔥 SOCKET: báo cho Clinic có request mới
    const io = getIO();
    io.emit("schedule:created", {
      requestId: result.requestId, // 🔥 BẮT BUỘC
      doctorId,
      doctorName: req.user.fullName,
      note,
      createdAt: new Date(),
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu tạo lịch cho Clinic Manager.",
      requestId: result.requestId,
      details: result.results,
    });
  } catch (err) {
    console.error("Lỗi tạo lịch:", err);

    res.status(500).json({
      success: false,
      message: "Không tạo được lịch",
    });
  }
}

async function getDoctorSchedulesController(req, res) {
  try {
    const doctorId = req.user?.userId;
    if (!doctorId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    const schedules = await getDoctorSchedules(doctorId);
    res.status(200).json({ success: true, schedules });
  } catch (err) {
    console.error(" Error getDoctorSchedules:", err);
    res
      .status(500)
      .json({ message: "Lỗi khi lấy lịch làm việc.", error: err.message });
  }
}

async function checkAvailabilityController(req, res) {
  try {
    const { schedules } = req.body;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: "Danh sách lịch không hợp lệ." });
    }

    const result = await checkAvailability(schedules);
    res.status(200).json({ message: "Kết quả kiểm tra phòng trống", result });
  } catch (err) {
    console.error(" Lỗi kiểm tra availability:", err);
    res.status(500).json({
      message: "Lỗi server khi kiểm tra phòng trống.",
      error: err.message,
    });
  }
}

async function listScheduleRequestsController(req, res) {
  try {
    const result = await listScheduleRequests();

    res.json({
      success: true,
      ...result, // { meta, data }
    });
  } catch (error) {
    console.error("Error listing schedule requests:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách yêu cầu.",
    });
  }
}

async function getScheduleRequestDetailsController(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!requestId)
      return res.status(400).json({ message: "requestId không hợp lệ" });

    const details = await getScheduleRequestDetails(requestId);

    // 🔥 QUAN TRỌNG
    if (!details || !details.request) {
      return res.status(410).json({
        success: false,
        code: "REQUEST_DELETED",
        message: "Yêu cầu này đã bị bác sĩ hủy",
      });
    }

    res.status(200).json({ success: true, details });
  } catch (err) {
    console.error("Lỗi lấy chi tiết request:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}

async function approveScheduleRequestController(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const adminId = req.user?.userId;

    if (!requestId)
      return res.status(400).json({ message: "requestId không hợp lệ" });

    const result = await adminApproveRequest(requestId, adminId);
    // SAU adminApproveRequest(...)
    const detail = await getScheduleRequestDetails(requestId);
    const doctorId = detail?.request?.doctorId;

    if (doctorId) {
      const io = getIO();
      io.to(String(doctorId)).emit("schedule:updated", {
        requestId,
        status: "Approved",
      });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(" Lỗi khi duyệt request:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi duyệt request.", error: err.message });
  }
}

async function rejectScheduleRequestController(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const adminId = req.user?.userId;
    const { reason } = req.body;

    if (!requestId)
      return res.status(400).json({ message: "requestId không hợp lệ" });

    await adminRejectRequest(requestId, adminId, reason);
    const detail = await getScheduleRequestDetails(requestId);
    const doctorId = detail?.request?.doctorId;

    if (doctorId) {
      const io = getIO();
      io.to(String(doctorId)).emit("schedule:updated", {
        requestId,
        status: "Rejected",
      });
    }

    res.status(200).json({ success: true, message: "Đã từ chối request." });
  } catch (err) {
    console.error(" Lỗi khi từ chối request:", err);
    res
      .status(500)
      .json({ message: "Lỗi server khi từ chối request.", error: err.message });
  }
}

async function getDoctorSchedulesController(req, res) {
  try {
    const doctorId = req.user.userId;
    const schedules = await getSchedulesByDoctor(doctorId);
    res.status(200).json(schedules);
  } catch (err) {
    console.error("Error fetching doctor schedules:", err);
    res.status(500).json({ message: "Lỗi khi lấy lịch làm việc của bác sĩ" });
  }
}
async function getDoctorScheduleDetail(req, res) {
  try {
    const doctorId = req.user.userId;
    const { scheduleId } = req.params;

    const schedule = await getDoctorScheduleDetailService(scheduleId, doctorId);

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error(" Lỗi khi lấy chi tiết lịch bác sĩ:", error.message);
    res.status(404).json({
      success: false,
      message: "Không tìm thấy lịch hoặc bạn không có quyền truy cập.",
    });
  }
}
const cancelScheduleRequest = async (req, res) => {
  const { id } = req.params;
  const doctorId = req.user?.userId;

  try {
    await cancelScheduleRequestService(id, doctorId);
    return res
      .status(200)
      .json({ message: "Đã hủy và xóa yêu cầu thành công" });
  } catch (error) {
    // ✅ TRƯỜNG HỢP ĐÚNG NGHIỆP VỤ – KHÔNG LOG ERROR
    if (error.message === "CANNOT_CANCEL") {
      return res.status(409).json({
        message: "Yêu cầu đã được duyệt hoặc từ chối, không thể hủy.",
      });
    }

    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    if (error.message === "FORBIDDEN") {
      return res
        .status(403)
        .json({ message: "Không có quyền hủy yêu cầu này" });
    }

    // ❌ CHỈ LOG KHI LỖI THẬT
    console.error("Cancel Schedule Request Error:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

module.exports = {
  createScheduleRequestController,
  getDoctorSchedulesController,
  checkAvailabilityController,
  listScheduleRequestsController,
  getScheduleRequestDetailsController,
  approveScheduleRequestController,
  rejectScheduleRequestController,
  getDoctorSchedulesController,
  getDoctorScheduleDetail,
  cancelScheduleRequest,
};
