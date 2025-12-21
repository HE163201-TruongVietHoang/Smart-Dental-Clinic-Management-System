import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { parse } from "date-fns";
import "./doctor-schedule-calendar.css";
import { toast } from "react-toastify";
import { io } from "socket.io-client"; // 1. Import socket client

// Khởi tạo socket
const socket = io("http://localhost:5000");

export default function DoctorSchedule({ doctorId }) {
  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showSlots, setShowSlots] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingScheduleId, setPendingScheduleId] = useState(null);
  const [calendarKey, setCalendarKey] = useState(0);

  // 🔹 Hàm tải lịch (tách ra để tái sử dụng)
  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/schedules/doctor",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (data.success || Array.isArray(data)) {
        const schedules = data.data || data;
        const formatted = schedules.map((s) => {
          const workDate = parse(s.workDate, "dd-MM-yyyy", new Date());
          const [startHour, startMinute] = s.startTime.split(":");
          const [endHour, endMinute] = s.endTime.split(":");

          const start = new Date(workDate);
          start.setHours(+startHour, +startMinute);
          const end = new Date(workDate);
          end.setHours(+endHour, +endMinute);
          if (end < start) end.setDate(end.getDate() + 1);

          const colors = {
            Approved: "#10b981",
            Pending: "#f59e0b",
            Rejected: "#ef4444",
            Default: "#6b7280",
          };

          return {
            id: s.scheduleId,
            title: ` (${s.startTime}-${s.endTime})`,
            start,
            end,
            backgroundColor: colors[s.status] || colors.Default,
            textColor: "#fff",
            borderColor: "transparent",
            extendedProps: {
              scheduleId: s.scheduleId,
              requestId: s.requestId,
              room: s.roomName || s.room,
              status: s.status,
              note: s.note || "Không có ghi chú",
            },
          };
        });
        setEvents(formatted);
      }
    } catch (error) {
      console.error("❌ Lỗi khi tải lịch bác sĩ:", error);
    }
  };

  // 🔹 useEffect lắng nghe Socket và Fetch lần đầu
  useEffect(() => {
    fetchSchedules();

    // 2. Lắng nghe thông báo Real-time
    socket.on("notification", (data) => {
      // Lấy userId từ localStorage/Context để kiểm tra xem thông báo có dành cho bác sĩ này không
      const currentUserId = JSON.parse(localStorage.getItem("user"))?.userId;

      if (data.receiverId === currentUserId) {
        // Nếu là thông báo liên quan đến duyệt/từ chối lịch
        if (
          data.type === "schedule_approved" ||
          data.type === "schedule_rejected"
        ) {
          toast.info(`${data.title}: ${data.message}`, {
            position: "top-right",
            autoClose: 5000,
          });
          fetchSchedules(); // Tự động cập nhật lại lịch trên Calendar
          setCalendarKey((prev) => prev + 1); // Rerender calendar
        }
      }
    });

    return () => {
      socket.off("notification");
    };
  }, [doctorId]);

  // 🔹 Khi click vào ca làm việc
  const handleEventClick = async (info) => {
    const { status, scheduleId, requestId } = info.event.extendedProps;

    if (status === "Approved") {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/schedules/doctor/${scheduleId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();

        if (data.success && data.data) {
          setSlots(Array.isArray(data.data.slots) ? data.data.slots : []);
          setShowSlots(true);
        }
      } catch (error) {
        console.error("❌ Lỗi khi tải slot:", error);
      }
    } else if (status === "Pending") {
      setPendingScheduleId(requestId);
      setShowCancelModal(true);
    }
  };

  return (
    <div className="doctor-schedule-wrapper-v2">
      <header className="schedule-header-v2">
        <div className="header-container">
          <div className="header-content-v2">
            <h1 className="header-title-v2">Lịch Làm Việc</h1>
          </div>
        </div>
      </header>

      <main className="schedule-main-v2">
        <div className="calendar-wrapper-v2">
          <div className="calendar-card-v2">
            <FullCalendar
              key={calendarKey}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              height={650}
              allDaySlot={false}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              locale="vi"
              events={events}
              eventClick={handleEventClick}
              displayEventTime={false}
              eventDidMount={(info) => {
                info.el.style.fontSize = "0.75rem";
                info.el.style.cursor = "pointer";
              }}
              dayCellDidMount={(info) => {
                const hasApproved = events.some(
                  (e) =>
                    e.extendedProps.status === "Approved" &&
                    new Date(e.start).toDateString() ===
                      info.date.toDateString()
                );
                const hasPending = events.some(
                  (e) =>
                    e.extendedProps.status === "Pending" &&
                    new Date(e.start).toDateString() ===
                      info.date.toDateString()
                );

                if (hasApproved) {
                  info.el.style.backgroundColor = "#d1fae5";
                } else if (hasPending) {
                  info.el.style.backgroundColor = "#fef3c7";
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* Modal Slots (Giữ nguyên phần render cũ của bạn) */}
      {showSlots && (
        <div
          className="modal-overlay-v2"
          onClick={() => setShowSlots(false)}
          style={modalOverlayStyle}
        >
          <div
            className="modal-content-v2"
            onClick={(e) => e.stopPropagation()}
            style={modalContentStyle}
          >
            <div className="modal-header-v2" style={modalHeaderStyle}>
              <h3>Chi tiết ca làm việc</h3>
              <button onClick={() => setShowSlots(false)}>✕</button>
            </div>
            <div style={{ padding: "16px 24px" }}>
              <div style={gridStyle}>
                {slots.map((slot) => (
                  <div
                    key={slot.slotId}
                    style={{
                      ...slotCardStyle,
                      backgroundColor: slot.isBooked ? "#ef4444" : "#10b981",
                    }}
                  >
                    <span>
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <small>{slot.isBooked ? "Đã đặt" : "Trống"}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy (Giữ nguyên phần logic cũ của bạn) */}
      {showCancelModal && (
        <div
          className="modal-overlay-v2"
          onClick={() => setShowCancelModal(false)}
          style={modalOverlayStyle}
        >
          <div
            className="modal-content-v2"
            style={{ ...modalContentStyle, maxWidth: "400px", padding: "20px" }}
          >
            <h3>Hủy yêu cầu lịch</h3>
            <p>Xác nhận hủy yêu cầu đăng ký lịch làm việc này?</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button onClick={() => setShowCancelModal(false)}>Hủy</button>
              <button
                className="btn-confirm"
                onClick={async () => {
                  const token = localStorage.getItem("token");
                  const res = await fetch(
                    `http://localhost:5000/api/schedules/doctor/cancel-request/${pendingScheduleId}`,
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                  if (res.ok) {
                    toast.success("Đã hủy thành công");
                    setShowCancelModal(false);
                    fetchSchedules();
                  }
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles bổ trợ (Có thể đưa vào CSS)
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};
const modalContentStyle = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "500px",
  maxHeight: "80vh",
  overflowY: "auto",
};
const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: "1px solid #eee",
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};
const slotCardStyle = {
  padding: "10px",
  borderRadius: "8px",
  color: "#fff",
  display: "flex",
  justifyContent: "space-between",
};
