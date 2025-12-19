import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { parse } from "date-fns";
import "./doctor-schedule-calendar.css";
import { toast } from "react-toastify";

export default function DoctorSchedule({ doctorId }) {
  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showSlots, setShowSlots] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingScheduleId, setPendingScheduleId] = useState(null);
  const [calendarKey, setCalendarKey] = useState(0);

  // 🔹 Tải lịch làm việc của bác sĩ
  useEffect(() => {
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
                room: s.room?.roomName || s.room,
                status: s.status,
                note: s.note || "Không có ghi chú",
                // tooltipContent: `
                //   <b style='color:#1f2937'>${
                //     s.room?.roomName || s.room
                //   }</b><br/>
                //   <b>Trạng thái:</b> ${s.status}<br/>
                //   ${s.startTime} - ${s.endTime}<br/>
                //   <i>${s.note}</i>
                // `,
              },
            };
          });

          setEvents(formatted);
        }
      } catch (error) {
        console.error("❌ Lỗi khi tải lịch bác sĩ:", error);
      }
    };

    fetchSchedules();
  }, [doctorId]);

  // 🔹 Khi click vào ca làm việc
  const handleEventClick = async (info) => {
    const { status, scheduleId, requestId } = info.event.extendedProps;

    if (status === "Approved") {
      // Hiển thị slot như hiện tại
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
    } else if (status === "Pending" || status === "Schedule") {
      // Hiển thị popup hủy lịch
      setPendingScheduleId(requestId);
      setShowCancelModal(true);
    }
  };

  return (
    <div className="doctor-schedule-wrapper-v2">
      {/* 🔸 Header */}
      <header className="schedule-header-v2">
        <div className="header-container">
          <div className="header-content-v2">
            <h1 className="header-title-v2">Lịch Làm Việc</h1>
            {/* <p className="header-subtitle-v2">Quản lý ca làm việc hàng tuần</p> */}
          </div>

          {/* <div className="header-stats">
            <div className="stat-card">
              <span className="stat-number">{events.length}</span>
              <span className="stat-label">Ca làm việc</span>
            </div>
          </div> */}
        </div>
      </header>

      {/* 🔸 Calendar */}
      <main className="schedule-main-v2">
        <div className="calendar-wrapper-v2">
          <div className="calendar-card-v2">
            <FullCalendar
              key={calendarKey} // 🔹 dùng key
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              height={650}
              contentHeight={450}
              aspectRatio={1.5}
              allDaySlot={false} // 🔹 Ẩn all-day row hoàn toàn
              slotMinTime="00:00:00" // bắt đầu từ 0h
              slotMaxTime="24:00:00"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hôm nay",
                month: "Tháng",
                week: "Tuần",
                day: "Ngày",
              }}
              locale="vi" // chuyển sang tiếng Việt
              dayHeaderFormat={{ weekday: "long" }} //
              titleFormat={{ year: "numeric", month: "long", day: "numeric" }}
              events={events}
              eventClick={handleEventClick}
              dayMaxEvents={2}
              displayEventTime={false}
              eventDidMount={(info) => {
                info.el.classList.add("calendar-event-small");
                info.el.style.fontSize = "0.75rem";
                info.el.style.padding = "2px 4px";
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
                  info.el.style.backgroundColor = "#d1fae5"; // xanh nhạt
                  info.el.style.borderRadius = "6px";
                } else if (hasPending) {
                  info.el.style.backgroundColor = "#f5d2bbff"; // cam nhạt (tailwind amber-100)
                  info.el.style.borderRadius = "6px";
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* 🔸 Modal hiển thị slot */}
      {showSlots && (
        <div
          className="modal-overlay-v2"
          style={{
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
          }}
          onClick={() => setShowSlots(false)}
        >
          <div
            className="modal-content-v2"
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="modal-header-v2"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                  Chi tiết ca làm việc
                </h2>
                <p
                  style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}
                >
                  Danh sách các slot khả dụng
                </p>
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
                onClick={() => setShowSlots(false)}
                aria-label="Đóng modal"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 24px" }}>
              {slots.length > 0 ? (
                <div
                  className="slots-grid-v2"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  {slots.map((slot) => (
                    <div
                      key={slot.slotId}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        backgroundColor: slot.isBooked ? "#f87171" : "#34d399",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                      }}
                    >
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span
                        style={{
                          backgroundColor: "rgba(255,255,255,0.2)",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                        }}
                      >
                        {slot.isBooked ? "Đã đặt" : "Trống"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#6b7280",
                    padding: "24px 0",
                    fontSize: "0.875rem",
                  }}
                >
                  Không có dữ liệu slot
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                onClick={() => setShowSlots(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hủy lịch Pending */}
      {showCancelModal && (
        <div
          className="modal-overlay-v2"
          style={{
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
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="modal-content-v2"
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              maxWidth: "400px",
              width: "90%",
              padding: "24px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "16px" }}>Hủy yêu cầu lịch</h2>
            <p>Bạn có chắc muốn hủy yêu cầu lịch này không?</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #6b7280",
                  background: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const response = await fetch(
                      `http://localhost:5000/api/schedules/doctor/cancel-request/${pendingScheduleId}`, // dùng đúng requestId
                      {
                        method: "DELETE",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );

                    const data = await response.json();
                    if (response.ok) {
                      toast.success("Đã hủy yêu cầu lịch thành công");
                      setShowCancelModal(false);
                      setPendingScheduleId(null);

                      // 🔹 Xóa event khỏi state
                      setEvents((prev) =>
                        prev.filter(
                          (e) => e.extendedProps.requestId !== pendingScheduleId
                        )
                      );

                      // 🔹 Force FullCalendar rerender
                      setCalendarKey((prev) => prev + 1);
                    } else {
                      toast.error("" + data.message);
                    }
                  } catch (err) {
                    console.error("Lỗi hủy request:", err);
                    toast.error("Lỗi server khi hủy request");
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
