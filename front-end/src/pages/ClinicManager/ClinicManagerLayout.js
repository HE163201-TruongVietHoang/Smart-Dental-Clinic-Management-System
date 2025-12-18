import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaServicestack,
  FaTags,
  FaSignOutAlt,
  FaUserCircle,
  FaTachometerAlt,
  FaChartBar,
  FaBox,
  FaCalendarAlt,
  FaPercent,
  FaFileInvoiceDollar,
  FaPills,
  FaBuilding,
} from "react-icons/fa";

function ClinicManagerLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menu = [
    {
      name: "Bảng điều khiển",
      icon: <FaTachometerAlt />,
      path: "/clinicmanager/dashboard",
    },
    {
      name: "Thống kê",
      icon: <FaChartBar />,
      path: "/clinicmanager/statistics",
    },
    {
      name: "Quản lý dịch vụ",
      icon: <FaServicestack />,
      path: "/clinicmanager/services",
    },
    {
      name: "Quản lý vật tư",
      icon: <FaBox />,
      path: "/clinicmanager/material",
    },
    {
      name: "Quản lý lịch làm việc bác sĩ",
      icon: <FaCalendarAlt />,
      path: "/clinicmanager/doctorschedule",
    },
    {
      name: "Quản lý khuyến mãi",
      icon: <FaPercent />,
      path: "/clinicmanager/promotion",
    },
    {
      name: "Quản lý hóa đơn",
      icon: <FaFileInvoiceDollar />,
      path: "/clinicmanager/invoice",
    },
    {
      name: "Quản lý thuốc",
      icon: <FaPills />,
      path: "/clinicmanager/medicines",
    },
    {
      name: "Quản lý phòng",
      icon: <FaBuilding />,
      path: "/clinicmanager/rooms",
    },
  ];

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    const sessionId = localStorage.getItem("sessionId");

    if (!token || !sessionId) {
      localStorage.clear();
      window.location.href = "/signin";
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/api/auth/devices/${sessionId}/logout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        console.error(data.message || "Logout thất bại");
      }
    } catch (err) {
      console.error("Lỗi khi logout:", err);
    } finally {
      // Luôn clear token, sessionId và user sau logout
      localStorage.removeItem("token");
      localStorage.removeItem("sessionId");
      localStorage.removeItem("user");
      window.location.href = "/signin";
    }
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div
        className="d-flex flex-column text-white position-fixed"
        style={{
          width: "240px",
          height: "100vh",
          backgroundColor: "#2ECCB6",
          padding: "20px",
        }}
      >
        {/* Logo / Title */}
        <h4 className="text-center mb-4 fw-bold">Clinic Manager</h4>

        {/* Menu */}
        <ul className="nav nav-pills flex-column mb-auto">
          {menu.map((item, index) => (
            <li key={index} className="nav-item mb-2">
              <Link
                to={item.path}
                className={`nav-link text-white d-flex align-items-center ${
                  location.pathname === item.path ? "active" : ""
                }`}
                style={{
                  backgroundColor:
                    location.pathname === item.path ? "#27ae9b" : "transparent",
                  borderRadius: "10px",
                  padding: "10px 15px",
                }}
              >
                <span className="me-2">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate("/clinicmanager/profile")}
          className="btn btn-outline-light w-100 mb-2 d-flex align-items-center justify-content-center"
        >
          <FaUserCircle className="me-2" />
          Trang cá nhân
        </button>

        {/* Logout Button */}
        <div>
          <button
            onClick={handleLogout}
            className="btn btn-light w-100 d-flex align-items-center justify-content-center"
            style={{
              borderRadius: "10px",
              fontWeight: 500,
            }}
          >
            <FaSignOutAlt className="me-2" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main content */}
      <main
        style={{
          marginLeft: "240px",
          padding: "30px",
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default ClinicManagerLayout;
