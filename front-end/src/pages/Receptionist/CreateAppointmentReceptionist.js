import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function CreateAppointmentReceptionist() {
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    fullName: "",
    gender: "Male",
    dob: "",
    address: "",
    reason: "",
    appointmentType: "kham lan dau",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token"); // lấy token từ localStorage

  // Lấy danh sách bác sĩ (có token)
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!token) {
        setError("Bạn cần đăng nhập để truy cập dữ liệu");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/doctors", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Không thể tải danh sách bác sĩ");
        }

        setDoctors(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchDoctors();
  }, [token]);

  // Lấy slot (có token)
  useEffect(() => {
    if (selectedDoctor && date && token) {
      const fetchSlots = async () => {
        try {
          const res = await fetch(
            `http://localhost:5000/api/appointments/slots?doctorId=${selectedDoctor}&date=${date}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Không thể tải khung giờ");
          }

          setSlots(data);
        } catch (err) {
          setError(err.message);
        }
      };

      fetchSlots();
    }
  }, [selectedDoctor, date, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSlot) {
      toast.warning("Vui lòng chọn khung giờ!");
      return;
    }

    const body = {
      ...form,
      doctorId: selectedDoctor,
      slotId: selectedSlot,
    };

    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/api/appointments/receptionist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Có lỗi xảy ra!");
      }

      toast.success("Lễ tân đặt lịch thành công!");
      setForm({
        email: "",
        phone: "",
        fullName: "",
        gender: "Male",
        dob: "",
        address: "",
        reason: "",
        appointmentType: "tai kham",
      });
      setSelectedSlot(null);
      setSlots([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div>
      <section className="w-100" style={{ minHeight: "100vh" }}>
        <div className="container">
          <div
            className="card shadow-sm border-0 p-4 mx-auto"
            style={{ maxWidth: "800px", borderRadius: "20px" }}
          >
            <h4
              className="fw-bold mb-4 text-center"
              style={{ color: "#2ECCB6" }}
            >
              Lễ tân đặt lịch khám
            </h4>

            {error && (
              <div className="alert alert-danger text-center">{error}</div>
            )}

            {!error && (
              <form onSubmit={handleSubmit}>
                {/* THÔNG TIN BỆNH NHÂN */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Họ và tên</label>
                    <input
                      type="text"
                      className="form-control"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Giới tính</label>
                    <select
                      className="form-select"
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Ngày sinh</label>
                    <input
                      type="date"
                      className="form-control"
                      name="dob"
                      value={form.dob}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Địa chỉ</label>
                    <input
                      type="text"
                      className="form-control"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <hr className="my-4" />

                {/* BÁC SĨ + NGÀY */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Bác sĩ</label>
                    <select
                      className="form-select"
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn bác sĩ --</option>
                      {doctors.map((d) => (
                        <option key={d.userId} value={d.userId}>
                          {d.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Ngày khám</label>
                    <input
                      type="date"
                      className="form-control"
                      min={new Date().toISOString().split("T")[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* SLOT */}
                <div className="mt-3">
                  <label className="form-label fw-semibold">Khung giờ</label>

                  <div className="d-flex flex-wrap gap-2">
                    {slots.length === 0 ? (
                      <p className="text-muted small">Chưa có khung giờ</p>
                    ) : (
                      slots.map((slot) => (
                        <button
                          key={slot.slotId}
                          type="button"
                          className={`btn px-3 py-2 rounded-pill ${
                            slot.isBooked
                              ? "btn-secondary"
                              : selectedSlot === slot.slotId
                              ? "btn-success"
                              : "btn-outline-success"
                          }`}
                          disabled={slot.isBooked}
                          onClick={() => setSelectedSlot(slot.slotId)}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Lý do */}
                <div className="mt-3">
                  <label className="form-label fw-semibold">Lý do khám</label>
                  <input
                    type="text"
                    className="form-control"
                    name="reason"
                    value={form.reason}
                    placeholder="Ví dụ: Kiểm tra răng định kỳ..."
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Loại khám */}
                <div className="mt-3">
                  <label className="form-label fw-semibold">Loại khám</label>
                  <select
                    className="form-select"
                    name="appointmentType"
                    value={form.appointmentType}
                    onChange={handleChange}
                  >
                    <option value="tai kham">Tái khám</option>
                    <option value="kham lan dau">Khám lần đầu</option>
                  </select>
                </div>

                <div className="text-center mt-4">
                  <button
                    type="submit"
                    className="btn btn-lg text-white px-5"
                    style={{ backgroundColor: "#2ECCB6" }}
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Đặt lịch ngay"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
