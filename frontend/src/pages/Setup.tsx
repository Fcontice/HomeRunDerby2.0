/**
 * Setup Page
 * Contains payment instructions, rules, and regional contact information
 * Minimal design - content focused, less chrome
 */

import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { useSeason } from '../contexts/SeasonContext'
import {
  Phone,
  MapPin,
  ChevronRight,
  Clock,
  Users,
  CalendarCheck,
  Trophy,
  Banknote,
} from 'lucide-react'

const REGIONAL_CONTACTS = [
  { letter: 'A', region: 'Online/World-Wide', name: 'KURLY', phone: '347-560-9837' },
  { letter: 'B', region: 'NYC/Queens', name: 'MIKE', phone: '914-447-5445' },
  { letter: 'C', region: 'New Jersey/Rockland', name: 'JACK', phone: '845-825-2537' },
  { letter: 'D', region: 'New Jersey/Rockland', name: 'MARK', phone: '845-608-5191' },
  { letter: 'E', region: 'Connecticut/Westchester', name: 'BOBBY', phone: '914-882-8176' },
  { letter: 'F', region: 'Bronx/Westchester', name: 'MIKE R.', phone: '914-912-3010' },
  { letter: 'G', region: 'Dutchess County', name: 'BIG MARK', phone: '914-475-1658' },
  { letter: 'H', region: 'Queens/Brooklyn/Staten Island', name: 'KURLY', phone: '347-560-9837' },
  { letter: 'I', region: 'Philadelphia/Delaware/Maryland', name: 'TONY', phone: '914-384-4718' },
]

const CONTEST_YEAR = 2026
const ANNIVERSARY_YEAR = 30
const ENTRY_FEE = 100

export default function Setup() {
  const { season } = useSeason()

  const seasonYear = season?.seasonYear || CONTEST_YEAR
  const registrationDeadline = season?.registrationCloseDate
    ? new Date(season.registrationCloseDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBD'

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <Navbar />

      {/* Compact Header */}
      <header className="bg-gradient-to-r from-[#b91c1c] to-[#991b1b]">
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="font-broadcast text-2xl md:text-4xl text-white tracking-wider mb-1">
            HOMERUNDERBY {seasonYear}
          </h1>
          <p className="text-white/80 text-sm">{ANNIVERSARY_YEAR}th Year Anniversary • Best 7 of 8 Pool</p>
        </div>
      </header>

      {/* Deadline Banner - Slim */}
      <div className="bg-[#0c0c0c] border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-[#fbbf24]" />
          <span className="text-gray-400 text-sm">Deadline:</span>
          <span className="text-white font-medium">{registrationDeadline}</span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 max-w-5xl">

        {/* How to Play - Clean Steps */}
        <section className="mb-12">
          <h2 className="font-broadcast text-lg text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-[#b91c1c]"></span>
            HOW TO PLAY
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-4">
              <span className="text-[#b91c1c] font-broadcast text-lg">01</span>
              <div>
                <p className="text-white font-medium">Pay ${ENTRY_FEE} per team</p>
                <p className="text-gray-500 text-sm">Cash only, no checks</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[#b91c1c] font-broadcast text-lg">02</span>
              <div>
                <p className="text-white font-medium">Pick 8 players</p>
                <p className="text-gray-500 text-sm">Only your top 7 count toward score</p>
                <Link
                  to="/players"
                  className="text-[#d97706] hover:text-[#f59e0b] text-sm inline-flex items-center gap-1 mt-1"
                >
                  Browse players <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[#b91c1c] font-broadcast text-lg">03</span>
              <div>
                <p className="text-white font-medium">Stay under 172 HR cap</p>
                <p className="text-gray-500 text-sm">Combined previous season HRs</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[#b91c1c] font-broadcast text-lg">04</span>
              <div>
                <p className="text-white font-medium">Submit online & print</p>
                <Link
                  to="/create-team"
                  className="text-[#d97706] hover:text-[#f59e0b] text-sm inline-flex items-center gap-1 mt-1"
                >
                  Create your team <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[#b91c1c] font-broadcast text-lg">05</span>
              <div>
                <p className="text-white font-medium">Contact a regional agent</p>
                <p className="text-gray-500 text-sm">For pickup & payment</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-[#b91c1c] font-broadcast text-lg">06</span>
              <div>
                <p className="text-white font-medium">No limit on entries</p>
                <p className="text-gray-500 text-sm">Enter as many teams as you want</p>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-white/10 mb-12"></div>

        {/* Rules & Payouts - Side by Side, Minimal */}
        <div className="grid gap-12 lg:grid-cols-2 mb-12">

          {/* Rules */}
          <section>
            <h2 className="font-broadcast text-lg text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#d97706]"></span>
              RULES
            </h2>
            <ul className="space-y-3 text-gray-400">
              <li className="flex gap-2">
                <span className="text-[#d97706]">•</span>
                <span><strong className="text-white">No injury moves</strong> — stuck with your picks all season</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d97706]">•</span>
                <span>Rosters posted within 3 days of season start</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d97706]">•</span>
                <span>October HRs count toward September totals</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d97706]">•</span>
                <span>Player on IL? Still on your team</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d97706]">•</span>
                <span>All play-in games count</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d97706]">•</span>
                <span>Japan series HRs included</span>
              </li>
            </ul>
          </section>

          {/* Payouts */}
          <section>
            <h2 className="font-broadcast text-lg text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-500"></span>
              PAYOUTS
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Monthly</p>
                  <p className="text-gray-500 text-sm">Top 4 teams each month</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">All-Star Break</p>
                  <p className="text-gray-500 text-sm">Top 3 teams at midseason</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">End of Season</p>
                  <p className="text-gray-500 text-sm">Top 15 teams overall</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Banknote className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Ties split evenly</p>
                  <p className="text-gray-500 text-sm">No tiebreakers</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-xs mt-4">
              * Prize amounts scale with total entries
            </p>
          </section>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-12"></div>

        {/* Regional Contacts - Compact Grid */}
        <section>
          <h2 className="font-broadcast text-lg text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500"></span>
            REGIONAL CONTACTS
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Find an agent near you to submit your team and payment.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REGIONAL_CONTACTS.map((contact) => (
              <div
                key={contact.letter}
                className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {contact.region}
                  </p>
                </div>
                <a
                  href={`tel:${contact.phone.replace(/-/g, '')}`}
                  aria-label={`Call ${contact.name} at ${contact.phone}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-mono"
                >
                  <Phone className="w-3 h-3" />
                  {contact.phone}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Important Note - Subtle */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-600 text-sm text-center">
            All teams must be picked up by a regional contact. Payment due before deadline.
          </p>
        </div>
      </main>
    </div>
  )
}
