import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaServicestack,
  FaTags,
  FaSignOutAlt,
  FaUserCircle,
  FaCalendarCheck,
  FaUsers,
  FaCalendarPlus,
  FaFileInvoiceDollar,
  FaComments,
  FaMoneyBillWave,
} from "react-icons/fa";

function ReceptionistLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menu = [
    {
      name: "Lịch khám bệnh nhân",
      icon: <FaCalendarCheck />,
      path: "/receptionist/patient/appointment",
    },
    {
      name: "Bệnh nhân",
      icon: <FaUsers />,
      path: "/receptionist/patients",
    },
    {
      name: "Tạo lịch khám",
      icon: <FaCalendarPlus />,
      path: "/receptionist/appointment/create",
    },
    {
      name: "Thanh toán hóa đơn",
      icon: <FaFileInvoiceDollar />,
      path: "/receptionist/invoice",
    },
    {
      name: "Chat",
      icon: <FaComments />,
      path: "/receptionist/chat",
    },
    // {
    //   name: "Thanh toán",
    //   icon: <FaMoneyBillWave />,
    //   path: "/receptionist/payments",
    // },
  ];

  // 🧠 Hàm xử lý đăng xuất
  const handleLogout = () => {
    // Xóa token & thông tin user
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");

    // Chuyển về trang login
    navigate("/");
    setTimeout(() => window.location.reload(), 300);
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
        <h4 className="text-center mb-4 fw-bold">Receptionist</h4>

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
          onClick={() => navigate("/receptionist/profile")}
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

export default ReceptionistLayout;
