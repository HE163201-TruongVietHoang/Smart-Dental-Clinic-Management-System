import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const money = (v) => Number(v || 0).toLocaleString("vi-VN");
const fmtQty = (v) => Number(v || 0);
/* ==============================
   SUMMARY CARD COMPONENT
============================== */
function SummaryCard({ label, value, color }) {
  return (
    <div
      style={{
        padding: "18px 28px",
        background: "#fff",
        borderRadius: "14px",
        boxShadow: "0 3px 15px rgba(0,0,0,0.1)",
        textAlign: "center",
        minWidth: "200px",
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: "bold", color }}>{value}</div>
      <div style={{ marginTop: "6px", color: "#7f8c8d", fontSize: "14px" }}>
        {label}
      </div>
    </div>
  );
}

/* ======================================================
   MAIN COMPONENT – CLINIC MANAGER MATERIAL PAGE
====================================================== */
export default function ClinicManagerMaterialPage() {
  const [summaryReport, setSummaryReport] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [usageReport, setUsageReport] = useState([]);
  const [activeTab, setActiveTab] = useState("transactions");

  const [mode, setMode] = useState("existing");

  const token = localStorage.getItem("token");
  const userId = JSON.parse(localStorage.getItem("user") || "{}").userId;
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Định mức dịch vụ
  const [services, setServices] = useState([]);
  const [serviceMaterials, setServiceMaterials] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [editQty, setEditQty] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterialId, setNewMaterialId] = useState("");
  const [newStandardQty, setNewStandardQty] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editMat, setEditMat] = useState({
    materialName: "",
    unit: "",
    unitPrice: "",
  });

  const TRANSACTION_TYPE_LABEL = {
    IMPORT: "Nhập kho",
    USE: "Sử dụng",
    RETURN: "Hoàn trả",
  };

  const validateEditMaterial = (m) => {
    const name = String(m.materialName || "").trim();
    const unit = String(m.unit || "").trim();
    const price = Number(m.unitPrice);

    if (!name || name.length < 2) return "Tên vật tư quá ngắn";
    if (!unit) return "Đơn vị là bắt buộc";
    if (!Number.isFinite(price) || price < 0) return "Giá phải là số >= 0";

    return null;
  };

  /* ==============================
     API HELPER
  ============================== */
  const fetchAPI = async (endpoint, method = "GET", body = null) => {
    const res = await fetch(`http://localhost:5000/api/materials${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Lỗi server");
    }
    return await res.json();
  };

  /* ==============================
     LOAD DATA
  ============================== */
  useEffect(() => {
    loadMaterials();
    loadTransactions();
    loadUsageReport();
    loadServices();
    loadServiceMaterials();

    const interval = setInterval(() => {
      loadTransactions();
      loadUsageReport();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const loadMaterials = async () => {
    try {
      setMaterials(await fetchAPI("/"));
    } catch (err) {
      toast.error("Lỗi load vật tư: " + err.message);
    }
  };

  const loadTransactions = async () => {
    try {
      setTransactions(await fetchAPI("/transactions"));
    } catch {}
  };

  const loadUsageReport = async () => {
    try {
      setUsageReport(await fetchAPI("/report"));
    } catch {}
  };

  const loadServices = async () => {
    try {
      const data = await fetchAPI("/service/all");
      setServices(data);
      if (data.length > 0 && !selectedService) {
        setSelectedService(data[0].serviceId);
      }
    } catch (err) {
      console.error("Lỗi load dịch vụ:", err);
    }
  };

  const loadServiceMaterials = async () => {
    try {
      setServiceMaterials(await fetchAPI("/service/materials"));
    } catch (err) {
      console.error("Lỗi load định mức:", err);
    }
  };
  const handleSaveMaterial = async () => {
    const err = validateEditMaterial(editMat);
    if (err) return toast.error(err);

    try {
      await fetchAPI(`/${editingId}`, "PUT", editMat);
      toast.success("Cập nhật vật tư thành công!");
      setEditingId(null);
      loadMaterials();
    } catch (e) {
      toast.error(e.message);
    }
  };

  /* ==============================
     IMPORT STOCK
  ============================== */
  const [selId, setSelId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const handleImport = async () => {
    if (!selId || !qty) {
      return toast.warning("Chọn vật tư và số lượng!");
    }

    if (qty <= 0) {
      return toast.error("Số lượng nhập phải lớn hơn 0.");
    }

    try {
      await fetchAPI("/import", "POST", {
        materialId: +selId,
        userId,
        quantity: +qty,
        note: note || "Nhập kho",
      });

      toast.success("NHẬP KHO THÀNH CÔNG!");
      setSelId("");
      setQty(1);
      setNote("");
      loadMaterials();
      loadTransactions();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ==============================
     ADD NEW MATERIAL
  ============================== */
  const [newMat, setNewMat] = useState({ name: "", unit: "", price: "" });

  const handleAddNew = async () => {
    if (!newMat.name || !newMat.unit || !newMat.price)
      return toast.warning("Nhập đủ thông tin!");
    try {
      await fetchAPI("/add", "POST", {
        materialName: newMat.name,
        unit: newMat.unit,
        unitPrice: +newMat.price,
        stockQuantity: 0,
      });
      toast.success("THÊM MỚI THÀNH CÔNG!");
      setNewMat({ name: "", unit: "", price: "" });
      loadMaterials();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  /* ==============================
     SERVICE MATERIAL HANDLER
  ============================== */
  const handleUpdateStandard = async (id, qty) => {
    if (qty < 0) return toast.warning("Số lượng không hợp lệ");
    try {
      const sm = serviceMaterials.find((s) => s.id === id);
      await fetchAPI(
        `/service/${selectedService}/material/${sm.materialId}`,
        "PUT",
        {
          standardQuantity: +qty,
        }
      );
      toast.success("Cập nhật thành công!");
      loadServiceMaterials();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleAddToService = async () => {
    if (!newMaterialId || !newStandardQty)
      return toast.warning("Chọn vật tư + số lượng");
    try {
      await fetchAPI(`/service/${selectedService}/material`, "POST", {
        materialId: +newMaterialId,
        standardQuantity: +newStandardQty,
      });
      toast.success("Thêm thành công!");
      setShowAddModal(false);
      setNewMaterialId("");
      setNewStandardQty("");
      loadServiceMaterials();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const loadSummaryReport = async () => {
    try {
      const url = selectedMonth
        ? `/report/summary?month=${selectedMonth}`
        : `/report/summary`;
      setSummaryReport(await fetchAPI(url));
    } catch {
      toast.error("Không tải được báo cáo vật tư!");
      setSummaryReport(null);
    }
  };

  const loadDetailReport = async () => {
    try {
      const url = selectedMonth
        ? `/report/detail?month=${selectedMonth}`
        : `/report/detail`;
      setDetailReport(await fetchAPI(url));
    } catch {
      toast.error("Không tải được báo cáo chi tiết!");
      setDetailReport(null);
    }
  };

  useEffect(() => {
    if (activeTab === "report") {
      loadSummaryReport();
      loadDetailReport();
    }
  }, [activeTab, selectedMonth]);
  const handleRemoveFromService = async (id) => {
    if (!confirm("Xóa vật tư khỏi dịch vụ?")) return;
    try {
      const sm = serviceMaterials.find((s) => s.id === id);
      await fetchAPI(
        `/service/${selectedService}/material/${sm.materialId}`,
        "DELETE"
      );
      toast.success("Xóa thành công!");
      loadServiceMaterials();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  /* ==============================
     REPORT GROUPING
  ============================== */
  const groupedReport = usageReport.reduce((acc, r) => {
    if (!acc[r.serviceName]) acc[r.serviceName] = [];
    acc[r.serviceName].push(r);
    return acc;
  }, {});

  const formatDate = (d) => {
    if (!d) return "—";

    const date = new Date(d);
    // Trừ 7 tiếng (UTC → GMT+7)
    date.setHours(date.getHours() - 7);

    return date.toLocaleString("vi-VN");
  };

  const MaterialDetailTable = ({ title, data, color }) => (
    <div style={{ marginBottom: 40 }}>
      <h5 style={{ color }}>{title}</h5>
      {!data || data.length === 0 ? (
        <p style={{ fontStyle: "italic" }}>Không có dữ liệu</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Vật tư</th>
              <th>Đơn vị</th>
              <th>Số lượng</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m, i) => (
              <tr key={i}>
                <td>{m.materialName}</td>
                <td>{m.unit}</td>
                <td>{Number(m.quantity).toLocaleString("vi-VN")}</td>
                <td>{Number(m.amount || 0).toLocaleString("vi-VN")} ₫</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  /* ==============================
     MAIN RENDER
  ============================== */
  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1400px", margin: "auto" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "30px",
            boxShadow: "0 4px 20px rgba(0,0,0,.1)",
          }}
        >
          <h2
            style={{
              color: "#2ECCB6",
              textAlign: "center",
              marginBottom: "30px",
              fontWeight: "bold",
            }}
          >
            QUẢN LÝ VẬT TƯ – CLINIC MANAGER
          </h2>

          {/* TAB */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              marginBottom: "30px",
              flexWrap: "wrap",
            }}
          >
            {[
              { k: "material", l: "Vật tư" },
              { k: "transactions", l: "Giao dịch" },
              { k: "report", l: "Báo cáo" },
              { k: "import", l: "Nhập kho" },
              { k: "standard", l: "Định mức" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                style={{
                  padding: "12px 24px",
                  background: activeTab === t.k ? "#2ECCB6" : "#ecf0f1",
                  color: activeTab === t.k ? "#fff" : "#2c3e50",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* ==============================
              TAB BÁO CÁO – PREMIUM UI
          ============================== */}
          {activeTab === "report" && (
            <div style={{ padding: 40 }}>
              <h2 style={{ textAlign: "center", color: "#2ECCB6" }}>
                📊 BÁO CÁO QUẢN LÝ VẬT TƯ
              </h2>

              {/* FILTER MONTH */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px",
                  margin: "20px 0",
                  flexWrap: "wrap",
                }}
              >
                {/* MONTH PICKER */}
                <input
                  type="month"
                  value={selectedMonth || ""}
                  onChange={(e) => setSelectedMonth(e.target.value || null)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "2px solid #2ECCB6",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                />

                {/* RESET BUTTON */}
                <button
                  onClick={() => setSelectedMonth(null)}
                  style={{
                    marginLeft: 10,
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #2ECCB6",
                    background: "#2ECCB6",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Xem tất cả
                </button>
              </div>

              {!summaryReport ? (
                <p style={{ textAlign: "center" }}>Đang tải...</p>
              ) : (
                <>
                  {/* ===== ĐÃ SỬ DỤNG (THÁNG) ===== */}
                  <h4 style={{ color: "#e74c3c" }}> Đã sử dụng </h4>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <SummaryCard
                      label="Tổng số lượng"
                      value={fmtQty(summaryReport.used.month.quantity)}
                      color="#e74c3c"
                    />
                    <SummaryCard
                      label="Tổng chi phí"
                      value={`${money(summaryReport.used.month.amount)} ₫`}
                      color="#c0392b"
                    />
                  </div>

                  {/* ===== NHẬP KHO (THÁNG) ===== */}
                  <h4 style={{ color: "#27ae60", marginTop: 30 }}>Nhập kho</h4>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <SummaryCard
                      label="Tổng số lượng"
                      value={fmtQty(summaryReport.import.month.quantity)}
                      color="#27ae60"
                    />
                    <SummaryCard
                      label="Tổng giá trị"
                      value={`${money(summaryReport.import.month.amount)} ₫`}
                      color="#1e8449"
                    />
                  </div>
                </>
              )}

              {/* ===== CHI TIẾT THEO THÁNG ===== */}
              {detailReport && (
                <>
                  <MaterialDetailTable
                    title="Chi tiết sử dụng "
                    data={detailReport.used.month}
                    color="#e74c3c"
                  />
                  <MaterialDetailTable
                    title="Chi tiết nhập kho "
                    data={detailReport.import.month}
                    color="#27ae60"
                  />
                </>
              )}
            </div>
          )}

          {/* ==============================
              Các tab khác vẫn giữ nguyên
          ============================== */}

          {/* TAB VẬT TƯ */}
          {activeTab === "material" && (
            <div>
              <h4 style={{ color: "#27ae60", textAlign: "center" }}>
                DANH SÁCH VẬT TƯ
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#27ae60", color: "#fff" }}>
                      <th style={{ padding: "12px" }}>ID</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>
                        Tên vật tư
                      </th>
                      <th style={{ padding: "12px", textAlign: "center" }}>
                        Đơn vị
                      </th>
                      <th style={{ padding: "12px", textAlign: "right" }}>
                        Giá (đ)
                      </th>
                      <th style={{ padding: "12px", textAlign: "right" }}>
                        Tồn kho
                      </th>

                      {/* ⭐ CỘT BỊ THIẾU */}
                      <th style={{ padding: "12px", textAlign: "center" }}>
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr
                        key={m.materialId}
                        style={{
                          background:
                            editingId === m.materialId
                              ? "#e8f8f5"
                              : m.stockQuantity < 10
                              ? "#fadbd8"
                              : "#fff",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {m.materialId}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {editingId === m.materialId ? (
                            <input
                              value={editMat.materialName}
                              onChange={(e) =>
                                setEditMat({
                                  ...editMat,
                                  materialName: e.target.value,
                                })
                              }
                              style={editInput}
                              autoFocus
                            />
                          ) : (
                            m.materialName
                          )}
                        </td>

                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {editingId === m.materialId ? (
                            <input
                              value={editMat.unit}
                              onChange={(e) =>
                                setEditMat({ ...editMat, unit: e.target.value })
                              }
                              style={editInputCenter}
                            />
                          ) : (
                            m.unit
                          )}
                        </td>

                        <td style={{ padding: "12px", textAlign: "right" }}>
                          {editingId === m.materialId ? (
                            <input
                              type="number"
                              min="0"
                              value={editMat.unitPrice}
                              onChange={(e) =>
                                setEditMat({
                                  ...editMat,
                                  unitPrice: e.target.value,
                                })
                              }
                              style={editInputRight}
                            />
                          ) : (
                            Number(m.unitPrice).toLocaleString("vi-VN") + "đ"
                          )}
                        </td>

                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: "bold",
                            color: m.stockQuantity < 10 ? "#e74c3c" : "#27ae60",
                          }}
                        >
                          {m.stockQuantity}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {editingId === m.materialId ? (
                            <>
                              <button
                                onClick={handleSaveMaterial}
                                style={btnSave}
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                style={btnCancel}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(m.materialId);
                                setEditMat({
                                  materialName: m.materialName,
                                  unit: m.unit,
                                  unitPrice: m.unitPrice,
                                });
                              }}
                              style={btnEdit}
                            >
                              Sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB GIAO DỊCH */}
          {activeTab === "transactions" && (
            <div>
              <h4 style={{ color: "#3498db", textAlign: "center" }}>
                LỊCH SỬ GIAO DỊCH
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#3498db", color: "#fff" }}>
                      <th style={{ padding: "12px" }}>Thời gian</th>
                      <th style={{ padding: "12px" }}>Loại</th>
                      <th style={{ padding: "12px" }}>Vật tư</th>
                      <th style={{ padding: "12px" }}>SL</th>
                      <th style={{ padding: "12px" }}>Người thực hiện</th>
                      <th style={{ padding: "12px" }}>Ca khám</th>
                      <th style={{ padding: "12px" }}>Ghi chú</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((t) => (
                      <tr
                        key={t.transactionId}
                        style={{ borderBottom: "1px solid #ddd" }}
                      >
                        <td style={{ padding: "12px" }}>
                          {formatDate(t.transactionDate)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              background:
                                t.transactionType === "IMPORT"
                                  ? "#27ae60"
                                  : t.transactionType === "USE"
                                  ? "#e67e22"
                                  : t.transactionType === "RETURN"
                                  ? "#9b59b6"
                                  : "#95a5a6",
                              color: "#fff",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            {TRANSACTION_TYPE_LABEL[t.transactionType] ||
                              t.transactionType}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>{t.materialName}</td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            color:
                              t.transactionType === "IMPORT"
                                ? "#27ae60"
                                : "#e74c3c",
                          }}
                        >
                          {t.transactionType === "IMPORT" ? "+" : ""}
                          {t.quantity}
                        </td>
                        <td style={{ padding: "12px" }}>{t.operatorName}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {t.appointmentId || "—"}
                        </td>
                        <td style={{ padding: "12px" }}>{t.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB NHẬP KHO */}
          {activeTab === "import" && (
            <div style={{ maxWidth: "700px", margin: "auto" }}>
              <h3
                style={{
                  color: "#27ae60",
                  textAlign: "center",
                  marginBottom: "25px",
                }}
              >
                NHẬP KHO VẬT TƯ
              </h3>

              <div
                style={{
                  background: "#ffffff",
                  padding: "25px",
                  borderRadius: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              >
                {/* MODE SWITCH */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  <button
                    onClick={() => setMode("existing")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: mode === "existing" ? "#27ae60" : "#bdc3c7",
                      color: "#fff",
                      fontWeight: "bold",
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    Vật tư có sẵn
                  </button>

                  <button
                    onClick={() => setMode("new")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: mode === "new" ? "#27ae60" : "#bdc3c7",
                      color: "#fff",
                      fontWeight: "bold",
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    Thêm vật tư mới
                  </button>
                </div>

                {/* 1️⃣ MODE A – CHỌN VẬT TƯ CÓ SẴN */}
                {mode === "existing" && (
                  <>
                    <label
                      style={{
                        fontWeight: "600",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Chọn vật tư
                    </label>

                    <select
                      value={selId}
                      onChange={(e) => setSelId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "2px solid #2ECCB6",
                        fontSize: "16px",
                        marginBottom: "18px",
                        fontWeight: "500",
                      }}
                    >
                      <option value="">-- Chọn vật tư cần nhập --</option>
                      {materials.map((m) => (
                        <option key={m.materialId} value={m.materialId}>
                          {m.materialName} ({m.unit}) • Tồn: {m.stockQuantity}
                        </option>
                      ))}
                    </select>

                    {/* BOX THÔNG TIN */}
                    {selId && (
                      <div
                        style={{
                          background: "#f0faf9",
                          padding: "15px",
                          borderRadius: "12px",
                          marginBottom: "20px",
                          borderLeft: "5px solid #2ECCB6",
                        }}
                      >
                        {(() => {
                          const m = materials.find(
                            (x) => x.materialId == selId
                          );
                          if (!m) return null;
                          return (
                            <div style={{ lineHeight: "1.7" }}>
                              <div>
                                <strong>Tên:</strong> {m.materialName}
                              </div>
                              <div>
                                <strong>Đơn vị:</strong> {m.unit}
                              </div>
                              <div>
                                <strong>Tồn kho hiện tại:</strong>{" "}
                                <span
                                  style={{
                                    color:
                                      m.stockQuantity < 10
                                        ? "#e74c3c"
                                        : "#27ae60",
                                  }}
                                >
                                  {m.stockQuantity}
                                </span>
                              </div>
                              <div>
                                <strong>Giá:</strong>{" "}
                                {Number(m.unitPrice).toLocaleString("vi-VN")} đ
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}

                {/* 2️⃣ MODE B – TẠO VẬT TƯ MỚI */}
                {mode === "new" && (
                  <div
                    style={{
                      background: "#f8f9fa",
                      padding: "15px",
                      borderRadius: "12px",
                      marginBottom: "20px",
                      borderLeft: "5px solid #27ae60",
                    }}
                  >
                    <label style={{ fontWeight: "600" }}>Tên vật tư</label>
                    <input
                      type="text"
                      value={newMat.name}
                      onChange={(e) =>
                        setNewMat({ ...newMat, name: e.target.value })
                      }
                      placeholder="Ví dụ: Khẩu trang y tế"
                      style={i}
                    />

                    <label style={{ fontWeight: "600" }}>Đơn vị</label>
                    <input
                      type="text"
                      value={newMat.unit}
                      onChange={(e) =>
                        setNewMat({ ...newMat, unit: e.target.value })
                      }
                      placeholder="Ví dụ: cái, hộp, cuộn..."
                      style={i}
                    />

                    <label style={{ fontWeight: "600" }}>Giá</label>
                    <input
                      type="number"
                      value={newMat.price}
                      onChange={(e) =>
                        setNewMat({ ...newMat, price: e.target.value })
                      }
                      placeholder="Nhập giá VNĐ"
                      style={i}
                    />

                    <button
                      onClick={async () => {
                        try {
                          const res = await fetchAPI("/add", "POST", {
                            materialName: newMat.name,
                            unit: newMat.unit,
                            unitPrice: Number(newMat.price),
                          });

                          toast.success("Tạo vật tư mới thành công!");

                          // Reload + auto select vật tư vừa tạo
                          await loadMaterials();
                          const created = materials.find(
                            (m) => m.materialName === newMat.name
                          );

                          if (created) setSelId(created.materialId);
                          setMode("existing");
                        } catch (err) {
                          toast.error(err.message);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#27ae60",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "16px",
                        marginTop: "10px",
                        cursor: "pointer",
                      }}
                    >
                      TẠO VÀ CHỌN
                    </button>
                  </div>
                )}

                {/* NHẬP SỐ LƯỢNG */}
                <label
                  style={{
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Số lượng nhập
                </label>

                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "2px solid #27ae60",
                    fontSize: "16px",
                    marginBottom: "15px",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                />

                {/* GHI CHÚ */}
                <label style={{ fontWeight: "600" }}>Ghi chú</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Nhà cung cấp giao, nhập bổ sung..."
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "2px solid #bdc3c7",
                    fontSize: "15px",
                    resize: "vertical",
                  }}
                />

                {/* BUTTON SUBMIT */}
                <button
                  onClick={handleImport}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "#2ECCB6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginTop: "22px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  XÁC NHẬN NHẬP KHO
                </button>
              </div>
            </div>
          )}

          {/* TAB ĐỊNH MỨC */}
          {activeTab === "standard" && (
            <div>
              <h4
                style={{
                  color: "#9b59b6",
                  textAlign: "center",
                  marginBottom: "20px",
                }}
              >
                ĐỊNH MỨC VẬT TƯ THEO DỊCH VỤ
              </h4>

              {services.length === 0 ? (
                <p style={{ textAlign: "center", color: "#7f8c8d" }}>
                  Đang tải dịch vụ...
                </p>
              ) : (
                <>
                  <div style={{ marginBottom: "25px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        fontSize: "15px",
                        color: "#8e44ad",
                      }}
                    >
                      Chọn dịch vụ để cài đặt định mức
                    </label>

                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                      }}
                    >
                      <select
                        value={selectedService}
                        onChange={(e) =>
                          setSelectedService(Number(e.target.value))
                        }
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          border: "2px solid #9b59b6",
                          fontSize: "16px",
                          fontWeight: "500",
                          background: "white",
                          appearance: "none",
                          boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
                          cursor: "pointer",
                          color: "#4A4A4A",
                        }}
                      >
                        <option value="">-- Chọn dịch vụ --</option>

                        {services.map((srv) => (
                          <option key={srv.serviceId} value={srv.serviceId}>
                            {srv.serviceName}
                          </option>
                        ))}
                      </select>

                      {/* ICON MŨI TÊN ĐẸP */}
                      <span
                        style={{
                          position: "absolute",
                          right: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                          fontSize: "16px",
                          color: "#9b59b6",
                        }}
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {selectedService && (
                    <div
                      style={{
                        background: "#f9f9f9",
                        padding: "20px",
                        borderRadius: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "15px",
                        }}
                      >
                        <h5 style={{ color: "#8e44ad", margin: 0 }}>
                          {
                            services.find(
                              (s) => s.serviceId === selectedService
                            )?.serviceName
                          }
                        </h5>

                        <button
                          onClick={() => setShowAddModal(true)}
                          style={{
                            padding: "8px 14px",
                            background: "#27ae60",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          + Thêm vật tư
                        </button>
                      </div>

                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr style={{ background: "#ecf0f1" }}>
                            <th style={{ padding: "10px", textAlign: "left" }}>
                              Vật tư
                            </th>
                            <th
                              style={{ padding: "10px", textAlign: "center" }}
                            >
                              Đơn vị
                            </th>
                            <th
                              style={{ padding: "10px", textAlign: "center" }}
                            >
                              Định mức
                            </th>
                            <th
                              style={{ padding: "10px", textAlign: "center" }}
                            >
                              Hành động
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {serviceMaterials
                            .filter((sm) => sm.serviceId === selectedService)
                            .map((sm) => {
                              const mat = materials.find(
                                (m) => m.materialId === sm.materialId
                              );
                              return (
                                <tr
                                  key={sm.id}
                                  style={{ borderBottom: "1px solid #eee" }}
                                >
                                  <td style={{ padding: "10px" }}>
                                    {mat?.materialName || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {mat?.unit || "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px",
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={
                                        editQty[sm.id] ?? sm.standardQuantity
                                      }
                                      onChange={(e) =>
                                        setEditQty({
                                          ...editQty,
                                          [sm.id]: e.target.value,
                                        })
                                      }
                                      style={{
                                        width: "70px",
                                        padding: "5px",
                                        borderRadius: "5px",
                                        border: "1px solid #bdc3c7",
                                        textAlign: "center",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      padding: "10px",
                                      textAlign: "center",
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        handleUpdateStandard(
                                          sm.id,
                                          editQty[sm.id] ?? sm.standardQuantity
                                        )
                                      }
                                      style={{
                                        background: "#3498db",
                                        color: "#fff",
                                        border: "none",
                                        padding: "5px 10px",
                                        borderRadius: "5px",
                                        marginRight: "5px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                      }}
                                    >
                                      Lưu
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleRemoveFromService(sm.id)
                                      }
                                      style={{
                                        background: "#e74c3c",
                                        color: "#fff",
                                        border: "none",
                                        padding: "5px 10px",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                      }}
                                    >
                                      Xóa
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                          {serviceMaterials.filter(
                            (sm) => sm.serviceId === selectedService
                          ).length === 0 && (
                            <tr>
                              <td
                                colSpan="4"
                                style={{
                                  textAlign: "center",
                                  padding: "20px",
                                  color: "#95a5a6",
                                }}
                              >
                                Chưa có vật tư định mức
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* MODAL THÊM VẬT TƯ */}
              {showAddModal && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                  onClick={() => setShowAddModal(false)}
                >
                  <div
                    style={{
                      background: "#fff",
                      padding: "25px",
                      borderRadius: "14px",
                      width: "380px",
                      maxWidth: "90%",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h5
                      style={{
                        color: "#9b59b6",
                        textAlign: "center",
                        marginBottom: "15px",
                      }}
                    >
                      Thêm vật tư vào dịch vụ
                    </h5>

                    <select
                      value={newMaterialId}
                      onChange={(e) => setNewMaterialId(e.target.value)}
                      style={s}
                    >
                      <option value="">-- Chọn vật tư --</option>

                      {materials
                        .filter(
                          (m) =>
                            !serviceMaterials.some(
                              (sm) =>
                                sm.materialId === m.materialId &&
                                sm.serviceId === selectedService
                            )
                        )
                        .map((m) => (
                          <option key={m.materialId} value={m.materialId}>
                            {m.materialName} ({m.unit}) - Tồn: {m.stockQuantity}
                          </option>
                        ))}
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newStandardQty}
                      onChange={(e) => setNewStandardQty(e.target.value)}
                      placeholder="Số lượng định mức"
                      style={i}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "15px",
                      }}
                    >
                      <button
                        onClick={handleAddToService}
                        style={{ ...b("#27ae60"), flex: 1 }}
                      >
                        Thêm
                      </button>
                      <button
                        onClick={() => setShowAddModal(false)}
                        style={{ ...b("#95a5a6"), flex: 1 }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==============================
   STYLE SHARED
============================== */
const editInput = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "2px solid #2ECCB6",
  fontSize: "14px",
  outline: "none",
};

const editInputCenter = {
  ...editInput,
  textAlign: "center",
};

const editInputRight = {
  ...editInput,
  textAlign: "right",
};
const btnEdit = {
  background: "#27ae60",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const btnSave = {
  background: "#27ae60",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
  marginRight: "6px",
};

const btnCancel = {
  background: "#95a5a6",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const s = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "2px solid #27ae60",
  fontSize: "16px",
  marginBottom: "15px",
};

const i = { ...s, borderColor: "#2ECCB6" };

const b = (c) => ({
  width: "100%",
  padding: "16px",
  background: c,
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
});
