import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Trophy,
  Bell,
  LogOut,
  Home,
  Shield,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/teams', label: 'Teams', icon: Trophy },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  // Redirect non-admins
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e293b] border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-wide">ADMIN PANEL</h1>
              <p className="text-xs text-slate-500">Home Run Derby</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium text-cyan-400">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.username}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Management
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path, item.exact)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all group ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 -ml-[2px] pl-[14px]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="text-sm">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors group"
          >
            <Home className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
            <span className="text-sm">Back to App</span>
          </Link>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors group"
          >
            <LogOut className="h-4 w-4 text-slate-500 group-hover:text-red-400" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="h-14 bg-[#1e293b]/50 border-b border-white/5 flex items-center px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Admin</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-white">
              {navItems.find(item => isActive(item.path, item.exact))?.label || 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
