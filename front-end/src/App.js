import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Home from "./pages/Home";
import PatientLayout from "./pages/Patient/PatientLayout";
import ChatPage from "./pages/ChatPage";

// import Appointments from "./components/doctor/Appointments";
// import PatientRecords from "./components/doctor/PatientRecords";
// import Schedule from "./components/doctor/Schedule";
// import Examination from "./components/doctor/Examination";
// import Prescription from "./components/doctor/PrescribeMedication";
// import DiagnosisPlan from "./components/doctor/DiagnosisPlan";
// import TreatmentProgress from "./components/doctor/TreatmentProgress";
// import ScheduleRequest from "./components/doctor/ScheduleRequest";

import ProfilePage from "./pages/profile/ProfileView";
import ServicesPage from "./pages/Home/Service";
import ServiceDetail from "./pages/Home/ServiceDeatil";
import DoctorsPage from "./pages/Home/DoctorsPage";
import DoctorDetail from "./pages/Home/DoctorDetatil";

import ClinicManagerScheduleRequests from "./pages/ClinicManager/DoctorScheduleManager";

import SignIn from "./pages/Account/SignIn";
import SignUp from "./pages/Account/SignUp";
import VerifyOtp from "./pages/Account/VerifyOTP";
import ResetPassword from "./pages/Account/ResetPassword";
import ChangePassword from "./pages/Account/ChangePassword";

import DoctorRatingTestPage from "./pages/Test/DoctorRatingTestPage";
import ServiceRatingTestPage from "./pages/Test/ServiceRatingTestPage";
import NurseMaterialPage from "./pages/Nurse/NurseMaterialPage";
import AppointmentPage from "./pages/AppointmentPage";
import MyAppointmentsPage from "./pages/Patient/MyAppointment";
import AppointmentReview from "./pages/Patient/AppointmentReview";
import NotFound from "./pages/NotFound";

import MaterialClinicPage from "./pages/ClinicManager/MaterialClinicPage";
import Service from "./pages/ClinicManager/Services";
import ClinicManagerProfile from "./pages/ClinicManager/ClinicManagerProfile";
import ClinicManagerLayout from "./pages/ClinicManager/ClinicManagerLayout";

import DoctorLayout from "./pages/Doctor/DoctorLayout";
import DoctorScheduleCalendar from "./pages/Doctor/DoctorSchedule";
import DoctorCreateSchedule from "./pages/Doctor/DotorCreateSchedule";
import DoctorProfile from "./pages/Doctor/DoctorProfile";
import DoctorDiagnosis from "./pages/Doctor/DoctorDiagnosis";
import DoctorDiagnosisHistory from "./pages/Doctor/DoctorDiagnosisHistory";
import ClinicManagerMedicinePage from "./pages/ClinicManager/ClinicManagerMedicinePage";
import DiagnosisStep from "./pages/Doctor/DiagnosisStep";
import ServicesStep from "./pages/Doctor/ServicesStep";
import PrescriptionStep from "./pages/Doctor/PrescriptionStep";

import PatientAppointmentsPage from "./pages/Receptionist/PatientAppointmentsPage";
import ReceptionistLayout from "./pages/Receptionist/ReceptionistLayout";
import ReceptionistProfile from "./pages/Receptionist/ReceptionistProfile";
import PatientListPage from "./pages/Receptionist/PatientListPage";
import PatientDetailPage from "./pages/Receptionist/PatientDetailPage";
import CreateAppointmentReceptionist from "./pages/Receptionist/CreateAppointmentReceptionist";

import NurseLayout from "./pages/Nurse/NurseLayout";
import NurseProfile from "./pages/Nurse/NurseProfile";
import NurseScheduleTable from "./pages/Nurse/NurseSchedule";

import AdminLayout from "./pages/Admin/AdminLayout";
import AdminProfile from "./pages/Admin/AdminProfile";
import UserManagement from "./pages/Admin/UserManagement";

import Promotion from "./pages/ClinicManager/Promotion";
import Invoice from "./pages/ClinicManager/Invoice";
import VnpayReturn from "./pages/VnpayReturn";
import DoctorPrescription from "./components/doctor/DoctorPrescription";
// import ReceptionistInvoiceListPage from "./pages/Receptionist/InvoiceListPage";
import ReceptionistInvoiceDetailPage from "./pages/Receptionist/InvoiceDetailPage";

import MedicalRecordPage from "./pages/Patient/MedicalRecordPage";

import InvoiceListPage from "./pages/Patient/InvoiceListPage";
import InvoiceDetailPage from "./pages/Patient/InvoiceDetailPage";
import StatisticsPage from "./pages/ClinicManager/StatisticsPage";
import DashboardPage from "./pages/ClinicManager/DashboardPage";
import MyInvoice from "./pages/Patient/MyInvoice";
import Contact from "./pages/Home/Contact";
import PaymentList from "./pages/ClinicManager/PaymentList";
import MyPayments from "./pages/Patient/MyPayments";
function App() {
  return (
    <Router>
      <Routes>
        {/* Patient routes with popup logic */}
        <Route element={<PatientLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<ServicesPage />} />
          <Route path="/service/:id" element={<ServiceDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/alldoctors" element={<DoctorsPage />} />
          <Route path="/doctor/:id" element={<DoctorDetail />} />
        </Route>
        {/* <Route path="/chat" element={<ChatPage />} /> */}
        <Route path="/profile" element={<ProfilePage />} />
        {/* <Route path="/contact" element={<Contact />} /> */}
        {/* Authentication routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/appointment" element={<AppointmentPage />} />
        <Route
          path="/appointment/:appointmentId/review"
          element={<AppointmentReview />}
        />
        <Route path="/appointment/me" element={<MyAppointmentsPage />} />
        <Route path="/medical-record" element={<MedicalRecordPage />} />
        <Route path="/invoice/me/:invoiceId" element={<InvoiceDetailPage />} />
        <Route path="/invoice/me" element={<MyInvoice />} />
        <Route path="/invoice-pending/me" element={<InvoiceListPage />} />
        <Route path="/payments/me" element={<MyPayments />} />
        {/*clinic Manager*/}

        {/* Trang cho Admin */}
        <Route
          path="/admin/acounts"
          element={
            <AdminLayout>
              <UserManagement />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <AdminLayout>
              <AdminProfile />
            </AdminLayout>
          }
        />

        {/* Trang cho Clinic Manager */}
        <Route
          path="/clinicmanager/services"
          element={
            <ClinicManagerLayout>
              <Service />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/material"
          element={
            <ClinicManagerLayout>
              <MaterialClinicPage />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/doctorschedule"
          element={
            <ClinicManagerLayout>
              <ClinicManagerScheduleRequests />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/profile"
          element={
            <ClinicManagerLayout>
              <ClinicManagerProfile />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/promotion"
          element={
            <ClinicManagerLayout>
              <Promotion />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/invoice"
          element={
            <ClinicManagerLayout>
              <Invoice />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/statistics"
          element={
            <ClinicManagerLayout>
              <StatisticsPage />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/dashboard"
          element={
            <ClinicManagerLayout>
              <DashboardPage />
            </ClinicManagerLayout>
          }
        />
        <Route
          path="/clinicmanager/payments"
          element={
            <ClinicManagerLayout>
              <PaymentList />
            </ClinicManagerLayout>
          }
        />
        {/* Trang cho Doctor */}
        <Route
          path="/doctor/schedule"
          element={
            <DoctorLayout>
              <DoctorScheduleCalendar />
            </DoctorLayout>
          }
        />
        <Route
          path="/doctor/create/schedule"
          element={
            <DoctorLayout>
              <DoctorCreateSchedule />
            </DoctorLayout>
          }
        />
        <Route
          path="/doctor/profile"
          element={
            <DoctorLayout>
              <DoctorProfile />
            </DoctorLayout>
          }
        />
        {/* Doctor Diagnosis Wizard */}
        <Route
          path="/doctor/diagnosis"
          element={
            <DoctorLayout>
              <DiagnosisStep />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/diagnosis/:appointmentId"
          element={
            <DoctorLayout>
              <DiagnosisStep />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/diagnosis/:appointmentId/services"
          element={
            <DoctorLayout>
              <ServicesStep />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/diagnosis/:appointmentId/prescription"
          element={
            <DoctorLayout>
              <PrescriptionStep />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/diagnosis/history"
          element={
            <DoctorLayout>
              <DoctorDiagnosisHistory />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/prescription"
          element={
            <DoctorLayout>
              <DoctorPrescription />
            </DoctorLayout>
          }
        />
        <Route
          path="/clinicmanager/medicines"
          element={
            <ClinicManagerLayout>
              <ClinicManagerMedicinePage />
            </ClinicManagerLayout>
          }
        />

        {/* Trang cho Nurse */}
        <Route
          path="/nurse/profile"
          element={
            <NurseLayout>
              <NurseProfile />
            </NurseLayout>
          }
        />
        <Route
          path="/nurse/materials"
          element={
            <NurseLayout>
              <NurseMaterialPage />
            </NurseLayout>
          }
        />
        <Route
          path="/nurse/schedule"
          element={
            <NurseLayout>
              <NurseScheduleTable />
            </NurseLayout>
          }
        />

        {/* Receptionist */}
        <Route
          path="/receptionist/patient/appointment"
          element={
            <ReceptionistLayout>
              <PatientAppointmentsPage />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/profile"
          element={
            <ReceptionistLayout>
              <ReceptionistProfile />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/patients/:userId"
          element={
            <ReceptionistLayout>
              <PatientDetailPage />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/patients"
          element={
            <ReceptionistLayout>
              <PatientListPage />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/appointment/create"
          element={
            <ReceptionistLayout>
              <CreateAppointmentReceptionist />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/payments"
          element={
            <ReceptionistLayout>
              <PaymentList />
            </ReceptionistLayout>
          }
        />
        <Route path="/vnpay_return_url" element={<VnpayReturn />} />

        <Route
          path="/receptionist/invoices/:invoiceId"
          element={
            <ReceptionistLayout>
              <ReceptionistInvoiceDetailPage />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/invoices"
          element={
            <ReceptionistLayout>
              <InvoiceListPage />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/invoice"
          element={
            <ReceptionistLayout>
              <Invoice />
            </ReceptionistLayout>
          }
        />
        <Route
          path="/receptionist/invoices/:invoiceId"
          element={
            <ReceptionistLayout>
              <ReceptionistInvoiceDetailPage />
            </ReceptionistLayout>
          }
        />
        <Route
          path="//receptionist/chat"
          element={
            <ReceptionistLayout>
              <ChatPage />
            </ReceptionistLayout>
          }
        />
        {/* Route 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Toast container đặt cuối trang */}
      <ToastContainer position="top-right" autoClose={2500} theme="colored" />
    </Router>
  );
}

export default App;
