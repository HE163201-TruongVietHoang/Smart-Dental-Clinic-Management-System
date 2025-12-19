import React, { useEffect, useState } from "react";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";
import { toast } from "react-toastify";

export default function NurseMaterialPage() {
  const [appointments, setAppointments] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [serviceMaterials, setServiceMaterials] = useState([]);

  // Form states
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [activeTab, setActiveTab] = useState("use"); // use, return, used

  const token = localStorage.getItem("token");
  const userId = JSON.parse(localStorage.getItem("user") || "{}").userId;

  // =========================================
  // FETCH API CHUNG – ĐÃ FIX 100% LỖI LOAD
  // =========================================
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

  // =========================================
  // LOAD DATA – GỌI LẠI KHI TOKEN CÓ
  // =========================================
  useEffect(() => {
    if (token && userId) {
      loadAppointments();
      loadAllMaterials();
    }
  }, [token, userId]);

  // Load tất cả vật tư (5 món + tồn kho)
  const loadAllMaterials = async () => {
    try {
      const data = await fetchAPI("/");
      console.log("VẬT TƯ ĐÃ LOAD:", data);
      setAllMaterials(data);
    } catch (err) {
      console.error("LỖI LOAD VẬT TƯ:", err);
      toast.error("Không tải được vật tư!");
      setAllMaterials([]);
    }
  };

  // Load ca khám hôm nay
  const loadAppointments = async () => {
    try {
      const data = await fetchAPI("/appointments");
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Lỗi load ca khám: " + err.message);
    }
  };

  // =========================================
  // CHỌN CA → LOAD ĐỊNH MỨC
  // =========================================
  const handleAppointmentChange = async (appointmentId) => {
    const appointment = appointments.find(
      (a) => a.appointmentId === parseInt(appointmentId)
    );
    setSelectedAppointment(appointment);
    setServiceMaterials([]);

    if (appointment?.serviceId) {
      try {
        const data = await fetchAPI(
          `/appointment/${appointment.appointmentId}/materials`
        );
        setServiceMaterials(data);
      } catch {
        setServiceMaterials([]);
      }
    }
  };

  // =========================================
  // CÁC HÀNH ĐỘNG
  // =========================================
  const handleUse = async () => {
    if (!selectedAppointment || !materialId || !quantity) {
      return toast.info("Chọn ca + vật tư + số lượng!");
    }

    if (quantity <= 0) {
      return toast.error("Số lượng phải lớn hơn 0.");
    }

    const material = allMaterials.find(
      (m) => m.materialId === Number(materialId)
    );

    if (material && quantity > material.stockQuantity) {
      return toast.error(
        `❌ Không đủ tồn kho. Hiện còn ${material.stockQuantity}.`
      );
    }

    try {
      await fetchAPI("/use", "POST", {
        materialId: +materialId,
        appointmentId: selectedAppointment.appointmentId,
        quantity: +quantity,
        note: note || "Lấy vật tư",
      });

      toast.success("LẤY VẬT TƯ THÀNH CÔNG!");
      resetForm();
      loadAllMaterials();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReturn = async () => {
    if (!selectedAppointment || !materialId || !quantity)
      return toast.warning("Thiếu thông tin!");
    try {
      await fetchAPI("/return", "POST", {
        materialId: +materialId,
        userId,
        appointmentId: selectedAppointment.appointmentId,
        quantity: +quantity,
        note: note || "Hoàn thừa",
      });
      ting();
      toast.success("HOÀN THÀNH CÔNG!");
      resetForm();
      loadAllMaterials();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  const handleUsed = async () => {
    if (!selectedAppointment || !materialId || !quantity)
      return toast.warning("Thiếu thông tin!");
    try {
      await fetchAPI("/used", "POST", {
        appointmentId: selectedAppointment.appointmentId,
        materialId: +materialId,
        quantityUsed: +quantity,
        note: note || "Thực tế",
      });
      ting();
      toast.success("GHI NHẬN THÀNH CÔNG!");
      resetForm();
    } catch (err) {
      toast.error("Lỗi: " + err.message);
    }
  };

  // LẤY TẤT CẢ THEO ĐỊNH MỨC
  const handleUseAllByStandard = async () => {
    if (!selectedAppointment) return toast.info("Chọn ca trước!");
    if (!serviceMaterials.length) return toast.warning("Chưa có định mức!");

    const list = serviceMaterials
      .map((m) => `• ${m.materialName}: ${m.standardQuantity} ${m.unit}`)
      .join("\n");
    if (!confirm(`LẤY THEO ĐỊNH MỨC?\n\n${list}`)) return;

    let ok = 0,
      err = 0;
    for (const m of serviceMaterials) {
      try {
        await fetchAPI("/use", "POST", {
          materialId: m.materialId,
          userId,
          appointmentId: selectedAppointment.appointmentId,
          quantity: +m.standardQuantity,
          note: `Định mức - ${selectedAppointment.serviceNames || ""}`,
        });
        ok++;
      } catch {
        err++;
      }
    }
    ting();
    toast.success(`HOÀN TẤT!\nThành công: ${ok}\nLỗi: ${err}`);
    loadAllMaterials();
  };

  const resetForm = () => {
    setMaterialId("");
    setQuantity(1);
    setNote("");
  };

  const ting = () =>
    new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    )
      .play()
      .catch(() => {});

  // =========================================
  // RENDER – ĐẸP + DỄ DÙNG
  // =========================================
  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          padding: "40px 20px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "auto" }}>
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
              QUẢN LÝ VẬT TƯ – Y TÁ
            </h2>

            {/* 1. CHỌN CA */}
            <div
              style={{
                marginBottom: "30px",
                padding: "20px",
                background: "#f8f9fa",
                borderRadius: "10px",
              }}
            >
              <label
                style={{
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                CHỌN CA KHÁM HÔM NAY:
              </label>
              <select
                onChange={(e) => handleAppointmentChange(e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Chọn ca --</option>
                {appointments.map((a) => (
                  <option key={a.appointmentId} value={a.appointmentId}>
                    #{a.appointmentId} | {a.patientName} | {a.startTime}-
                    {a.endTime} | BS: {a.doctorName} | DV: {a.serviceNames}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. ĐỊNH MỨC */}
            {serviceMaterials.length > 0 && (
              <div
                style={{
                  marginBottom: "30px",
                  padding: "20px",
                  background: "#e8f8f5",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h6
                    style={{ color: "#27ae60", margin: 0, fontWeight: "bold" }}
                  >
                    VẬT TƯ ĐỊNH MỨC
                  </h6>
                  <button
                    onClick={handleUseAllByStandard}
                    style={btnStyle("#27ae60")}
                  >
                    LẤY TẤT CẢ
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
                    gap: "12px",
                    marginTop: "15px",
                  }}
                >
                  {serviceMaterials.map((m) => (
                    <div
                      key={m.materialId}
                      onClick={() => {
                        setMaterialId(m.materialId);
                        setQuantity(m.standardQuantity);
                      }}
                      style={{
                        padding: "12px",
                        background: "#fff",
                        borderRadius: "8px",
                        border: "2px solid #27ae60",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{m.materialName}</strong>
                      <p style={{ margin: "4px 0", color: "#666" }}>
                        {m.standardQuantity} {m.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. TAB */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              {[
                { key: "use", label: "LẤY VẬT TƯ", color: "#2ECCB6" },
                { key: "return", label: "HOÀN VẬT TƯ", color: "#f39c12" },
                { key: "used", label: "GHI NHẬN ĐÃ DÙNG", color: "#27ae60" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    ...btnStyle(t.color),
                    margin: "0 8px",
                    opacity: activeTab === t.key ? 1 : 0.7,
                    transform: activeTab === t.key ? "scale(1.05)" : "scale(1)",
                    transition: "all .2s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 4. FORM THỦ CÔNG */}
            <div
              style={{
                padding: "20px",
                background: "#f8f9fa",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
                  gap: "15px",
                }}
              >
                {/* VẬT TƯ – ĐÃ FIX 100% */}
                <div>
                  <label style={{ fontWeight: 600 }}>Vật tư:</label>
                  {allMaterials.length === 0 ? (
                    <div
                      style={{
                        padding: "12px",
                        background: "#ffebee",
                        borderRadius: "8px",
                        color: "#c62828",
                      }}
                    >
                      <strong>
                        Đang tải vật tư... (F12 → Console nếu lỗi)
                      </strong>
                    </div>
                  ) : (
                    <select
                      value={materialId}
                      onChange={(e) => setMaterialId(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">-- Chọn vật tư --</option>
                      {allMaterials.map((m) => (
                        <option key={m.materialId} value={m.materialId}>
                          [{m.materialId}] {m.materialName} ({m.unit}) → Tồn:{" "}
                          {m.stockQuantity}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* SỐ LƯỢNG */}
                <div>
                  <label style={{ fontWeight: 600 }}>Số lượng:</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* GHI CHÚ */}
                <div>
                  <label style={{ fontWeight: 600 }}>Ghi chú:</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Ca khẩn"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* NÚT XÁC NHẬN */}
              <div style={{ textAlign: "center", marginTop: "25px" }}>
                {activeTab === "use" && (
                  <button onClick={handleUse} style={btnStyle("#2ECCB6")}>
                    XÁC NHẬN LẤY
                  </button>
                )}
                {activeTab === "return" && (
                  <button onClick={handleReturn} style={btnStyle("#f39c12")}>
                    XÁC NHẬN HOÀN
                  </button>
                )}
                {activeTab === "used" && (
                  <button onClick={handleUsed} style={btnStyle("#27ae60")}>
                    GHI NHẬN
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// STYLE ĐẸP
const selectStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "2px solid #2ECCB6",
  fontSize: "16px",
  background: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "2px solid #2ECCB6",
  fontSize: "16px",
};

const btnStyle = (bg) => ({
  padding: "14px 40px",
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,.2)",
});
