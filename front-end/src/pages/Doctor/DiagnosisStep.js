import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = "http://localhost:5000";

export default function DiagnosisStep() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [symptoms, setSymptoms] = useState("");
  const [diagnosisResult, setDiagnosisResult] = useState("");
  const [doctorNote, setDoctorNote] = useState("");

  /* ================== UTILS ================== */
  const formatTime = (t) => (t ? t.split(":").slice(0, 2).join(":") : "--:--");

  /* ================== FETCH APPOINTMENTS ================== */
  useEffect(() => {
    if (!token || !user.userId) return;

    fetch(`${API_BASE}/api/diagnoses/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setAppointments(Array.isArray(data) ? data : []);
        if (appointmentId) {
          const found = data.find(
            (a) => a.appointmentId === Number(appointmentId)
          );
          if (found) setSelectedAppointment(found);
        }
      })
      .catch(() => {
        toast.error("Không tải được danh sách ca khám");
        setAppointments([]);
      });
  }, [token, user.userId, appointmentId]);

  /* ================== LOAD DRAFT ================== */
  useEffect(() => {
    if (!selectedAppointment) return;
    const key = `diag_wizard_${selectedAppointment.appointmentId}`;
    const draft = JSON.parse(sessionStorage.getItem(key) || "{}");

    setSymptoms(draft?.diagnosis?.symptoms || "");
    setDiagnosisResult(draft?.diagnosis?.diagnosisResult || "");
    setDoctorNote(draft?.diagnosis?.doctorNote || "");
  }, [selectedAppointment]);

  /* ================== NEXT STEP ================== */
  const goNext = () => {
    if (!selectedAppointment) return toast.warning("Vui lòng chọn ca khám");
    if (!diagnosisResult.trim())
      return toast.info("Vui lòng nhập kết luận chẩn đoán");

    const key = `diag_wizard_${selectedAppointment.appointmentId}`;
    sessionStorage.setItem(
      key,
      JSON.stringify({
        diagnosis: { symptoms, diagnosisResult, doctorNote },
        updatedAt: Date.now(),
      })
    );

    navigate(`/doctor/diagnosis/${selectedAppointment.appointmentId}/services`);
  };

  /* ================== UI ================== */
  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={title}>Chọn ca & Chẩn đoán</h2>
        <p style={sub}>Chọn ca khám bên dưới để bắt đầu</p>

        {/* ===== CHỌN CA KHÁM ===== */}
        <h3 style={{ marginBottom: 12 }}>Ca khám hôm nay</h3>

        {appointments.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Không có ca khám nào</p>
        ) : (
          <div style={appointmentGrid}>
            {appointments.map((a) => {
              const isSelected =
                selectedAppointment?.appointmentId === a.appointmentId;

              return (
                <div
                  key={a.appointmentId}
                  style={{
                    ...appointmentCard,
                    borderColor: isSelected ? "#22c7a9" : "#e5e7eb",
                    background: isSelected ? "#ecfdf9" : "#fff",
                  }}
                  onClick={() => setSelectedAppointment(a)}
                >
                  <div style={rowBetween}>
                    <span style={timeText}>
                      {formatTime(a.startTime)} – {formatTime(a.endTime)}
                    </span>
                    <span style={badge}>{a.appointmentType}</span>
                  </div>

                  <div style={patientName}>{a.patientName}</div>

                  <div style={reasonText}>
                    <b>Lý do:</b> {a.reason || "Không có"}
                  </div>

                  <div style={footerRow}>
                    <span style={idText}>#{a.appointmentId}</span>
                    {isSelected && <span style={selectedText}>✓ Đã chọn</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== FORM CHẨN ĐOÁN ===== */}
        {selectedAppointment && (
          <>
            <h3 style={{ marginTop: 24 }}>Chẩn đoán</h3>

            <textarea
              placeholder="Triệu chứng"
              style={textarea}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />

            <textarea
              placeholder="Kết luận chẩn đoán *"
              style={textarea}
              value={diagnosisResult}
              onChange={(e) => setDiagnosisResult(e.target.value)}
            />

            <input
              placeholder="Ghi chú bác sĩ"
              style={input}
              value={doctorNote}
              onChange={(e) => setDoctorNote(e.target.value)}
            />

            <button style={primaryBtn} onClick={goNext}>
              Tiếp tục chọn dịch vụ →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================== STYLES ================== */
const wrap = {
  minHeight: "100vh",
  padding: 24,
};

const card = {
  maxWidth: 1200,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
};

const title = { margin: 0 };
const sub = { marginTop: 6, color: "#6b7280" };

const appointmentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 14,
};

const appointmentCard = {
  padding: 16,
  borderRadius: 14,
  border: "2px solid #e5e7eb",
  cursor: "pointer",
  transition: "all .2s ease",
  boxShadow: "0 4px 12px rgba(0,0,0,.06)",
};

const rowBetween = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

const timeText = {
  fontWeight: 700,
  color: "#065f46",
};

const badge = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "#d1fae5",
  color: "#065f46",
  fontSize: 12,
  fontWeight: 700,
};

const patientName = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 4,
};

const reasonText = {
  fontSize: 14,
  color: "#374151",
  marginBottom: 8,
};

const footerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const idText = {
  fontSize: 12,
  color: "#6b7280",
};

const selectedText = {
  fontSize: 12,
  color: "#10b981",
  fontWeight: 700,
};

const textarea = {
  width: "100%",
  minHeight: 90,
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  border: "2px solid #22c7a9",
};

const input = {
  width: "100%",
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  border: "2px solid #22c7a9",
};

const primaryBtn = {
  marginTop: 20,
  padding: "14px",
  width: "100%",
  borderRadius: 14,
  background: "#10b981",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
  border: "none",
  cursor: "pointer",
};
