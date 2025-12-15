import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/auth/doctors/${id}`)
      .then((res) => res.json())
      .then((data) => setDoctor(data))
      .catch((err) => console.error("Error loading doctor detail:", err));
  }, [id]);

  if (!doctor) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success"></div>
        <p className="mt-3">Đang tải dữ liệu bác sĩ...</p>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container py-5" style={{ maxWidth: "900px" }}>
        <button
          className="btn btn-outline-success mb-4"
          onClick={() => navigate(-1)}
          style={{ borderRadius: "10px" }}
        >
          ← Quay lại
        </button>

        <div
          className="p-4 shadow-sm"
          style={{
            borderRadius: "18px",
            backgroundColor: "#fff",
            border: "1px solid #f0f0f0",
          }}
        >
          <div className="text-center mb-4">
            <img
              src={
                doctor.avatar ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              }
              alt={doctor.fullName}
              className="rounded-circle"
              width="120"
              height="120"
            />
          </div>

          <h2 className="fw-bold text-center mb-2" style={{ color: "#2ECCB6" }}>
            {doctor.fullName}
          </h2>
          <p className="text-center text-muted mb-3">{doctor.specialty}</p>

          <div className="row mt-4">
            <div className="col-md-6 mb-3">
              <div
                className="p-3 h-100 shadow-sm"
                style={{
                  borderRadius: "15px",
                  backgroundColor: "#f9fdfa",
                  border: "1px solid #e2f7f2",
                }}
              >
                <h6 className="text-success mb-1">Kinh nghiệm</h6>
                <p className="fw-bold fs-5 mb-0">{doctor.experience} năm</p>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div
                className="p-3 h-100 shadow-sm"
                style={{
                  borderRadius: "15px",
                  backgroundColor: "#f9fdfa",
                  border: "1px solid #e2f7f2",
                }}
              >
                <h6 className="text-success mb-1">Số điện thoại</h6>
                <p className="fw-bold fs-5 mb-0">{doctor.phone}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h6 className="text-success mb-2">Giới thiệu</h6>
            <p className="text-muted">{doctor.bio}</p>
          </div>

          <div className="text-center mt-5">
            <button
              className="btn btn-lg px-4"
              style={{
                backgroundColor: "#2ECCB6",
                borderColor: "#2ECCB6",
                color: "#fff",
              }}
              onClick={() => {
                const token = localStorage.getItem("token");
                if (!token) {
                  navigate("/signin", {
                    state: { redirectTo: "/appointment" },
                  });
                  return;
                }
                navigate("/appointment");
              }}
            >
              Đặt lịch ngay
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
