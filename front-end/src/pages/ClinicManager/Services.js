import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaCamera } from "react-icons/fa";
import { toast } from "react-toastify";

export default function ManagerServices() {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    serviceName: "",
    description: "",
    price: "",
    image: null,
  });
  const [editingService, setEditingService] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ================= FETCH =================
  const fetchServices = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/services");
      setServices(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được danh sách dịch vụ");
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ================= ADD =================
  const handleAddService = async (e) => {
    e.preventDefault();

    if (Number(newService.price) < 0) {
      toast.error("Giá dịch vụ không được nhỏ hơn 0");
      return;
    }

    const formData = new FormData();
    formData.append("serviceName", newService.serviceName);
    formData.append("description", newService.description);
    formData.append("price", newService.price);
    formData.append("duration", newService.duration);
    if (newService.image) formData.append("image", newService.image);

    try {
      await axios.post("http://localhost:5000/api/services", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Thêm dịch vụ thành công");
      setShowModal(false);
      setNewService({
        serviceName: "",
        description: "",
        price: "",
        duration: "",
        image: null,
      });
      setPreview(null);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Thêm dịch vụ thất bại");
    }
  };

  // ================= UPDATE =================
  const handleUpdateService = async (e) => {
    e.preventDefault();

    if (Number(editingService.price) < 0) {
      toast.error("Giá dịch vụ không được nhỏ hơn 0");
      return;
    }

    const formData = new FormData();
    formData.append("serviceName", editingService.serviceName);
    formData.append("description", editingService.description);
    formData.append("price", editingService.price);
    formData.append("duration", editingService.duration);
    if (editingService.image instanceof File) {
      formData.append("image", editingService.image);
    }

    try {
      await axios.put(
        `http://localhost:5000/api/services/${editingService.serviceId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("Cập nhật dịch vụ thành công");
      setShowModal(false);
      setEditingService(null);
      setPreview(null);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật thất bại");
    }
  };

  // ================= DELETE =================
  const handleDeleteService = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa dịch vụ này không?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/services/${id}`);
      toast.success("Xóa dịch vụ thành công");
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error("Xóa thất bại");
    }
  };

  // ================= IMAGE =================
  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.warning("Chỉ chấp nhận JPG / PNG");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.warning("Ảnh không vượt quá 10MB");
      return;
    }

    setPreview(URL.createObjectURL(file));

    isEdit
      ? setEditingService({ ...editingService, image: file })
      : setNewService({ ...newService, image: file });
  };

  // ================= SEARCH + PAGINATION =================
  const normalizeText = (str) =>
    str
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const filteredServices = services.filter((s) =>
    normalizeText(s.serviceName).includes(normalizeText(searchTerm))
  );

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentServices = filteredServices.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  // ================= RENDER =================
  return (
    <div className="container">
      <h3 className="fw-bold text-uppercase mb-4">Quản lý dịch vụ</h3>

      <button
        className="btn btn-success mb-3"
        onClick={() => {
          setShowModal(true);
          setEditingService(null);
          setPreview(null);
          setNewService({
            serviceName: "",
            description: "",
            price: "",
            image: null,
          });
        }}
      >
        <FaPlus className="me-2" /> Tạo dịch vụ
      </button>

      {/* SEARCH */}
      <div className="d-flex justify-content-end mb-3">
        <input
          className="form-control"
          style={{ maxWidth: 300 }}
          placeholder="Tìm kiếm dịch vụ..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* TABLE */}
      <div className="card shadow-sm p-3 table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-success">
            <tr>
              <th>ID</th>
              <th>Ảnh</th>
              <th>Tên</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Thời gian</th>
              {/* <th>Ngày tạo</th> */}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currentServices.map((s) => (
              <tr key={s.serviceId}>
                <td>{s.serviceId}</td>
                <td>
                  {s.imageUrl && (
                    <img src={s.imageUrl} alt="" width={50} height={50} />
                  )}
                </td>
                <td>{s.serviceName}</td>
                <td style={{ whiteSpace: "pre-wrap" }}>{s.description}</td>
                <td>{Number(s.price).toLocaleString("vi-VN")} ₫</td>
                <td>{s.duration} ngày</td>
                {/* <td>{new Date(s.createdAt).toLocaleDateString("vi-VN")}</td> */}
                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => {
                      setEditingService(s);
                      setPreview(s.imageUrl || null);
                      setShowModal(true);
                    }}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDeleteService(s.serviceId)}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-center gap-2">
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
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="modal show fade d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form
                onSubmit={
                  editingService ? handleUpdateService : handleAddService
                }
              >
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingService ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ"}
                  </h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  />
                </div>

                <div className="modal-body d-flex flex-column gap-3">
                  <input
                    className="form-control"
                    placeholder="Tên dịch vụ"
                    required
                    value={
                      editingService?.serviceName || newService.serviceName
                    }
                    onChange={(e) =>
                      editingService
                        ? setEditingService({
                            ...editingService,
                            serviceName: e.target.value,
                          })
                        : setNewService({
                            ...newService,
                            serviceName: e.target.value,
                          })
                    }
                  />

                  <textarea
                    className="form-control"
                    placeholder="Mô tả dịch vụ"
                    style={{ minHeight: 150 }}
                    value={
                      editingService?.description || newService.description
                    }
                    onChange={(e) =>
                      editingService
                        ? setEditingService({
                            ...editingService,
                            description: e.target.value,
                          })
                        : setNewService({
                            ...newService,
                            description: e.target.value,
                          })
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="Giá"
                    required
                    value={editingService?.price || newService.price}
                    onChange={(e) =>
                      editingService
                        ? setEditingService({
                            ...editingService,
                            price: e.target.value,
                          })
                        : setNewService({
                            ...newService,
                            price: e.target.value,
                          })
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    step="1" // chỉ cho số nguyên
                    className="form-control"
                    placeholder="Thời lượng (ngày)"
                    required
                    value={editingService?.duration || newService.duration}
                    onChange={(e) => {
                      const value = e.target.value;

                      // Không cho số âm
                      if (value === "" || Number(value) >= 0) {
                        editingService
                          ? setEditingService({
                              ...editingService,
                              duration: Math.floor(Number(value)), // ép số nguyên
                            })
                          : setNewService({
                              ...newService,
                              duration: Math.floor(Number(value)),
                            });
                      }
                    }}
                  />

                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="file"
                      hidden
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e, !!editingService)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <FaCamera /> Ảnh
                    </button>
                    {preview && (
                      <img src={preview} alt="" width={50} height={50} />
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-success">
                    {editingService ? "Cập nhật" : "Thêm"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
