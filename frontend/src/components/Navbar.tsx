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
  Plus,
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
  const isSeasonActive = season?.phase === 'active'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
    { href: '/setup', label: 'How to Play', icon: BookOpen, requiresAuth: true },
    { href: '/prizes', label: 'Prizes', icon: Award, requiresAuth: true },
    { href: '/players', label: 'Players', icon: Users, requiresAuth: false },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, requiresAuth: false },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-base/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-brand-red flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="font-broadcast text-xl text-white tracking-wide">
                HR DERBY
              </span>
              <span className="diamond-accent" />
              <span className="font-broadcast text-xl text-accent-amber tracking-wide">
                2.0
              </span>
              {/* LIVE badge during active season */}
              {isSeasonActive && (
                <span className="broadcast-live-badge px-1.5 py-0.5 text-[10px] font-bold text-white tracking-wider ml-1.5 animate-live-pulse">
                  LIVE
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              if (link.requiresAuth && !user) return null
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {/* Bold active indicator */}
                  {isActive(link.href) && (
                    <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-brand-red" />
                  )}
                </Link>
              )
            })}

            {user && (
              <>
                {isRegistrationOpen ? (
                  <Link
                    to="/create-team"
                    className="flex items-center gap-2 px-4 py-1.5 ml-2 bg-brand-red hover:bg-brand-red-dark text-white text-sm font-broadcast tracking-wide transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    CREATE TEAM
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 text-sm text-white/30 cursor-not-allowed ml-2">
                    Create Team
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/40">
                      CLOSED
                    </span>
                  </span>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'text-accent-amber'
                        : 'text-accent-amber/70 hover:text-accent-amber hover:bg-accent-amber/5'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                    {location.pathname.startsWith('/admin') && (
                      <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-accent-amber" />
                    )}
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
                    <div className="w-8 h-8 bg-surface-card border border-border flex items-center justify-center">
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
                      <div className="absolute right-0 top-full mt-1 w-56 bg-surface-card border border-border shadow-xl z-50">
                        <div className="p-3 border-b border-border">
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
                        <div className="border-t border-border py-1">
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
                    className="px-4 py-2 text-sm bg-brand-red hover:bg-brand-red-dark text-white font-broadcast tracking-wide transition-colors"
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
        <div className="md:hidden bg-surface-card border-t border-border">
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
                      ? 'text-white bg-white/10 border-l-4 border-brand-red'
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
                className="flex items-center gap-3 px-4 py-3 text-sm bg-brand-red/10 text-white border-l-4 border-brand-red font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Team
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'text-accent-amber bg-accent-amber/10 border-l-4 border-accent-amber'
                    : 'text-accent-amber/70 hover:text-accent-amber hover:bg-accent-amber/5'
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
