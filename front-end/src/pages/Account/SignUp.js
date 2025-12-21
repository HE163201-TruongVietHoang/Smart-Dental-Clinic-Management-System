import React, { useState } from "react";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";

export default function SignUp() {
  const today = new Date().toISOString().split("T")[0];

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConfirmed) {
      toast.warning("Vui lòng xác nhận thông tin đầy đủ và chính xác!");
      return;
    }
    if (!formData.gender) {
      toast.warning("Vui lòng chọn giới tính!");
      return;
    }
    const selectedDob = new Date(formData.dob);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (selectedDob > now) {
      toast.warning("Ngày sinh không được lớn hơn ngày hiện tại!");
      return;
    }
    if (!formData.address.trim()) {
      toast.warning("Vui lòng nhập địa chỉ!");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.warning("Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/auth/register", {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
        dob: formData.dob,
        password: formData.password,
        isActive: true,
      });

      const userData = res.data?.user || res.data;

      localStorage.setItem(
        "signupUser",
        JSON.stringify({
          userId: userData?.userId || null,
          email: userData?.email || formData.email,
          fullName: userData?.fullName || formData.fullName,
          roleName: userData?.roleName || "Patient",
        })
      );
      navigate("/verify-otp");
    } catch (err) {
      console.error(err);
      toast.error(
        "Lỗi đăng ký: " + (err.response?.data?.error || "Vui lòng thử lại sau.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f0fffa",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Header />

      <section
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 0",
        }}
      >
        <div className="container-lg">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div
                className="card shadow-sm p-4"
                style={{
                  borderRadius: "20px",
                  border: "none",
                  backgroundColor: "#fff",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h2
                  className="fw-bold mb-4 text-center"
                  style={{ color: "#2ECCB6" }}
                >
                  Đăng ký tài khoản
                </h2>

                <form onSubmit={handleSubmit}>
                  {/* Họ và tên */}
                  <div className="mb-3">
                    <label className="form-label">Họ và tên</label>
                    <input
                      type="text"
                      className="form-control"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      required
                      style={{ borderRadius: "10px" }}
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@gmail.com"
                      required
                      style={{ borderRadius: "10px" }}
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div className="mb-3">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0987654321"
                      required
                      style={{ borderRadius: "10px" }}
                    />
                  </div>

                  {/* Địa chỉ */}
                  <div className="mb-3">
                    <label className="form-label">Địa chỉ</label>
                    <input
                      type="address"
                      className="form-control"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Ha Noi"
                      required
                      style={{ borderRadius: "10px" }}
                    />
                  </div>

                  {/* Giới tính */}
                  <div className="mb-3">
                    <label className="form-label">Giới tính</label>
                    <select
                      className="form-select"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      style={{ borderRadius: "10px" }}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>

                  {/* Ngày sinh */}
                  <div className="mb-3">
                    <label className="form-label">Ngày sinh</label>
                    <input
                      type="date"
                      className="form-control"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      max={today} // 👈 CHẶN ngày > hôm nay
                      required
                      style={{ borderRadius: "10px" }}
                    />
                  </div>

                  {/* Mật khẩu */}
                  <div className="mb-3 position-relative">
                    <label className="form-label">Mật khẩu</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="********"
                      required
                      style={{ borderRadius: "10px", paddingRight: "40px" }}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "38px",
                        cursor: "pointer",
                        color: "#666",
                      }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>

                  {/* Xác nhận mật khẩu */}
                  <div className="mb-3 position-relative">
                    <label className="form-label">Xác nhận mật khẩu</label>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-control"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="********"
                      required
                      style={{ borderRadius: "10px", paddingRight: "40px" }}
                    />
                    <span
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "38px",
                        cursor: "pointer",
                        color: "#666",
                      }}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>

                  {/* Checkbox xác nhận */}
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isConfirmed}
                      onChange={(e) => setIsConfirmed(e.target.checked)}
                      id="confirmCheck"
                    />
                    <label className="form-check-label" htmlFor="confirmCheck">
                      Tôi đã điền đầy đủ và chính xác thông tin
                    </label>
                  </div>

                  {/* Nút đăng ký */}
                  <button
                    type="submit"
                    disabled={!isConfirmed || loading}
                    className="btn btn-lg w-100 fw-bold"
                    style={{
                      backgroundColor: isConfirmed ? "#2ECCB6" : "#94d3b4",
                      borderColor: "#2ECCB6",
                      color: "#fff",
                      borderRadius: "10px",
                      cursor: isConfirmed ? "pointer" : "not-allowed",
                    }}
                  >
                    {loading ? "Đang xử lý..." : "Đăng ký"}
                  </button>
                </form>

                <p className="mt-3 text-center text-muted">
                  Đã có tài khoản?{" "}
                  <span
                    style={{ color: "#2ECCB6", cursor: "pointer" }}
                    onClick={() => navigate("/signin")}
                  >
                    Đăng nhập
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
