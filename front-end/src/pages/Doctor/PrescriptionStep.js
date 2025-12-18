import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = "http://localhost:5000";

function ssKey(appointmentId) {
  return `diag_wizard_${appointmentId}`;
}

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export default function PrescriptionStep() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const apptId = Number(appointmentId);

  const token = localStorage.getItem("token");

  const [medicines, setMedicines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [rows, setRows] = useState([]);

  const draft = useMemo(() => {
    return safeJsonParse(sessionStorage.getItem(ssKey(apptId)) || "null", null);
  }, [apptId]);

  const selectedAppointment = useMemo(() => {
    return appointments.find((a) => a.appointmentId === apptId) || null;
  }, [appointments, apptId]);

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      let err = {};
      try {
        err = await res.json();
      } catch {}
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  useEffect(() => {
    if (!token) return;

    // Guard: phải có step1 + step2
    if (!draft?.diagnosis?.diagnosisResult) {
      toast.info("Bạn cần hoàn tất bước chẩn đoán trước.");
      navigate(`/doctor/diagnosis/${apptId}`);
      return;
    }
    if (!Array.isArray(draft?.services)) {
      toast.info("Bạn cần chọn dịch vụ trước.");
      navigate(`/doctor/diagnosis/${apptId}/services`);
      return;
    }

    (async () => {
      try {
        const m = await fetchJson(`${API_BASE}/api/medicines`);
        setMedicines(Array.isArray(m) ? m : []);
      } catch (e) {
        toast.error("Không tải được thuốc: " + e.message);
      }

      try {
        const appts = await fetchJson(`${API_BASE}/api/diagnoses/appointments`);
        setAppointments(Array.isArray(appts) ? appts : []);
      } catch {}

      // load draft medicines nếu có
      const draftMeds = Array.isArray(draft?.medicines) ? draft.medicines : [];
      setRows(draftMeds);
    })();
  }, [token, apptId]); // eslint-disable-line

  const addRow = () =>
    setRows((p) => [
      ...p,
      { medicineId: "", quantity: 1, dosage: "", usageInstruction: "" },
    ]);
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) =>
    setRows((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: value };
      return n;
    });

  const formatTime = (t) =>
    t ? String(t).split(":").slice(0, 2).join(":") : "";

  const finish = async () => {
    // Lưu draft medicines
    const nextDraft = { ...draft, medicines: rows, updatedAt: Date.now() };
    sessionStorage.setItem(ssKey(apptId), JSON.stringify(nextDraft));

    // ✅ Gọi đúng endpoint backend hiện tại của bạn (giống trang cũ)
    const payload = {
      appointmentId: apptId,
      symptoms: draft.diagnosis.symptoms || "",
      diagnosisResult: draft.diagnosis.diagnosisResult || "",
      doctorNote: draft.diagnosis.doctorNote || "",
      services: (draft.services || []).map((id) => ({
        serviceId: id,
        note: "",
      })),
      medicines: rows,
    };

    try {
      // 1) Create diagnosis (kèm medicines) — y hệt logic cũ của bạn
      await fetchJson(`${API_BASE}/api/diagnoses/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // 2) Add services vào appointment (giữ theo code cũ để tương thích hệ thống)
      for (const serviceId of draft.services || []) {
        await fetchJson(`${API_BASE}/api/appointments/${apptId}/services`, {
          method: "POST",
          body: JSON.stringify({ serviceId }),
        });
      }

      toast.success("Hoàn tất chẩn đoán!");
      sessionStorage.removeItem(ssKey(apptId));
      navigate("/doctor/diagnosis/history"); // hoặc route danh sách ca khám của bạn
    } catch (e) {
      toast.error("Lỗi: " + e.message);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={title}>Kê đơn thuốc</h2>
        <p style={sub}>Kê thuốc (nếu có) → Hoàn tất chẩn đoán</p>

        {selectedAppointment && (
          <div style={infoBox}>
            <div>
              <b>Ca:</b> #{selectedAppointment.appointmentId} •{" "}
              {selectedAppointment.patientName}
            </div>
            <div>
              <b>Giờ:</b> {formatTime(selectedAppointment.startTime)} -{" "}
              {formatTime(selectedAppointment.endTime)}
            </div>
            <div>
              <b>Kết luận:</b> {draft?.diagnosis?.diagnosisResult}
            </div>
          </div>
        )}

        <div style={section}>
          {rows.map((r, i) => (
            <div key={i} style={row}>
              <select
                style={cell}
                value={r.medicineId}
                onChange={(e) => updateRow(i, "medicineId", e.target.value)}
              >
                <option value="">Chọn thuốc</option>
                {medicines.map((m) => (
                  <option key={m.medicineId} value={m.medicineId}>
                    {m.medicineName}
                  </option>
                ))}
              </select>

              <input
                style={cell}
                type="number"
                min="1"
                value={r.quantity}
                onChange={(e) => updateRow(i, "quantity", e.target.value)}
              />

              <input
                style={cell}
                placeholder="Liều dùng"
                value={r.dosage}
                onChange={(e) => updateRow(i, "dosage", e.target.value)}
              />

              <input
                style={cell}
                placeholder="Hướng dẫn"
                value={r.usageInstruction}
                onChange={(e) =>
                  updateRow(i, "usageInstruction", e.target.value)
                }
              />

              <button style={del} onClick={() => removeRow(i)} type="button">
                ×
              </button>
            </div>
          ))}

          <button style={add} onClick={addRow} type="button">
            + Thêm thuốc
          </button>
        </div>

        <div style={actions}>
          <button
            style={ghost}
            onClick={() => navigate(`/doctor/diagnosis/${apptId}/services`)}
          >
            ← Quay lại chọn dịch vụ
          </button>
          <button style={primary} onClick={finish}>
            Hoàn tất chẩn đoán
          </button>
        </div>
      </div>
    </div>
  );
}

/* styles */
const wrap = { minHeight: "100vh", padding: 24, background: "#f6fffd" };
const card = {
  maxWidth: 980,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
};
const title = { margin: 0 };
const sub = { marginTop: 6, color: "#6b7280" };
const section = { marginTop: 14 };
const infoBox = {
  marginTop: 10,
  padding: 12,
  borderRadius: 12,
  background: "#ecfbf8",
  border: "1px solid #dff5f0",
};
const row = {
  display: "grid",
  gridTemplateColumns: "1.3fr .4fr .8fr .8fr .1fr",
  gap: 8,
  marginBottom: 10,
};
const cell = { padding: 10, borderRadius: 10, border: "2px solid #22c7a9" };
const del = {
  borderRadius: 10,
  background: "#ef4444",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};
const add = {
  marginTop: 8,
  padding: 10,
  borderRadius: 12,
  background: "#22c7a9",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
};
const actions = {
  marginTop: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};
const primary = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "#10b981",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};
const ghost = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f3f4f6",
  color: "#111827",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};
