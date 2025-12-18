import React, { useState, useEffect } from "react";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // 🔹 API: Lấy danh sách lịch hẹn
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/appointments/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Không thể tải lịch hẹn");

      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch hẹn:", err);
      if (err.message.includes("401")) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        localStorage.removeItem("token");
        navigate("/signin");
      } else {
        toast.error("Không thể tải lịch hẹn. Vui lòng thử lại sau!");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // 🔹 Bộ lọc theo trạng thái
  const filteredAppointments =
    statusFilter === "All"
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  // 🔹 Tính phân trang
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageAppointments = filteredAppointments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset về page 1 khi đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // 🔹 Hủy lịch hẹn
  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy lịch hẹn này?")) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/appointments/${id}/cancel`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        localStorage.removeItem("token");
        navigate("/signin");
        return;
      }

      if (data.code === "ACCOUNT_LOCKED") {
        toast.error(data.message);
        localStorage.clear();
        navigate("/signin");
        return;
      }

      if (!res.ok || !data.success) {
        toast.error(data.message || "Không thể hủy lịch hẹn!");
        return;
      }

      toast.success("Hủy lịch hẹn thành công!");
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error("Không thể hủy lịch hẹn. Vui lòng thử lại!");
    }
  };

  return (
    <div>
      <Header />

      <section className="py-5">
        <div className="container">
          <h3 className="mb-4 text-primary text-center">Lịch hẹn của tôi</h3>

          {/* ⭐ Filter trạng thái */}
          <div className="mb-3 d-flex justify-content-end">
            <select
              className="form-select w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">Tất cả</option>
              <option value="Scheduled">Đang chờ</option>
              <option value="Completed">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>

          {loading ? (
            <p className="text-center">Đang tải...</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-center">Không có lịch hẹn nào.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead className="table-primary">
                    <tr>
                      <th>Bác sĩ</th>
                      <th>Ngày</th>
                      <th>Khung giờ</th>
                      <th>Loại khám</th>
                      <th>Trạng thái</th>
                      <th style={{ width: "200px" }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageAppointments.map((a) => (
                      <tr key={a.appointmentId}>
                        <td>{a.doctorName || a.doctor?.fullName}</td>
                        <td>{a.workDate}</td>
                        <td>
                          {a.startTime} - {a.endTime}
                        </td>
                        <td>
                          {a.appointmentType === "tai kham"
                            ? "Tái khám"
                            : "Khám lần đầu"}
                        </td>
                        <td>{a.status}</td>
                        <td>
                          <div className="d-flex gap-2">
                            {a.status === "Scheduled" && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancel(a.appointmentId)}
                              >
                                Hủy
                              </button>
                            )}
                            {a.status === "Completed" && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() =>
                                  navigate(
                                    `/appointment/${
                                      a.appointmentId
                                    }/review?doctorId=${a.doctorId}&serviceId=${
                                      a.services[0]?.serviceId || ""
                                    }`
                                  )
                                }
                              >
                                Đánh giá
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ⭐ Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3 gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ←
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      className={`btn ${
                        currentPage === i + 1
                          ? "btn-success"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
