import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api/admin";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    gender: "",
    dob: "",
    address: "",
    roleId: "",
    isActive: true,
    isVerify: false,
  });

  const translateRole = (roleName) => {
    const map = {
      Admin: 'Quản trị viên',
      ClinicManager: 'Quản lý phòng khám',
      Doctor: 'Bác sĩ',
      Nurse: 'Y tá',
      Patient: 'Bệnh nhân',
      Receptionist: 'Lễ tân'
    };
    return map[roleName] || roleName;
  };

  const translateGender = (gender) => {
    const map = {
      Male: 'Nam',
      Female: 'Nữ',
      Other: 'Khác'
    };
    return map[gender] || gender;
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // fetch users
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`, {
        headers: getAuthHeaders(),
      });
      setUsers(res.data.users);
    } catch (err) {
      console.error("Fetch failed:", err);
      if (err.response?.status === 401) {
        navigate('/');
        return;
      }
      setMessage("Lỗi khi tải danh sách người dùng: " + (err.response?.data?.message || err.response?.data?.error));
      
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/roles`, {
        headers: getAuthHeaders(),
      });
      setRoles(res.data);
    } catch (err) {
      console.error("Fetch roles failed:", err);
      if (err.response?.status === 401) {
        navigate('/');
        return;
      }
      setMessage("Lỗi khi tải danh sách vai trò: " + (err.response?.data?.message || err.response?.data?.error));
    }
  };

  // handle form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // add or update user
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser.userId}`, form, {
          headers: getAuthHeaders(),
        });
        setMessage("Chỉnh sửa người dùng thành công!");
      } else {
        await axios.post(`${API_URL}/users`, form, {
          headers: getAuthHeaders(),
        });
        setMessage("Thêm người dùng thành công!");
      }

      fetchUsers();
      resetForm();
    } catch (err) {
      console.error("Save failed:", err);
      if (err.response?.status === 401) {
        navigate('/');
        return;
      }
      setMessage("Lỗi khi lưu: " + (err.response?.data?.message || err.error));
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setForm({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      gender: "",
      dob: "",
      address: "",
      roleId: "",
      isActive: true,
      isVerify: false,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc muốn xóa người dùng này?")) return;

    try {
      await axios.delete(`${API_URL}/users/${id}`, {
        headers: getAuthHeaders(),
      });
      setMessage("Xóa người dùng thành công!");
      fetchUsers();
    } catch (err) {
      console.error("Delete failed:", err);
      if (err.response?.status === 401) {
        navigate('/');
        return;
      }
      setMessage("Lỗi khi xóa: " + (err.response?.data?.message || err.error));
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      password: "",
      gender: u.gender,
      dob: u.dob ? u.dob.split("T")[0] : "",
      address: u.address,
      roleId: u.roleId || "",
      isActive: u.isActive,
      isVerify: u.isVerify,
    });
  };

  // Filtering
  const normalize = (str) =>
    str
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const filteredUsers = users.filter((u) =>
    normalize(u.fullName).includes(normalize(searchTerm))
  );

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const currentList = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container">
      <h3 className="mb-4 fw-bold text-uppercase">Quản lý Người dùng</h3>

      {message && (
        <div className={`alert ${message.includes("thành công") ? "alert-success" : "alert-danger"} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {/* Form thêm user */}
      <form onSubmit={handleSubmit} className="card p-3 shadow-sm mb-4">
        <h5 className="fw-semibold mb-3">
          <FaPlus className="me-2" />
          {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
        </h5>

        <div className="row g-3 align-items-center">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              name="fullName"
              placeholder="Họ tên"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-3">
            <input
              type="email"
              className="form-control"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-2">
            <input
              type="text"
              className="form-control"
              name="phone"
              placeholder="Số điện thoại"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          {!editingUser && (
            <div className="col-md-2">
              <input
                type="password"
                className="form-control"
                name="password"
                placeholder="Mật khẩu"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="col-md-2">
            <select
              name="gender"
              className="form-select"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Giới tính</option>
              <option value="Male">Nam</option>
              <option value="Female">Nữ</option>
              <option value="Other">Khác</option>
            </select>
          </div>

          {/* Date */}
          <div className="col-md-2">
            <input
              type="date"
              className="form-control"
              name="dob"
              value={form.dob}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              name="address"
              placeholder="Địa chỉ"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-2">
            <select
              name="roleId"
              className="form-select"
              value={form.roleId}
              onChange={handleChange}
              required
            >
              <option value="">Chọn vai trò</option>
              {roles.map(r => <option key={r.roleId} value={r.roleId}>{translateRole(r.roleName)}</option>)}
            </select>
          </div>

          {/* Buttons */}
          <div className="col-md-2 d-flex gap-2">
            <button className="btn btn-success w-100">
              {editingUser ? "Lưu" : "Thêm"}
            </button>

            {editingUser && (
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
          placeholder="Tìm kiếm người dùng..."
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
              <th>Avatar</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Giới tính</th>
              <th>Ngày sinh</th>
              <th>Vai trò</th>
              <th>Hoạt động</th>
              <th>Xác minh</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {currentList.map((u) => (
              <tr key={u.userId}>
                <td>{u.userId}</td>
                <td>
                  {u.avatar && (
                    <img
                      src={u.avatar}
                      style={{
                        width: "45px",
                        height: "45px",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </td>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>{translateGender(u.gender)}</td>
                <td>{u.dob ? new Date(u.dob).toLocaleDateString() : ""}</td>
                <td>{translateRole(u.roleName)}</td>
                <td>{u.isActive ? "✔️" : "❌"}</td>
                <td>{u.isVerify ? "✔️" : "❌"}</td>

                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => handleEdit(u)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(u.userId)}
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
