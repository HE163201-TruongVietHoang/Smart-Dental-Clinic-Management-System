import React, { useState } from "react";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Giả lập gửi form
    if (!formData.name || !formData.email || !formData.message) {
      setError("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    // Ở đây có thể gọi API để gửi tin nhắn
    console.log("Form submitted:", formData);
    setSuccess(true);
    setError("");
    setFormData({ name: "", email: "", phone: "", message: "" });
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div>
      <Header />
      <div className="container py-5" style={{ maxWidth: "800px" }}>
        {/* Back button */}
        <button
          className="btn btn-outline-success mb-4"
          onClick={() => window.history.back()}
          style={{ borderRadius: "10px" }}
        >
          ← Quay lại
        </button>

        {/* Card Contact */}
        <div
          className="p-4 shadow-sm"
          style={{
            borderRadius: "18px",
            backgroundColor: "#fff",
            border: "1px solid #f0f0f0",
          }}
        >
          {/* Icon */}
          <div className="text-center mb-4">
            <i
              className="fas fa-envelope"
              style={{
                fontSize: "70px",
                color: "#2ECCB6",
              }}
            ></i>
          </div>

          {/* Title */}
          <h2 className="fw-bold text-center mb-3" style={{ color: "#2ECCB6" }}>
            Liên hệ với chúng tôi
          </h2>

          {/* Description */}
          <p className="text-muted fs-5 text-center mb-4">
            Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, hãy liên hệ với chúng
            tôi qua form dưới đây. Chúng tôi sẽ phản hồi trong thời gian sớm
            nhất!
          </p>

          {/* Contact Info */}
          <div className="row mb-4">
            <div className="col-md-4 text-center">
              <i
                className="fas fa-phone"
                style={{ fontSize: "30px", color: "#2ECCB6" }}
              ></i>
              <p className="mt-2 fw-bold">Điện thoại</p>
              <p className="text-muted">(+84) 981 226 816</p>
            </div>
            <div className="col-md-4 text-center">
              <i
                className="fas fa-envelope"
                style={{ fontSize: "30px", color: "#2ECCB6" }}
              ></i>
              <p className="mt-2 fw-bold">Email</p>
              <p className="text-muted">sdcms@gmail.com</p>
            </div>
            <div className="col-md-4 text-center">
              <i
                className="fas fa-map-marker-alt"
                style={{ fontSize: "30px", color: "#2ECCB6" }}
              ></i>
              <p className="mt-2 fw-bold">Địa chỉ</p>
              <p className="text-muted">123 Hoà Lạc, TP.Hà Nội</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && (
              <div className="alert alert-success">
                Tin nhắn đã được gửi thành công!
              </div>
            )}

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="name" className="form-label fw-bold">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="email" className="form-label fw-bold">
                  Email *
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{ borderRadius: "10px" }}
                />
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="phone" className="form-label fw-bold">
                Số điện thoại
              </label>
              <input
                type="tel"
                className="form-control"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={{ borderRadius: "10px" }}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="message" className="form-label fw-bold">
                Tin nhắn *
              </label>
              <textarea
                className="form-control"
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                required
                style={{ borderRadius: "10px" }}
              ></textarea>
            </div>
            <div className="text-center">
              <button
                type="submit"
                className="btn btn-lg px-4"
                style={{
                  backgroundColor: "#2ECCB6",
                  borderColor: "#2ECCB6",
                  color: "#fff",
                  borderRadius: "25px",
                }}
              >
                Gửi tin nhắn
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
