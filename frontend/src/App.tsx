import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SeasonProvider } from './contexts/SeasonContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import CompleteProfile from './pages/CompleteProfile'
import CreateTeam from './pages/CreateTeam'
import MyTeams from './pages/MyTeams'
import Leaderboard from './pages/Leaderboard'
import Players from './pages/Players'
import Setup from './pages/Setup'
import PrizePayout from './pages/PrizePayout'
// PlayerProfile removed - player details now shown in slide-out panel on Players page

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
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<Navigate to="/players" replace />} />

        {/* Test component routes */}
        <Route path="/pccomponent-test" element={<ComponentTest />} />  
        <Route path="/teamrostercomponent-test" element={<TeamRosterCompTest />} />


        {/* Complete profile route (for new Google OAuth users) */}
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute requireCompletedProfile={false}>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

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
          path="/setup"
          element={
            <ProtectedRoute>
              <Setup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prizes"
          element={
            <ProtectedRoute>
              <PrizePayout />
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

        {/* 404 - Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SeasonProvider>
    </AuthProvider>
  )
}

export default App
