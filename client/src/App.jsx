import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx'
import { LoginPage } from './pages/auth/LoginPage.jsx'
import { MemberDetailsPage } from './pages/members/MemberDetailsPage.jsx'
import { MemberFormPage } from './pages/members/MemberFormPage.jsx'
import { MembersPage } from './pages/members/MembersPage.jsx'
import { MembershipDetailsPage } from './pages/memberships/MembershipDetailsPage.jsx'
import { MembershipFormPage } from './pages/memberships/MembershipFormPage.jsx'
import { MembershipPlanFormPage } from './pages/memberships/MembershipPlanFormPage.jsx'
import { MembershipPlansPage } from './pages/memberships/MembershipPlansPage.jsx'
import { MembershipsPage } from './pages/memberships/MembershipsPage.jsx'
import { TrainerDetailsPage } from './pages/trainers/TrainerDetailsPage.jsx'
import { TrainerFormPage } from './pages/trainers/TrainerFormPage.jsx'
import { TrainersPage } from './pages/trainers/TrainersPage.jsx'
import { CommissionAgreementDetailsPage } from './pages/trainers/CommissionAgreementDetailsPage.jsx'
import { CommissionAgreementFormPage } from './pages/trainers/CommissionAgreementFormPage.jsx'
import { PaymentDetailsPage } from './pages/payments/PaymentDetailsPage.jsx'
import { PaymentFormPage } from './pages/payments/PaymentFormPage.jsx'
import { PaymentReceiptPage } from './pages/payments/PaymentReceiptPage.jsx'
import { PaymentsPage } from './pages/payments/PaymentsPage.jsx'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/members/new" element={<MemberFormPage />} />
              <Route path="/members/:memberId/edit" element={<MemberFormPage />} />
              <Route path="/members/:memberId" element={<MemberDetailsPage />} />
              <Route path="/membership-plans" element={<MembershipPlansPage />} />
              <Route path="/membership-plans/new" element={<MembershipPlanFormPage />} />
              <Route path="/membership-plans/:planId/edit" element={<MembershipPlanFormPage />} />
              <Route path="/memberships" element={<MembershipsPage />} />
              <Route path="/memberships/new" element={<MembershipFormPage />} />
              <Route path="/memberships/:membershipId/renew" element={<MembershipFormPage />} />
              <Route path="/memberships/:membershipId" element={<MembershipDetailsPage />} />
              <Route path="/trainers" element={<TrainersPage />} />
              <Route path="/trainers/new" element={<TrainerFormPage />} />
              <Route path="/trainers/:trainerId/edit" element={<TrainerFormPage />} />
              <Route
                path="/trainers/:trainerId/commission-agreements/new"
                element={<CommissionAgreementFormPage />}
              />
              <Route path="/trainers/:trainerId" element={<TrainerDetailsPage />} />
              <Route
                path="/commission-agreements/:agreementId"
                element={<CommissionAgreementDetailsPage />}
              />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/payments/new" element={<PaymentFormPage />} />
              <Route path="/payments/:paymentId/receipt" element={<PaymentReceiptPage />} />
              <Route path="/payments/:paymentId" element={<PaymentDetailsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
