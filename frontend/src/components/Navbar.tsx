import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import {
  User,
  LogOut,
  LayoutDashboard,
  Trophy,
  Menu,
  X,
  ChevronDown,
  Shield,
  Users,
  Zap,
  BookOpen,
  Award,
} from 'lucide-react'

interface NavbarProps {
  showAuth?: boolean
}

export function Navbar({ showAuth = true }: NavbarProps) {
  const { user, logout } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isRegistrationOpen = season?.phase === 'registration'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
    { href: '/setup', label: 'How to Play', icon: BookOpen, requiresAuth: true },
    { href: '/players', label: 'Players', icon: Users, requiresAuth: false },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, requiresAuth: false },
    { href: '/prizes', label: 'Prizes', icon: Award, requiresAuth: true },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0c0c0c]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-[#b91c1c] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-broadcast text-lg text-white tracking-wide">
                HR DERBY
              </span>
              <span className="font-broadcast text-lg text-[#d97706] tracking-wide ml-1">
                2.0
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.requiresAuth && !user) return null
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    isActive(link.href)
                      ? 'text-white bg-white/10 border-b-2 border-[#b91c1c]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}

            {user && (
              <>
                {isRegistrationOpen ? (
                  <Link
                    to="/create-team"
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive('/create-team')
                        ? 'text-white bg-white/10 border-b-2 border-[#b91c1c]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Create Team
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 text-sm text-white/30 cursor-not-allowed">
                    Create Team
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/40">
                      CLOSED
                    </span>
                  </span>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'text-[#d97706] bg-[#d97706]/10 border-b-2 border-[#d97706]'
                        : 'text-[#d97706]/70 hover:text-[#d97706] hover:bg-[#d97706]/5'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Menu / Auth Buttons */}
          {showAuth && (
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#18181b] border border-white/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-white/60" />
                    </div>
                    <span className="hidden sm:inline text-sm">
                      {user.username}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-[#18181b] border border-white/10 shadow-xl z-50">
                        <div className="p-3 border-b border-white/10">
                          <p className="text-sm font-medium text-white">{user.username}</p>
                          <p className="text-xs text-white/50 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => { navigate('/dashboard'); setUserMenuOpen(false) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </button>
                          <button
                            onClick={() => { navigate('/my-teams'); setUserMenuOpen(false) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Trophy className="w-4 h-4" />
                            My Teams
                          </button>
                        </div>
                        <div className="border-t border-white/10 py-1">
                          <button
                            onClick={() => { handleLogout(); setUserMenuOpen(false) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Log out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-4 py-2 text-sm bg-[#b91c1c] hover:bg-[#991b1b] text-white font-broadcast tracking-wide transition-colors"
                  >
                    GET STARTED
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#18181b] border-t border-white/10">
          <nav className="p-4 space-y-1">
            {navLinks.map((link) => {
              if (link.requiresAuth && !user) return null
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive(link.href)
                      ? 'text-white bg-white/10 border-l-2 border-[#b91c1c]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}

            {user && isRegistrationOpen && (
              <Link
                to="/create-team"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive('/create-team')
                    ? 'text-white bg-white/10 border-l-2 border-[#b91c1c]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Create Team
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'text-[#d97706] bg-[#d97706]/10 border-l-2 border-[#d97706]'
                    : 'text-[#d97706]/70 hover:text-[#d97706] hover:bg-[#d97706]/5'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
