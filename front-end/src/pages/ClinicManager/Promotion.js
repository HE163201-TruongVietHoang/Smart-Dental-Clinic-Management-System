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
  InputGroup,
  FormControl,
} from "react-bootstrap";
import {
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "../../api/api";

const Promotion = () => {
  const [promotions, setPromotions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percent",
    discountValue: 0,
    startDate: "",
    endDate: "",
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = "Mã khuyến mãi không được để trống";
    } else if (formData.code.length < 3) {
      newErrors.code = "Mã khuyến mãi phải có ít nhất 3 ký tự";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Mô tả không được để trống";
    } else if (formData.description.length < 10) {
      newErrors.description = "Mô tả phải có ít nhất 10 ký tự";
    }

    if (!formData.discountValue || formData.discountValue <= 0) {
      newErrors.discountValue = "Giá trị giảm giá phải lớn hơn 0";
    } else if (
      formData.discountType === "percent" &&
      formData.discountValue > 100
    ) {
      newErrors.discountValue = "Phần trăm giảm giá không được vượt quá 100%";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Ngày bắt đầu không được để trống";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Ngày kết thúc không được để trống";
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        newErrors.startDate = "Ngày bắt đầu không được nhỏ hơn ngày hiện tại";
      }
      if (end <= start) {
        newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const data = await getAllPromotions();
      setPromotions(data);
    } catch (err) {
      setError("Không thể tải danh sách khuyến mãi");
    }
  };

  // Filter promotions
  const filteredPromotions = promotions.filter((promotion) => {
    const matchesSearch =
      promotion.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && promotion.isActive) ||
      (filterStatus === "inactive" && !promotion.isActive);

    const matchesType =
      filterType === "all" || promotion.discountType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPromotions = filteredPromotions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType]);

  const handleShowModal = (promotion = null) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        code: promotion.code,
        description: promotion.description,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startDate: promotion.startDate?.split("T")[0],
        endDate: promotion.endDate?.split("T")[0],
        isActive: promotion.isActive,
      });
    } else {
      setEditingPromotion(null);
      setFormData({
        code: "",
        description: "",
        discountType: "percent",
        discountValue: 0,
        startDate: "",
        endDate: "",
        isActive: true,
      });
    }

    setShowModal(true);
    setError("");
    setSuccess("");
    setErrors({});
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setError("Vui lòng kiểm tra lại các trường nhập liệu");
      return;
    }

    // Kiểm tra trùng mã khuyến mãi
    const codeExists = promotions.some(
      (promotion) =>
        promotion.code.toLowerCase() === formData.code.toLowerCase() &&
        (!editingPromotion || promotion.promotionId !== editingPromotion.promotionId)
    );

    if (codeExists) {
      setError("Mã khuyến mãi đã tồn tại. Vui lòng chọn mã khác.");
      return;
    }

    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion.promotionId, formData);
        setSuccess("Cập nhật khuyến mãi thành công");
      } else {
        await createPromotion(formData);
        setSuccess("Thêm khuyến mãi thành công");
      }
      loadPromotions();
      handleCloseModal();
    } catch (err) {
      setError("Có lỗi xảy ra khi lưu khuyến mãi");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa khuyến mãi này?")) {
      try {
        await deletePromotion(id);
        setSuccess("Xóa khuyến mãi thành công");
        loadPromotions();
      } catch (err) {
        setError("Có lỗi xảy ra khi xóa khuyến mãi");
      }
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Quản lý Khuyến mãi</h2>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => handleShowModal()}>
            Thêm Khuyến mãi
          </Button>
        </Col>
      </Row>

      {success && <Alert variant="success">{success}</Alert>}

      <Row className="mb-3">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>Tìm kiếm</InputGroup.Text>
            <FormControl
              placeholder="Tìm theo mã hoặc mô tả"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Tất cả loại</option>
            <option value="percent">Phần trăm</option>
            <option value="amount">Cố định</option>
          </Form.Select>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Table responsive striped bordered hover>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Mô tả</th>
                <th>Loại giảm giá</th>
                <th>Giá trị</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPromotions.map((promotion) => (
                <tr key={promotion.promotionId}>
                  <td>{promotion.code}</td>
                  <td>{promotion.description}</td>
                  <td>
                    {promotion.discountType === "percent"
                      ? "Phần trăm"
                      : "Cố định"}
                  </td>
                  <td>
                    {promotion.discountValue}
                    {promotion.discountType === "percent" ? "%" : " VND"}
                  </td>
                  <td>
                    {new Date(promotion.startDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    {new Date(promotion.endDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    {promotion.isActive ? "Hoạt động" : "Không hoạt động"}
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleShowModal(promotion)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(promotion.promotionId)}
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))}

              {paginatedPromotions.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-3">
                    Không có khuyến mãi nào
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Pagination mới */}
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

      {/* Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPromotion ? "Sửa Khuyến mãi" : "Thêm Khuyến mãi"}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {/* Form */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mã khuyến mãi</Form.Label>
                  <Form.Control
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    isInvalid={!!errors.code}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.code}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Loại giảm giá</Form.Label>
                  <Form.Select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleInputChange}
                  >
                    <option value="percent">Phần trăm</option>
                    <option value="amount">Cố định</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Mô tả</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                isInvalid={!!errors.description}
              />
              <Form.Control.Feedback type="invalid">
                {errors.description}
              </Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Giá trị giảm giá</Form.Label>
                  <Form.Control
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    min="1"
                    required
                    isInvalid={!!errors.discountValue}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.discountValue}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Check
                    type="checkbox"
                    name="isActive"
                    label="Hoạt động"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ngày bắt đầu</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    isInvalid={!!errors.startDate}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.startDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ngày kết thúc</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    isInvalid={!!errors.endDate}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.endDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              {editingPromotion ? "Cập nhật" : "Thêm"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Promotion;
