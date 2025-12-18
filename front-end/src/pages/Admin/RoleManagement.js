import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const API_URL = "http://localhost:5000/api";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    roleName: "",
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // fetch roles
  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/roles`, {
        headers: getAuthHeaders(),
      });
      setRoles(res.data);
    } catch (err) {
      console.error("Fetch roles failed:", err);
      setMessage("Lỗi khi tải danh sách vai trò: " + (err.response?.data?.message || err.error));
    }
  };

  // handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // add or update role
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await axios.put(`${API_URL}/roles/${editingRole.roleId}`, form, {
          headers: getAuthHeaders(),
        });
        setMessage("Chỉnh sửa vai trò thành công!");
      } else {
        await axios.post(`${API_URL}/roles`, form, {
          headers: getAuthHeaders(),
        });
        setMessage("Thêm vai trò thành công!");
      }

      fetchRoles();
      resetForm();
    } catch (err) {
      console.error("Save failed:", err);
      setMessage("Lỗi khi lưu: " + (err.response?.data?.error || err.error));
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setForm({
      roleName: "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc muốn xóa vai trò này?")) return;

    try {
      await axios.delete(`${API_URL}/roles/${id}`, {
        headers: getAuthHeaders(),
      });
      setMessage("Xóa vai trò thành công!");
      fetchRoles();
    } catch (err) {
      console.error("Delete failed:", err);
      setMessage("Lỗi khi xóa: " + (err.response?.data?.error || err.error));
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setForm({
      roleName: role.roleName,
    });
  };

  // Filtering
  const normalize = (str) =>
    str
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const filteredRoles = roles.filter((r) =>
    normalize(r.roleName).includes(normalize(searchTerm))
  );

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const currentList = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container">
      <h3 className="mb-4 fw-bold text-uppercase">Quản lý Vai trò</h3>

      {message && (
        <div className={`alert ${message.includes("thành công") ? "alert-success" : "alert-danger"} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {/* Form thêm role */}
      <form onSubmit={handleSubmit} className="card p-3 shadow-sm mb-4">
        <h5 className="fw-semibold mb-3">
          <FaPlus className="me-2" />
          {editingRole ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}
        </h5>

        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <input
              type="text"
              className="form-control"
              name="roleName"
              placeholder="Tên vai trò"
              value={form.roleName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Buttons */}
          <div className="col-md-6 d-flex gap-2">
            <button className="btn btn-success w-100">
              {editingRole ? "Lưu" : "Thêm"}
            </button>

            {editingRole && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Hủy
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Search */}
      <div className="d-flex justify-content-end mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Tìm kiếm vai trò..."
          style={{ maxWidth: "300px" }}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div className="table-responsive card shadow-sm p-3">
        <table className="table table-hover align-middle">
          <thead className="table-success">
            <tr>
              <th>ID</th>
              <th>Tên vai trò</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {currentList.map((r) => (
              <tr key={r.roleId}>
                <td>{r.roleId}</td>
                <td>{r.roleName}</td>

                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => handleEdit(r)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(r.roleId)}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-3 gap-2">
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
      </div>
    </div>
  );
}