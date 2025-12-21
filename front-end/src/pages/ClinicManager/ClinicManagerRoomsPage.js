import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ClinicManagerRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState("Available");
  const [error, setError] = useState("");

  // SEARCH state
  const [search, setSearch] = useState("");

  // EDIT state
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("Available");

  // PAGINATION state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  // LOAD ALL ROOMS
  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const normalized = Array.isArray(data)
        ? data.map((r) => ({
            ...r,
            status: r.status || "Available",
          }))
        : [];

      setRooms(normalized);
    } catch (err) {
      console.error(err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRooms();
  }, [token]);

  // ADD ROOM
  const handleAddRoom = async (e) => {
    e.preventDefault();
    setError("");

    if (!newName.trim()) return setError("Tên phòng không được để trống");

    try {
      const res = await fetch("http://localhost:5000/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomName: newName.trim(),
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Không thêm được phòng");

      const newRoom = {
        ...data,
        status: data.status || "Available",
      };

      setRooms((prev) => [newRoom, ...prev]);
      setNewName("");
      setNewStatus("Available");
      toast.success("Thêm phòng thành công!");
    } catch (err) {
      setError(err.message);
    }
  };

  // DELETE ROOM
  const handleDeleteRoom = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phòng này?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRooms((prev) => prev.filter((r) => r.roomId !== id));
      toast.success("Xóa phòng thành công!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (r) => {
    setEditing(r.roomId);
    setEditName(r.roomName);
    setEditStatus(r.status);
  };

  // UPDATE ROOM
  const handleUpdateRoom = async () => {
    if (!editName.trim()) return toast.error("Tên phòng không được trống");

    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${editing}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomName: editName,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRooms((prev) =>
        prev.map((r) => (r.roomId === editing ? data : r))
      );

      setEditing(null);
      toast.success("Cập nhật phòng thành công!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // FILTER SEARCH
  const filtered = rooms.filter((r) =>
    (r.roomName || "").toLowerCase().includes(search.toLowerCase())
  );

  const translateStatus = (status) => {
    switch (status) {
      case "Available":
        return "Có sẵn";
      case "Occupied":
        return "Đang sử dụng";
      case "Maintenance":
        return "Bảo trì";
      default:
        return status;
    }
  };

  // PAGINATION LOGIC
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRooms = filtered.slice(startIndex, startIndex + itemsPerPage);

  // RESET PAGE WHEN SEARCH CHANGES
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div style={{ padding: "30px", minHeight: "100vh" }}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>QUẢN LÝ PHÒNG</h2>

        {/* ADD ROOM FORM */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#1E90FF" }}>Thêm phòng mới</h3>


          <form
            onSubmit={handleAddRoom}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Tên phòng..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ ...inputStyle, flex: 2 }}
              />
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 150 }}
              >
                <option value="Available">Có sẵn</option>
                <option value="Occupied">Đang sử dụng</option>
                <option value="Maintenance">Bảo trì</option>
              </select>
            </div>
            <button type="submit" style={btnPrimary}>
              + Thêm phòng
            </button>
          </form>

          {error && <p style={{ color: "red", marginTop: "8px" }}>{error}</p>}
        </div>

        {/* ROOM LIST */}
        <div style={{ ...cardStyle, marginTop: "25px" }}>
            {/* Chung một hàng */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: "#1E90FF" }}>Danh sách phòng</h3>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, maxWidth: 250, marginLeft: 400 }}
              />
            </div>
          </div>
            </div>
          {loading ? (
            <p>Đang tải...</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Tên phòng</th>
                  <th style={th}>Trạng thái</th>
                  <th style={th}></th>
                </tr>
              </thead>

              <tbody>
                {paginatedRooms.map((r) => (
                  <tr key={r.roomId}>
                    <td style={td}>#{r.roomId}</td>
                    <td style={td}>{r.roomName}</td>
                    <td style={td}>{translateStatus(r.status)}</td>
                    <td style={td}>
                      <button
                        onClick={() => openEditModal(r)}
                        style={{
                          ...btnPrimary,
                          background: "#FFA500",
                          marginRight: "8px",
                        }}
                      >
                        Sửa
                      </button>

                      {/* <button
                        onClick={() => handleDeleteRoom(r.roomId)}
                        style={btnDanger}
                      >
                        Xóa
                      </button> */}
                    </td>
                  </tr>
                ))}

                {paginatedRooms.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      style={{ textAlign: "center", padding: 20 }}
                    >
                      Không có phòng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ ...btnPrimary, marginRight: "10px" }}
            >
              Trước
            </button>
            <span style={{ margin: "0 10px" }}>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ ...btnPrimary, marginLeft: "10px" }}
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* ========================= EDIT MODAL ========================= */}
      {editing && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ marginTop: 0, color: "#1E90FF" }}>
              Chỉnh sửa phòng #{editing}
            </h3>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Tên phòng"
              style={{ ...inputStyle, marginBottom: 10 }}
            />

            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            >
              <option value="Available">Có sẵn</option>
              <option value="Occupied">Đang sử dụng</option>
              <option value="Maintenance">Bảo trì</option>
            </select>

            <button onClick={handleUpdateRoom} style={btnPrimary}>
              Lưu thay đổi
            </button>
            <button
              onClick={() => setEditing(null)}
              style={{ ...btnDanger, marginLeft: 10 }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================== STYLES ======================== */

const containerStyle = {
  maxWidth: "1000px",
  margin: "auto",
  background: "#fff",
  padding: "25px",
  borderRadius: "20px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
};

const titleStyle = {
  textAlign: "center",
  color: "#2ECCB6",
  fontWeight: "bold",
  marginBottom: "20px",
};

const cardStyle = {
  background: "#F0FAFF",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "2px solid #1E90FF",
  fontSize: "15px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  padding: "10px",
  background: "#DFF2FF",
  textAlign: "left",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const btnPrimary = {
  padding: "10px 16px",
  background: "#1E90FF",
  color: "#fff",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

const btnDanger = {
  padding: "6px 12px",
  background: "#ff4d4f",
  color: "#fff",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContent = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  width: "400px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
};