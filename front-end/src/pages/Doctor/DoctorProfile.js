import React, { useEffect, useState, useRef } from "react";
import { Card, Button, Spinner, Form, Modal } from "react-bootstrap";
import axios from "axios";
import { FaCamera } from "react-icons/fa";
import { toast } from "react-toastify";

export default function DoctorProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");

  // --- Fetch profile ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
        setPreview(res.data.avatar || "");
        setForm({
          fullName: res.data.fullName || "",
          phone: res.data.phone || "",
          address: res.data.address || "",
          experience: res.data.experience || "",
          bio: res.data.bio || "",
          gender: res.data.gender || "",
          dob: res.data.dob || "",
        });
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải hồ sơ!");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);
  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const res = await axios.put(
        "http://localhost:5000/api/auth/profile",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data.user || { ...user, ...form });
      setIsEditing(false);
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật hồ sơ thất bại!");
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const submitPasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/auth/change-password",
        { oldPassword: currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMessage("Đổi mật khẩu thành công!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error(err);
      setPasswordMessage(` ${err.response?.data?.message || err.message}`);
    }
  };

  const handleAvatarClick = () => fileInputRef.current.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      return toast.warning("Chỉ chấp nhận PNG/JPG/JPEG");
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.warning("Ảnh không vượt quá 10MB");
    }

    // Preview ảnh trước
    setPreview(URL.createObjectURL(file));

    // Upload lên server
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await axios.put(
        "http://localhost:5000/api/auth/profile/avatar",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Cập nhật user.avatar sau khi backend trả về link mới
      setUser((prev) => ({
        ...prev,
        avatar: res.data.avatar,
      }));

      toast.success("Cập nhật avatar thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật avatar thất bại!");
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );

  if (!user) return <p className="text-center py-5">Không có dữ liệu hồ sơ</p>;

  return (
    <div className="container py-4">
      <Card className="shadow-lg border-0">
        <Card.Body className="text-center p-4">
          {/* Avatar */}
          <div
            className="position-relative d-inline-block"
            onClick={handleAvatarClick}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <img
              src={
                preview ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              }
              alt="avatar"
              className="rounded-circle mb-3"
              width="120"
              height="120"
              style={{ objectFit: "cover", cursor: "pointer" }}
            />
            <div
              className="position-absolute top-0 start-0 w-100 h-100 rounded-circle d-flex justify-content-center align-items-center"
              style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                color: "white",
                opacity: 0,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
            >
              <FaCamera size={24} />
            </div>
          </div>

          {isEditing ? (
            <Form.Control
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="mb-2 text-center"
              style={{ maxWidth: "250px", margin: "0 auto" }}
            />
          ) : (
            <h3 className="mb-0">{user.fullName}</h3>
          )}

          <p className="text-muted">{user.roleName}</p>
          <hr />

          <div className="text-start px-5">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Số điện thoại:</strong>{" "}
              {isEditing ? (
                <Form.Control
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              ) : (
                user.phone
              )}
            </p>
            <p>
              <strong>Địa chỉ:</strong>{" "}
              {isEditing ? (
                <Form.Control
                  as="textarea"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                />
              ) : (
                user.address
              )}
            </p>
            <p>
              <strong>Kinh nghiệm:</strong>{" "}
              {isEditing ? (
                <Form.Control
                  type="text"
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                />
              ) : (
                user.experience
              )}
            </p>
            <p>
              <strong>Giới thiệu:</strong>{" "}
              {isEditing ? (
                <Form.Control
                  as="textarea"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={2}
                />
              ) : (
                user.bio
              )}
            </p>
            <p>
              <strong>Giới tính:</strong>{" "}
              {isEditing ? (
                <Form.Select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  style={{ maxWidth: "200px" }}
                >
                  <option value="">-- Chọn giới tính --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Form.Select>
              ) : (
                user.gender
              )}
            </p>

            <p>
              <strong>Ngày sinh:</strong>{" "}
              {isEditing ? (
                <Form.Control
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                />
              ) : (
                formatDate(user.dob)
              )}
            </p>
          </div>

          <div className="d-flex justify-content-center gap-3 mt-4">
            {!isEditing ? (
              <>
                <Button variant="primary" onClick={() => setIsEditing(true)}>
                  Chỉnh sửa hồ sơ
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Đổi mật khẩu
                </Button>
              </>
            ) : (
              <>
                <Button variant="success" onClick={handleSave}>
                  Lưu thay đổi
                </Button>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Hủy
                </Button>
              </>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Đổi mật khẩu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Mật khẩu hiện tại</Form.Label>
            <Form.Control
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mật khẩu mới</Form.Label>
            <Form.Control
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Xác nhận mật khẩu mới</Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
            />
          </Form.Group>
          {passwordMessage && (
            <div
              className={`alert ${
                passwordMessage.startsWith("")
                  ? "alert-success"
                  : "alert-danger"
              }`}
            >
              {passwordMessage}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPasswordModal(false)}
          >
            Hủy
          </Button>
          <Button variant="primary" onClick={submitPasswordChange}>
            Cập nhật mật khẩu
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
