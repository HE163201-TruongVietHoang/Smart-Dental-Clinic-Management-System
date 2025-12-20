import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Alert,
  Badge,
} from "react-bootstrap";
import {
  getAllInvoices,
  updateInvoice,
  getInvoicesByPatient,
  createPaymentUrl,
  applyPromotion,
  getInvoiceDetail,
} from "../../api/api";

const Invoice = () => {
  const [invoices, setInvoices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [formData, setFormData] = useState({
    status: "Pending",
    discountAmount: 0,
    promotionCode: "",
    promotionId: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [promotionError, setPromotionError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    patient: "",
    doctor: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    loadInvoices();

    // Load lại invoices khi user quay lại tab (sau thanh toán)
    const handleFocus = () => loadInvoices();
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadInvoices = async () => {
    try {
      const response = await getAllInvoices();
      setInvoices(response.data || response);
    } catch (err) {
      setError("Không thể tải danh sách hóa đơn");
    }
  };

  const handleShowModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        status: invoice.status,
        discountAmount: invoice.discountAmount || 0,
        promotionCode: invoice.promotionCode || "",
        promotionId: invoice.promotionId || null,
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        status: "Pending",
        discountAmount: 0,
        promotionCode: "",
        promotionId: null,
      });
    }
    setShowModal(true);
    setError("");
    setSuccess("");
    setPromotionError("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
  };

  const handleApplyPromotion = async () => {
    if (!formData.promotionCode.trim()) {
      setPromotionError("Vui lòng nhập mã giảm giá");
      return;
    }
    try {
      const response = await applyPromotion({
        total: editingInvoice.totalAmount,
        code: formData.promotionCode,
      });
      setFormData({
        ...formData,
        discountAmount: response.discount,
        promotionId: response.promotion.promotionId,
      });
      setSuccess(
        `Áp dụng mã giảm giá thành công! Giảm ${formatCurrency(
          response.discount
        )}`
      );
      setPromotionError("");
      setError("");
    } catch (err) {
      setPromotionError("Mã giảm giá không hợp lệ hoặc đã hết hạn");
      setSuccess("");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateInvoice(editingInvoice.invoiceId, formData);
      setSuccess("Cập nhật hóa đơn thành công");
      loadInvoices();
      handleCloseModal();
    } catch (err) {
      setError("Có lỗi xảy ra khi cập nhật hóa đơn");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Paid":
        return <Badge bg="success">Đã thanh toán</Badge>;
      case "Pending":
        return <Badge bg="warning">Chờ thanh toán</Badge>;
      case "Cancelled":
        return <Badge bg="danger">Đã hủy</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatTime = (timeString) => {
    // console.log('formatTime input:', timeString, typeof timeString);
    if (!timeString) return "";

    if (typeof timeString === "string") {
      try {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          const result = date.toTimeString().substring(0, 5);
          //   console.log('formatTime result (datetime):', result);
          return result;
        }
      } catch (e) {
        console.log("formatTime parse error:", e);
      }

      if (timeString.includes(":")) {
        const result = timeString.substring(0, 5);
        // console.log('formatTime result (HH:MM):', result);
        return result;
      }
    }

    // Nếu là Date object, format
    if (timeString instanceof Date) {
      const result = timeString.toTimeString().substring(0, 5);
      // console.log('formatTime result (Date):', result);
      return result;
    }

    // Nếu là number (timestamp), convert to Date
    if (typeof timeString === "number") {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        const result = date.toTimeString().substring(0, 5);
        console.log("formatTime result (timestamp):", result);
        return result;
      }
    }

    // console.log('formatTime result (fallback):', ''));
    return "";
  };
  //  const handlePayment = async (invoice) => {
  //     try {
  //       const payload = {
  //         appointmentId: invoice.appointmentId,
  //         amount: (invoice.totalAmount || 0) - (invoice.discountAmount || 0), // Sử dụng finalAmount
  //         invoiceId: invoice.invoiceId,
  //         bankCode: ""
  //       };
  //       const response = await createPaymentUrl(payload);
  //       if (response.success) {
  //         window.location.href = response.data.vnpUrl;
  //       } else {
  //         setError('Không thể tạo URL thanh toán');
  //       }
  //     } catch (err) {
  //       setError('Lỗi khi thanh toán');
  //     }
  //   };
  const handleExport = async (invoice) => {
    setExporting(true);
    try {
      const detail = await getInvoiceDetail(invoice.invoiceId);
      const { header, diagnosis, services, medicines } = detail;

      let servicesHtml =
        "<h3>Dịch vụ</h3><table><tr><th>Tên dịch vụ</th><th>Giá</th></tr>";
      services.forEach((srv) => {
        servicesHtml += `<tr><td>${srv.serviceName}</td><td>${formatCurrency(
          srv.price
        )}</td></tr>`;
      });
      servicesHtml += "</table>";

      let medicinesHtml =
        "<h3>Thuốc</h3><table><tr><th>Tên thuốc</th><th>Liều lượng</th><th>Hướng dẫn</th><th>Số lượng</th></tr>";
      medicines.forEach((med) => {
        medicinesHtml += `<tr><td>${med.medicineName}</td><td>${med.dosage}</td><td>${med.usageInstruction}</td><td>${med.quantity}</td></tr>`;
      });
      medicinesHtml += "</table>";

      let diagnosisHtml = "";
      if (diagnosis) {
        diagnosisHtml = `<h3>Chẩn đoán</h3><p><strong>Triệu chứng:</strong> ${
          diagnosis.symptoms || "N/A"
        }</p><p><strong>Kết quả:</strong> ${
          diagnosis.diagnosisResult || "N/A"
        }</p><p><strong>Ghi chú:</strong> ${diagnosis.doctorNote || "N/A"}</p>`;
      }

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Hóa đơn ${header.invoiceId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { text-align: center; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Hóa đơn #${header.invoiceId}</h1>
            <div class="info">
              <p><strong>Bệnh nhân:</strong> ${header.patientName}</p>
              <p><strong>Số điện thoại:</strong> ${
                header.patientPhone || "N/A"
              }</p>
              <p><strong>Bác sĩ:</strong> ${header.doctorName || "N/A"}</p>
              <p><strong>Ngày khám:</strong> ${
                header.examDate
                  ? new Date(header.examDate).toLocaleDateString("vi-VN")
                  : "N/A"
              }</p>
              <p><strong>Thời gian:</strong> ${header.startTime} - ${
        header.endTime
      }</p>
              <p><strong>Ngày tạo:</strong> ${new Date(
                new Date(invoice.issuedDate).getTime() - 7 * 60 * 60 * 1000
              ).toLocaleString("vi-VN")}</p>
            </div>
            ${diagnosisHtml}
            ${servicesHtml}
            ${medicinesHtml}
            <h3>Tóm tắt</h3>
            <table>
              <tr>
                <td>Tổng tiền</td>
                <td>${formatCurrency(header.totalAmount)}</td>
              </tr>
              <tr>
                <td>Giảm giá</td>
                <td>${formatCurrency(invoice.discountAmount || 0)}</td>
              </tr>
              <tr>
                <td><strong>Thành tiền</strong></td>
                <td><strong>${formatCurrency(header.finalAmount)}</strong></td>
              </tr>
            </table>
            <p><strong>Trạng thái:</strong> ${
              header.status === "Paid" ? "Đã thanh toán" : header.status
            }</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      setError("Không thể tải chi tiết hóa đơn để xuất");
    } finally {
      setExporting(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = !filters.status || invoice.status === filters.status;
    const matchesPatient =
      !filters.patient ||
      (invoice.patientName &&
        invoice.patientName
          .toLowerCase()
          .includes(filters.patient.toLowerCase()));
    const matchesDoctor =
      !filters.doctor ||
      (invoice.doctorName &&
        invoice.doctorName
          .toLowerCase()
          .includes(filters.doctor.toLowerCase()));
    const invoiceDate = new Date(invoice.issuedDate);
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
    const matchesDate =
      (!fromDate || invoiceDate >= fromDate) &&
      (!toDate || invoiceDate <= toDate);
    return matchesStatus && matchesPatient && matchesDoctor && matchesDate;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Quản lý Hóa đơn</h2>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <h5>Bộ lọc</h5>
          <Row>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Trạng thái</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả</option>
                  <option value="Pending">Chờ thanh toán</option>
                  <option value="Paid">Đã thanh toán</option>
                  <option value="Cancelled">Đã hủy</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Từ ngày</Form.Label>
                <Form.Control
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Đến ngày</Form.Label>
                <Form.Control
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Bệnh nhân</Form.Label>
                <Form.Control
                  type="text"
                  name="patient"
                  value={filters.patient}
                  onChange={handleFilterChange}
                  placeholder="Tên bệnh nhân"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Bác sĩ</Form.Label>
                <Form.Control
                  type="text"
                  name="doctor"
                  value={filters.doctor}
                  onChange={handleFilterChange}
                  placeholder="Tên bác sĩ"
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Table responsive striped bordered hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Bệnh nhân</th>
                <th>Lịch hẹn</th>
                <th>Khuyến mãi</th>
                <th>Tổng tiền</th>
                <th>Giảm giá</th>
                <th>Thành tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.invoiceId}>
                  <td>{invoice.invoiceId}</td>
                  <td>{invoice.patientName || `ID: ${invoice.patientId}`}</td>
                  <td>
                    {invoice.workDate
                      ? `${new Date(invoice.workDate).toLocaleDateString(
                          "vi-VN"
                        )}: ${formatTime(invoice.startTime)} - ${formatTime(
                          invoice.endTime
                        )}`
                      : `ID: ${invoice.appointmentId}`}
                  </td>
                  <td>{invoice.promotionCode || "Không có"}</td>
                  <td>{formatCurrency(invoice.totalAmount)}</td>
                  <td>{formatCurrency(invoice.discountAmount || 0)}</td>
                  <td>
                    {formatCurrency(
                      (invoice.totalAmount || 0) - (invoice.discountAmount || 0)
                    )}
                  </td>
                  <td>{getStatusBadge(invoice.status)}</td>
                  <td>
                    {new Date(
                      new Date(invoice.issuedDate).getTime() -
                        7 * 60 * 60 * 1000
                    ).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    {invoice.status === "Paid" ? (
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handleExport(invoice)}
                        className="me-2"
                        disabled={exporting}
                      >
                        {exporting ? "Đang xuất..." : "Xuất hóa đơn"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleShowModal(invoice)}
                        className="me-2"
                      >
                        Cập nhật
                      </Button>
                    )}
                    {/* {invoice.status !== 'Paid' && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handlePayment(invoice)}
                      >
                        Thanh toán
                      </Button>
                    )} */}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

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
                currentPage === i + 1 ? "btn-success" : "btn-outline-secondary"
              }`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            className="btn btn-outline-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            →
          </button>
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Cập nhật Hóa đơn #{editingInvoice?.invoiceId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingInvoice && (
            <div className="mb-3">
              <strong>Thông tin hóa đơn:</strong>
              <p>
                Bệnh nhân:{" "}
                {editingInvoice.patientName ||
                  `ID: ${editingInvoice.patientId}`}
              </p>
              <p>
                Lịch hẹn:{" "}
                {editingInvoice.workDate
                  ? `${new Date(editingInvoice.workDate).toLocaleDateString(
                      "vi-VN"
                    )}: ${formatTime(editingInvoice.startTime)} - ${formatTime(
                      editingInvoice.endTime
                    )}`
                  : `ID: ${editingInvoice.appointmentId}`}
              </p>
              <p>Khuyến mãi: {editingInvoice.promotionCode || "Không có"}</p>
              <p>Tổng tiền: {formatCurrency(editingInvoice.totalAmount)}</p>
              <hr />
            </div>
          )}
        </Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {success && <Alert variant="success">{success}</Alert>}
            {editingInvoice?.status === "Paid" && (
              <Alert variant="info">
                Hóa đơn đã được thanh toán. Không thể chỉnh sửa.
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Mã giảm giá</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="text"
                  name="promotionCode"
                  value={formData.promotionCode}
                  onChange={handleInputChange}
                  placeholder="Nhập mã giảm giá"
                  className="me-2"
                  disabled={editingInvoice?.status === "Paid"}
                />
                <Button
                  variant="outline-info"
                  onClick={handleApplyPromotion}
                  disabled={editingInvoice?.status === "Paid"}
                >
                  Áp dụng
                </Button>
              </div>
              {promotionError && (
                <Form.Text className="text-danger">{promotionError}</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Giảm giá</Form.Label>
              <Form.Control
                type="number"
                name="discountAmount"
                value={formData.discountAmount}
                min="0"
                step="0.01"
                readOnly
                disabled={editingInvoice?.status === "Paid"}
              />
              <Form.Text className="text-muted">
                Số tiền giảm giá (VND) - được tính tự động khi áp dụng mã
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Trạng thái</Form.Label>
              <Form.Select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={editingInvoice?.status === "Paid"}
              >
                <option value="Pending">Chờ thanh toán</option>
                <option value="Paid">Đã thanh toán</option>
                <option value="Cancelled">Đã hủy</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={editingInvoice?.status === "Paid"}
            >
              Cập nhật
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Invoice;
