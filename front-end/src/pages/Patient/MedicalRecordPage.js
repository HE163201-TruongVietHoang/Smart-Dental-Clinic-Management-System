import React, { useState, useEffect, useMemo } from "react";
import { ClipboardList, Stethoscope, Pill, Receipt } from "lucide-react";

import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";

export default function MedicalRecordPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  // FILTER
  const [dateFilter, setDateFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/patients/${user.userId}/medical-record`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setRecords(data.medicalRecord || []);
      } catch (err) {
        console.error("API error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, []);

  /* ================= FILTER LOGIC ================= */
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // filter theo ngày
      if (dateFilter && r.workDate?.split("T")[0] !== dateFilter) {
        return false;
      }

      // filter theo dịch vụ
      if (serviceFilter) {
        const services = r.diagnosis?.services || [];
        const match = services.some((s) =>
          s.serviceName?.toLowerCase().includes(serviceFilter.toLowerCase())
        );
        if (!match) return false;
      }

      return true;
    });
  }, [records, dateFilter, serviceFilter]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // reset page khi filter
  }, [dateFilter, serviceFilter]);

  /* ================= UI HELPERS ================= */
  const badgeColor = (status) => {
    switch (status) {
      case "Completed":
        return "badge bg-success";
      case "Cancelled":
        return "badge bg-danger";
      case "DiagnosisCompleted":
        return "badge bg-info";
      default:
        return "badge bg-secondary";
    }
  };

  /* ================= RENDER ================= */
  return (
    <>
      <Header />

      <div className="min-vh-100 py-4">
        <div className="container">
          <h1 className="text-center fw-bold mb-2" style={{ color: "#2ECCB6" }}>
            Hồ Sơ Khám Bệnh
          </h1>
          <p className="text-center text-muted mb-4">
            Danh sách các lần khám bệnh của bạn.
          </p>

          {/* FILTER BAR */}
          <div className="row mb-4">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Lọc theo ngày</label>
              <input
                type="date"
                className="form-control"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Lọc theo dịch vụ</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tên dịch vụ..."
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <p className="text-center text-muted">Đang tải...</p>
          ) : filteredRecords.length === 0 ? (
            <div className="alert alert-info text-center">
              Không có hồ sơ phù hợp.
            </div>
          ) : (
            <>
              <div className="row g-4">
                {paginatedRecords.map((r) => (
                  <div key={r.appointmentId} className="col-12">
                    <div className="card shadow-sm border-0">
                      <div className="card-body px-4 py-3">
                        {/* SUMMARY */}
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5
                              className="fw-bold d-flex align-items-center gap-2 mb-2"
                              style={{ color: "#2ECCB6" }}
                            >
                              Khám #{r.appointmentId}
                            </h5>
                            <div className="row text-muted small">
                              <div className="col-md-6">
                                <b>Ngày:</b> {r.workDate?.split("T")[0]}
                              </div>
                              <div className="col-md-6">
                                <b>Giờ:</b> {r.startTime} - {r.endTime}
                              </div>
                              <div className="col-md-6 mt-1">
                                <b>Bệnh nhân:</b> {user.fullName}
                              </div>
                              <div className="col-md-6 mt-1">
                                <b>Bác sĩ:</b> {r.doctorName}
                              </div>
                            </div>
                          </div>

                          <div className="text-end">
                            <span
                              className={`${badgeColor(
                                r.appointmentStatus
                              )} mb-2 d-inline-block`}
                            >
                              {r.appointmentStatus}
                            </span>
                            <br />
                            <button
                              className="btn btn-sm text-white mt-2 px-3"
                              style={{ backgroundColor: "#2ECCB6" }}
                              onClick={() =>
                                setOpenId(
                                  openId === r.appointmentId
                                    ? null
                                    : r.appointmentId
                                )
                              }
                            >
                              {openId === r.appointmentId
                                ? "Ẩn chi tiết"
                                : "Xem chi tiết"}
                            </button>
                          </div>
                        </div>

                        {/* DETAILS */}
                        {openId === r.appointmentId && (
                          <div className="mt-4 pt-3 border-top">
                            {/* DIAGNOSIS */}
                            {r.diagnosis && (
                              <div className="mb-3">
                                <h6
                                  className="fw-bold d-flex align-items-center gap-2 mb-2"
                                  style={{ color: "#2ECCB6" }}
                                >
                                  Chẩn đoán
                                </h6>
                                <p>
                                  <b>Triệu chứng:</b> {r.diagnosis.symptoms}
                                </p>
                                <p>
                                  <b>Kết luận:</b> {r.diagnosis.diagnosisResult}
                                </p>
                                <p>
                                  <b>Ghi chú:</b> {r.diagnosis.doctorNote}
                                </p>

                                <h6 className="fw-bold mt-3">
                                  Dịch vụ đã thực hiện
                                </h6>
                                <ul className="small ms-3">
                                  {r.diagnosis.services.map((svc, i) => (
                                    <li key={i}>{svc.serviceName}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* PRESCRIPTION */}
                            {r.prescription?.length > 0 && (
                              <div className="mb-3">
                                <h6
                                  className="fw-bold d-flex align-items-center gap-2 mb-2"
                                  style={{ color: "#2ECCB6" }}
                                >
                                  Đơn thuốc
                                </h6>
                                <ul className="list-group small">
                                  {r.prescription.map((med, idx) => (
                                    <li key={idx} className="list-group-item">
                                      <strong>{med.medicineName}</strong>
                                      <br />
                                      Liều dùng: {med.dosage}
                                      <br />
                                      Số lượng: {med.quantity}
                                      <br />
                                      Hướng dẫn: {med.usageInstruction}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* INVOICE */}
                            {r.invoice && (
                              <div className="mb-2">
                                <h6
                                  className="fw-bold d-flex align-items-center gap-2 mb-2"
                                  style={{ color: "#2ECCB6" }}
                                >
                                  <Receipt size={18} /> Hóa đơn
                                </h6>
                                <p className="small mb-1">
                                  <b>Thành tiền:</b> {r.invoice.finalAmount}đ
                                </p>
                                <span className="badge bg-success">
                                  {r.invoice.status}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4 gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
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
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
