import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SeasonProvider } from './contexts/SeasonContext'
import { SeasonBanner } from './components/SeasonBanner'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import CreateTeam from './pages/CreateTeam'
import PaymentPage from './pages/PaymentPage'
import TeamDetail from './pages/TeamDetail'
import MyTeams from './pages/MyTeams'
import Leaderboard from './pages/Leaderboard'
import Players from './pages/Players'
import PlayerProfile from './pages/PlayerProfile'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTeams from './pages/admin/AdminTeams'
import AdminUsers from './pages/admin/AdminUsers'
import AdminNotifications from './pages/admin/AdminNotifications'

// Test components
import ComponentTest from './pages/test-pages/pcComponentTest'
import TeamRosterCompTest from './pages/test-pages/TeamRosterCompTest'

function App() {
  return (
    <AuthProvider>
      <SeasonProvider>
        <SeasonBanner />
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />

        {/* Test component routes */}
        <Route path="/pccomponent-test" element={<ComponentTest />} />  
        <Route path="/teamrostercomponent-test" element={<TeamRosterCompTest />} />


        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-teams"
          element={
            <ProtectedRoute>
              <MyTeams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-team"
          element={
            <ProtectedRoute>
              <CreateTeam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId"
          element={
            <ProtectedRoute>
              <TeamDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 - Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SeasonProvider>
    </AuthProvider>
  )
}

export default App
