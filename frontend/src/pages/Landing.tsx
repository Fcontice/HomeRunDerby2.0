import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'

// ============================================================================
// LANDING PAGE - Modern Broadcast Design
// ESPN-inspired sports broadcast aesthetic with bold typography,
// dynamic angles, and high-energy visual treatment
// ============================================================================

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white font-broadcast-body overflow-x-hidden">
      {/* ================================================================
          HERO SECTION
          Full viewport, bold typography, diagonal accents
          ================================================================ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background layers */}
        <div className="absolute inset-0">
          {/* Dark gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c0c] via-[#111111] to-[#0c0c0c]" />

          {/* Subtle ambient glow */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#991b1b]/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#92400e]/6 rounded-full blur-[150px]" />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />

          {/* Diagonal accent stripe - more subtle */}
          <div
            className="absolute top-0 right-0 w-[40%] h-full bg-[#991b1b]/5"
            style={{
              clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)'
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto">
            {/* Live badge */}
            <div
              className={`inline-flex items-center gap-2 mb-8 opacity-0 ${isVisible ? 'animate-slide-left' : ''}`}
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b91c1c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#b91c1c]"></span>
              </span>
              <span className="text-[#b91c1c] font-broadcast text-lg tracking-wider">
                2025 SEASON NOW OPEN
              </span>
            </div>

            {/* Main headline */}
            <h1
              className={`font-broadcast text-[clamp(4rem,15vw,12rem)] leading-[0.85] tracking-tight mb-6 opacity-0 ${isVisible ? 'animate-slide-up' : ''}`}
            >
              <span className="block text-white">DRAFT.</span>
              <span className="block text-white">COMPETE.</span>
              <span className="block bg-gradient-to-r from-[#b91c1c] to-[#c2410c] bg-clip-text text-transparent">WIN.</span>
            </h1>

            {/* Subheadline */}
            <p
              className={`text-xl md:text-2xl text-gray-400 max-w-2xl mb-10 leading-relaxed opacity-0 ${isVisible ? 'animate-slide-up delay-200' : ''}`}
            >
              Build your 8-player roster. Track every home run.
              Dominate the leaderboard all season long.
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 opacity-0 ${isVisible ? 'animate-slide-up delay-300' : ''}`}
            >
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="bg-[#b91c1c] hover:bg-[#ff4066] text-white font-broadcast text-xl px-10 py-7 rounded-none relative overflow-hidden group"
                  >
                    <span className="relative z-10">GO TO DASHBOARD</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="bg-[#b91c1c] hover:bg-[#ff4066] text-white font-broadcast text-xl px-10 py-7 rounded-none relative overflow-hidden group"
                    >
                      <span className="relative z-10">JOIN NOW</span>
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                    </Button>
                  </Link>
                  <Link to="/leaderboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white/30 hover:border-white/60 text-white font-broadcast text-xl px-10 py-7 rounded-none bg-transparent hover:bg-white/5"
                    >
                      VIEW LEADERBOARD
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hero stats bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-8">
          <div className="container mx-auto px-6">
            <div
              className={`grid grid-cols-2 md:grid-cols-4 gap-8 opacity-0 ${isVisible ? 'animate-slide-up delay-500' : ''}`}
            >
              <StatBox label="ACTIVE TEAMS" value="500+" />
              <StatBox label="HOME RUNS TRACKED" value="12,847" />
              <StatBox label="HR SALARY CAP" value="172" />
              <StatBox label="PLAYERS AVAILABLE" value="300+" />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ================================================================
          LIVE TICKER
          Scrolling stats banner - subtle treatment
          ================================================================ */}
      <section className="relative bg-[#18181b] border-y border-white/10 py-3 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6">
              <TickerItem text="2025 Season Now Open" />
              <TickerItem text="Track Every Home Run All Season" />
              <TickerItem text="Draft 8 Players • Best 7 Count" />
              <TickerItem text="172 HR Salary Cap Challenge" />
              <TickerItem text="Compete for Monthly & Season Titles" />
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS
          3-step process with broadcast-style graphics
          ================================================================ */}
      <section className="relative py-32 overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#b91c1c]/5 to-transparent" />

        <div className="container mx-auto px-6">
          {/* Section header */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-1 bg-[#b91c1c]" />
              <span className="text-[#b91c1c] font-broadcast text-lg tracking-wider">THE GAME PLAN</span>
            </div>
            <h2 className="font-broadcast text-5xl md:text-7xl text-white">
              HOW IT WORKS
            </h2>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              title="DRAFT YOUR SQUAD"
              description="Select 8 MLB players within the 172 HR salary cap. Study the stats, trust your instincts, and build a championship roster."
              accent="from-[#b91c1c] to-[#c2410c]"
            />
            <StepCard
              number="02"
              title="TRACK EVERY BOMB"
              description="Watch your team climb the leaderboard as your players crush home runs throughout the season. Best 7 of 8 players count."
              accent="from-[#c2410c] to-[#d97706]"
            />
            <StepCard
              number="03"
              title="CLAIM YOUR GLORY"
              description="Top the leaderboard and prove you've got the best eye for talent. Monthly and season-long competitions keep things exciting."
              accent="from-[#d97706] to-[#b91c1c]"
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          SALARY CAP EXPLAINER
          Visual breakdown of the draft mechanics
          ================================================================ */}
      <section className="relative py-32 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-1 bg-[#b91c1c]" />
                <span className="text-[#b91c1c] font-broadcast text-lg tracking-wider">DRAFT STRATEGY</span>
              </div>
              <h2 className="font-broadcast text-5xl md:text-6xl text-white mb-6">
                THE 172 HR<br />SALARY CAP
              </h2>
              <p className="text-gray-400 text-xl leading-relaxed mb-8">
                Every player costs their previous season's home run total.
                Draft 8 players whose combined HRs don't exceed 172.
                Balance proven sluggers with breakout candidates.
              </p>

              <div className="space-y-4">
                <CapRule icon="8" text="8 players per roster" />
                <CapRule icon="172" text="Maximum combined previous-year HRs" />
                <CapRule icon="7" text="Best 7 players count toward your score" />
              </div>
            </div>

            {/* Right: Visual example */}
            <div className="relative">
              <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-broadcast text-2xl text-white">SAMPLE ROSTER</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 font-broadcast text-sm">
                    VALID BUILD
                  </span>
                </div>

                <div className="space-y-3">
                  <RosterRow player="Pete Alonso" hrs="34" />
                  <RosterRow player="Matt Olson" hrs="27" />
                  <RosterRow player="Anthony Santander" hrs="24" />
                  <RosterRow player="Gunnar Henderson" hrs="20" />
                  <RosterRow player="Brent Rooker" hrs="18" />
                  <RosterRow player="Cody Bellinger" hrs="18" />
                  <RosterRow player="Jazz Chisholm Jr." hrs="17" />
                  <RosterRow player="Christian Walker" hrs="14" />
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-gray-400 font-broadcast">TOTAL CAP USED</span>
                  <span className="font-broadcast text-4xl text-[#d97706]">172</span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-2 border-[#b91c1c]/30 -z-10" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[#b91c1c]/10 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FINAL CTA
          Clean, focused ending
          ================================================================ */}
      <section className="relative py-32 overflow-hidden bg-[#18181b]">
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#b91c1c]/10 via-transparent to-[#d97706]/10" />

        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="font-broadcast text-4xl md:text-6xl text-white mb-6">
            READY TO COMPETE?
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mb-10">
            Build your roster. Track your players. Climb the leaderboard.
          </p>

          {isAuthenticated ? (
            <Link to="/create-team">
              <Button
                size="lg"
                className="bg-[#b91c1c] hover:bg-[#991b1b] text-white font-broadcast text-xl px-10 py-6 rounded-none"
              >
                CREATE YOUR TEAM
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button
                size="lg"
                className="bg-[#b91c1c] hover:bg-[#991b1b] text-white font-broadcast text-xl px-10 py-6 rounded-none"
              >
                REGISTER NOW
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* ================================================================
          FOOTER
          Simple, broadcast-style footer
          ================================================================ */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="font-broadcast text-2xl text-white">
              HR DERBY <span className="text-[#b91c1c]">2.0</span>
            </div>
            <div className="flex items-center gap-8 text-gray-500 text-sm">
              <Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
              <Link to="/players" className="hover:text-white transition-colors">Players</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
            <div className="text-gray-600 text-sm">
              © 2025 Home Run Derby 2.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-broadcast text-4xl md:text-5xl text-white mb-1">{value}</div>
      <div className="text-gray-500 text-sm tracking-wider">{label}</div>
    </div>
  )
}

function TickerItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-400 font-medium text-sm">
      <span>{text}</span>
      <span className="text-white/20">•</span>
    </div>
  )
}

function StepCard({
  number,
  title,
  description,
  accent
}: {
  number: string
  title: string
  description: string
  accent: string
}) {
  return (
    <div className="group relative">
      {/* Background card */}
      <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-8 h-full transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/5">
        {/* Number */}
        <div className={`inline-block font-broadcast text-7xl bg-gradient-to-r ${accent} bg-clip-text text-transparent mb-6`}>
          {number}
        </div>

        {/* Title */}
        <h3 className="font-broadcast text-2xl text-white mb-4">{title}</h3>

        {/* Description */}
        <p className="text-gray-400 leading-relaxed">{description}</p>
      </div>

      {/* Hover accent */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${accent} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
    </div>
  )
}

function CapRule({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-[#b91c1c]/10 border border-[#b91c1c]/30 flex items-center justify-center">
        <span className="font-broadcast text-2xl text-[#b91c1c]">{icon}</span>
      </div>
      <span className="text-white text-lg">{text}</span>
    </div>
  )
}

function RosterRow({ player, hrs }: { player: string; hrs: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-white">{player}</span>
      <span className="font-broadcast text-xl text-[#b91c1c]">{hrs} HR</span>
    </div>
  )
}
