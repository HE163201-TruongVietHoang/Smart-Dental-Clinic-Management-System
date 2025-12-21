import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaServicestack,
  FaSignOutAlt,
  FaUserCircle,
  FaBell,
} from "react-icons/fa";
import { io } from "socket.io-client";

function NurseLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiOpen, setNotiOpen] = useState(false);

  const token = localStorage.getItem("token");

  const menu = [
    {
      name: "Lịch làm việc",
      icon: <FaServicestack />,
      path: "/nurse/schedule",
    },
    {
      name: "Quản lý vật tư",
      icon: <FaServicestack />,
      path: "/nurse/materials",
    },
  ];

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  /* ================= FETCH NOTIFICATIONS ================= */
  useEffect(() => {
    if (!user || !token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(
            (data.notifications || []).filter((n) => !n.isRead).length
          );
        }
      } catch (err) {
        console.error("Fetch notifications error:", err);
      }
    };

    fetchNotifications();
  }, [user, token]);

  /* ================= SOCKET REALTIME ================= */
  useEffect(() => {
    if (!user) return;

    const socket = io("http://localhost:5000");
    socket.emit("join", user.userId);

    socket.on("notification", (noti) => {
      setNotifications((prev) => [noti, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => socket.disconnect();
  }, [user]);

  /* ================= HANDLE NOTI CLICK ================= */
  const handleNotiClick = async (n) => {
    try {
      if (!n.isRead && token) {
        await fetch(`http://localhost:5000/api/notifications/${n.id}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setUnreadCount((prev) => Math.max(prev - 1, 0));
      setNotiOpen(false);

      // 👉 Điều hướng cho Nurse
      if (n.type === "nurse_shift") {
        navigate("/nurse/schedule");
      }
    } catch (err) {
      console.error("Read notification error:", err);
    }
  };

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    navigate("/");
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="d-flex">
      {/* ================= SIDEBAR ================= */}
      <div
        className="d-flex flex-column text-white position-fixed"
        style={{
          width: "240px",
          height: "100vh",
          backgroundColor: "#2ECCB6",
          padding: "20px",
        }}
      >
        <h4 className="text-center mb-4 fw-bold">Nurse</h4>

        {/* ===== NOTIFICATION ===== */}
        <div className="mb-3">
          <button
            className="btn btn-light w-100 d-flex align-items-center justify-content-between"
            style={{ borderRadius: "10px" }}
            onClick={() => setNotiOpen(!notiOpen)}
          >
            <span>
              <FaBell className="me-2" />
              Thông báo
            </span>
            {unreadCount > 0 && (
              <span className="badge bg-danger">{unreadCount}</span>
            )}
          </button>

          {notiOpen && (
            <div
              className="shadow mt-2"
              style={{
                width: "100%",
                maxHeight: "300px",
                overflowY: "auto",
                background: "#fff",
                borderRadius: "10px",
              }}
            >
              {notifications.length === 0 && (
                <div className="p-3 text-muted text-center">
                  Không có thông báo
                </div>
              )}

              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-2 border-bottom"
                  style={{
                    background: n.isRead ? "#2b5c4fff" : "#1aa2bdff",
                    cursor: "pointer",
                  }}
                  onClick={() => handleNotiClick(n)}
                >
                  <strong>{n.title}</strong>
                  <div style={{ fontSize: "0.85rem" }}>{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== MENU ===== */}
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
          onClick={() => navigate("/nurse/profile")}
          className="btn btn-outline-light w-100 mb-2 d-flex align-items-center justify-content-center"
        >
          <FaUserCircle className="me-2" />
          Trang cá nhân
        </button>

        <button
          onClick={handleLogout}
          className="btn btn-light w-100 d-flex align-items-center justify-content-center"
          style={{ borderRadius: "10px", fontWeight: 500 }}
        >
          <FaSignOutAlt className="me-2" />
          Đăng xuất
        </button>
      </div>

      {/* ================= MAIN ================= */}
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

export default NurseLayout;
