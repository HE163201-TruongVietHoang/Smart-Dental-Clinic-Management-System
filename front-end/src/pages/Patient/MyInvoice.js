import React, { useEffect, useState } from "react";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";
import { getInvoicesByPatient, createPaymentUrl } from "../../api/api";
import { toast } from "react-toastify";
import { Modal, Button } from "react-bootstrap";

export default function InvoiceListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    doctor: "",
    status: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:5000/api/invoices/user/${user.userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) setList(data);
        else setList([]);
      } catch (err) {
        setList([]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handlePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleVNPay = async () => {
    if (!selectedInvoice) return;
    try {
      const payload = {
        appointmentId: selectedInvoice.appointmentId,
        amount: (selectedInvoice.totalAmount || 0) - (selectedInvoice.discountAmount || 0),
        invoiceId: selectedInvoice.invoiceId,
        bankCode: "",
      };
      const response = await createPaymentUrl(payload);
      if (response.success) {
        window.location.href = response.data.vnpUrl;
      } else {
        toast.error("Không thể tạo URL thanh toán");
      }
    } catch (err) {
      toast.error("Lỗi khi thanh toán");
    }
    setShowModal(false);
  };

  const handleVietQR = () => {
    if (!selectedInvoice) return;
    const amount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.discountAmount || 0);
    const qrUrl = `https://img.vietqr.io/image/970418-5050421390-compact.png?amount=${amount}&addInfo=Thanh%20toan%20hoa%20don%20${selectedInvoice.invoiceId}&accountName=Smart%20Dental`;
    setQrUrl(qrUrl);
    setShowModal(false);
    setShowQrModal(true);
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3">Đang tải thông tin...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ background: "#f6fbff", minHeight: "100vh" }}>
      <Header />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 0 0 0" }}>
        <h2
          style={{
            color: "#1E90FF",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 24,
            letterSpacing: 1,
          }}
        >
          Lịch sử hóa đơn
        </h2>
        <div
          style={{
            padding: "16px",
            background: "#f9f9f9",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <h5 style={{ marginBottom: "12px", color: "#1E90FF" }}>
            Lọc hóa đơn
          </h5>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label>
              Trạng thái:{" "}
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                style={{ padding: "4px", borderRadius: "4px" }}
              >
                <option value="">Tất cả</option>
                <option value="Pending">Chờ thanh toán</option>
                <option value="Paid">Đã thanh toán</option>
                <option value="Cancelled">Đã hủy</option>
              </select>
            </label>
            <label>
              Từ ngày:{" "}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                style={{ padding: "4px", borderRadius: "4px" }}
              />
            </label>
            <label>
              Đến ngày:{" "}
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                style={{ padding: "4px", borderRadius: "4px" }}
              />
            </label>
            <label>
              Bác sĩ:{" "}
              <input
                type="text"
                placeholder="Tên bác sĩ"
                value={filters.doctor}
                onChange={(e) =>
                  setFilters({ ...filters, doctor: e.target.value })
                }
                style={{ padding: "4px", borderRadius: "4px" }}
              />
            </label>
          </div>
        </div>
        {(() => {
          const filteredList = list.filter((item) => {
            const itemDate = new Date(item.examDate);
            const fromDate = filters.dateFrom
              ? new Date(filters.dateFrom)
              : null;
            const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
            const matchesDate =
              (!fromDate || itemDate >= fromDate) &&
              (!toDate || itemDate <= toDate);
            const matchesDoctor =
              !filters.doctor ||
              item.doctorName
                .toLowerCase()
                .includes(filters.doctor.toLowerCase());
            const matchesStatus =
              !filters.status || item.status === filters.status;
            return matchesDate && matchesDoctor && matchesStatus;
          });
          const totalPages = Math.ceil(filteredList.length / itemsPerPage);
          const paginatedList = filteredList.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );
          return (
            <>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  boxShadow: "0 4px 16px rgba(30,144,255,0.07)",
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#eaf6ff" }}>
                      <th style={th}>Mã hóa đơn</th>
                      <th style={th}>Bác sĩ</th>
                      <th style={th}>Ngày</th>
                      <th style={th}>Giờ khám</th>
                      <th style={th}>Trạng thái</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td
                          style={{
                            padding: 24,
                            textAlign: "center",
                            color: "#888",
                          }}
                          colSpan={6}
                        >
                          {list.length === 0
                            ? "Bạn chưa có hóa đơn nào."
                            : "Không có hóa đơn nào khớp với bộ lọc."}
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((i) => (
                        <tr key={i.invoiceId} style={tr}>
                          <td style={td}>#{i.invoiceId}</td>
                          <td style={td}>{i.doctorName}</td>
                          <td style={td}>
                            {i.examDate
                              ? new Date(i.examDate).toLocaleDateString("vi-VN")
                              : "Không rõ"}
                          </td>
                          <td style={td}>
                            {i.startTime} - {i.endTime}
                          </td>
                          <td style={tdStatus}>
                            <span
                              className={`badge-status ${
                                i.status === "Paid"
                                  ? "paid"
                                  : i.status === "Cancelled"
                                  ? "cancelled"
                                  : "pending"
                              }`}
                            >
                              {i.status === "Paid"
                                ? "Đã thanh toán"
                                : i.status === "Cancelled"
                                ? "Đã hủy"
                                : "Chờ thanh toán"}
                            </span>
                          </td>
                          <td style={td}>
                            <a href={`/invoice/me/${i.invoiceId}`} style={btn}>
                              Xem chi tiết
                            </a>
                            {i.status !== "Paid" && (
                              <button
                                onClick={() => handlePayment(i)}
                                style={{
                                  ...btn,
                                  background: "#28a745",
                                  marginLeft: "8px",
                                }}
                              >
                                Thanh toán
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={
                      currentPage === 1
                        ? { ...pageBtn, opacity: 0.5, cursor: "not-allowed" }
                        : pageBtn
                    }
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={
                          currentPage === page
                            ? {
                                ...pageBtn,
                                background: "#1E90FF",
                                color: "#fff",
                              }
                            : pageBtn
                        }
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    style={
                      currentPage === totalPages
                        ? { ...pageBtn, opacity: 0.5, cursor: "not-allowed" }
                        : pageBtn
                    }
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
      <Footer />
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Chọn phương thức thanh toán</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Vui lòng chọn phương thức thanh toán cho hóa đơn #{selectedInvoice?.invoiceId}</p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <Button variant="primary" onClick={handleVNPay}>
              Thanh toán bằng VNPay
            </Button>
            <Button variant="success" onClick={handleVietQR}>
              Thanh toán bằng VietQR
            </Button>
          </div>
        </Modal.Body>
      </Modal>
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Mã QR thanh toán</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ textAlign: "center" }}>
          <p>Quét mã QR để thanh toán hóa đơn #{selectedInvoice?.invoiceId}</p>
          <img src={qrUrl} alt="QR Code" style={{ maxWidth: "100%", height: "auto" }} />
        </Modal.Body>
      </Modal>
      <style>{`
        .badge-status {
          display: inline-block;
          font-weight: 600;
          font-size: 13px;
          border-radius: 8px;
          padding: 4px 12px;
        }
        .badge-status.pending {
          background: #ffecb3;
          color: #b26a00;
        }
        .badge-status.paid {
          background: #d4edda;
          color: #155724;
        }
        .badge-status.cancelled {
          background: #f8d7da;
          color: #721c24;
        }
        @media (max-width: 600px) {
          table, thead, tbody, th, td, tr { display: block; }
          thead tr { display: none; }
          tr { margin-bottom: 18px; }
          td { border: none !important; padding: 10px 8px !important; }
          .badge-status { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}

// STYLE
const th = {
  padding: "14px 8px",
  fontWeight: 700,
  color: "#1E90FF",
  fontSize: 15,
  borderBottom: "1px solid #e3eaf3",
};

const td = {
  padding: "13px 8px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: 15,
  color: "#222",
};

const tdStatus = {
  padding: "13px 8px",
  borderBottom: "1px solid #f0f0f0",
  textAlign: "center",
};

const tr = {
  background: "#fff",
  transition: "background 0.15s",
};

const btn = {
  padding: "7px 16px",
  background: "#1E90FF",
  color: "#fff",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
  boxShadow: "0 2px 8px #eaf6ff",
  transition: "background 0.15s, color 0.15s",
  display: "inline-block",
};

const pageBtn = {
  padding: "8px 12px",
  margin: "0 4px",
  border: "1px solid #1E90FF",
  background: "#fff",
  color: "#1E90FF",
  borderRadius: "4px",
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};
