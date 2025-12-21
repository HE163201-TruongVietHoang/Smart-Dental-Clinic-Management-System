import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";
import { toast } from "react-toastify";
import { error } from "jquery";

function SignIn() {
  const [identifier, setIdentifier] = useState(""); // email hoặc SĐT
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const location = useLocation();
  const redirectTo = location.state?.redirectTo || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (data.error === "Tài khoản chưa xác minh") {
        toast.error(data.error);

        // Lưu email & userId để Verify OTP
        // khi data.error === "Tài khoản chưa xác minh"
        localStorage.setItem(
          "signupUser",
          JSON.stringify({
            email: identifier,
            userId: data.userId ?? data.user?.id ?? null,
            roleName: data.roleName ?? data.user?.roleName ?? null,
            // lưu nguyên response để debug (tuỳ bạn)
            _raw: data,
          })
        );

        // Chuyển sang trang Verify OTP
        setTimeout(() => {
          navigate("/verify-otp");
        }, 1500);

        return; // DỪNG luồng login ở đây
      }

      if (res.ok) {
        console.log(" Đăng nhập thành công:", data);

        // Lưu token & thông tin người dùng
        localStorage.setItem("token", data.token || data.jwtToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("sessionId", data.sessionId);

        // Điều hướng theo vai trò
        const roleName = data.user?.roleName;
        switch (roleName) {
          case "Patient":
            navigate(redirectTo);
            break;
          case "Doctor":
            navigate("/doctor/schedule");
            break;
          case "Nurse":
            navigate("/nurse/materials");
            break;
          case "ClinicManager":
            navigate("/clinicmanager/statistics");
            break;
          case "Receptionist":
            navigate("/receptionist/patient/appointment");
            break;
          case "Admin":
            navigate("/admin/acounts");
            break;
          default:
            navigate("/");
        }
      } else {
        toast.error(data.error || "Đăng nhập thất bại!");
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      toast.error("Không thể kết nối đến máy chủ!");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f0fffa",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Header />

      {/* Nội dung chính */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "40px 30px",
            borderRadius: "20px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
            width: "100%",
            maxWidth: "420px",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              marginBottom: "30px",
              color: "#2ECCB6",
              fontWeight: "700",
              fontSize: "28px",
            }}
          >
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Email hoặc SĐT */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontWeight: "600",
                  color: "#333",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Email hoặc Số điện thoại
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="Nhập email hoặc số điện thoại"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ccc",
                  borderRadius: "10px",
                  fontSize: "15px",
                  outline: "none",
                  transition: "border 0.3s",
                }}
                onFocus={(e) => (e.target.style.border = "1px solid #2ECCB6")}
                onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
              />
            </div>

            {/* Mật khẩu */}
            <div style={{ marginBottom: "25px", position: "relative" }}>
              <label
                style={{
                  fontWeight: "600",
                  color: "#333",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Mật khẩu
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Nhập mật khẩu"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "10px",
                  fontSize: "15px",
                  outline: "none",
                  transition: "border 0.3s",
                }}
                onFocus={(e) => (e.target.style.border = "1px solid #2ECCB6")}
                onBlur={(e) => (e.target.style.border = "1px solid #ccc")}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "42px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#2ECCB6",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#28B89F")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#2ECCB6")}
            >
              Đăng nhập
            </button>

            {/* Liên kết phụ */}
            <p
              style={{
                textAlign: "center",
                marginTop: "20px",
                fontSize: "15px",
              }}
            >
              Bạn chưa có tài khoản?{" "}
              <span
                onClick={() => navigate("/signup")}
                style={{
                  color: "#2ECCB6",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Đăng ký ngay
              </span>
            </p>

            <p
              style={{
                textAlign: "center",
                marginTop: "8px",
                fontSize: "14px",
              }}
            >
              <span
                onClick={() => navigate("/reset-password")}
                style={{
                  color: "#E67E22",
                  cursor: "pointer",
                  fontWeight: "600",
                  textDecoration: "underline",
                }}
              >
                Quên mật khẩu?
              </span>
            </p>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default SignIn;
