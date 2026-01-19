import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { User, LogOut, Settings } from 'lucide-react'

interface NavbarProps {
  showAuth?: boolean
}

export function Navbar({ showAuth = true }: NavbarProps) {
  const { user, logout } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()
  const location = useLocation()

  const isRegistrationOpen = season?.phase === 'registration'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
    { href: '/players', label: 'Players', requiresAuth: false },
    { href: '/leaderboard', label: 'Leaderboard', requiresAuth: false },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Home Run Derby
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.requiresAuth && !user) return null
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'text-foreground bg-slate-800'
                      : 'text-muted-foreground hover:text-foreground hover:bg-slate-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}

            {user && (
              <>
                {isRegistrationOpen ? (
                  <Link
                    to="/create-team"
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive('/create-team')
                        ? 'text-foreground bg-slate-800'
                        : 'text-muted-foreground hover:text-foreground hover:bg-slate-800/50'
                    }`}
                  >
                    Create Team
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 cursor-not-allowed">
                    Create Team
                    <Badge variant="secondary" className="text-xs">
                      Closed
                    </Badge>
                  </span>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'text-gold bg-slate-800'
                        : 'text-gold/80 hover:text-gold hover:bg-slate-800/50'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Menu */}
          {showAuth && (
            <div className="flex items-center gap-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-3"
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium">
                        {user.username}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => navigate('/login')}>
                    Sign in
                  </Button>
                  <Button onClick={() => navigate('/register')}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
