/**
 * PaymentPage
 * Manual payment instructions page for team entry fee
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { teamsApi, Team } from '../services/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, DollarSign, CheckCircle, XCircle, ArrowLeft, Copy, Check, Clock, Users } from 'lucide-react'

const ENTRY_FEE = 100 // $100.00

// Payment options configuration
const PAYMENT_OPTIONS = [
  { name: 'Venmo', handle: '@YourVenmoHandle', copyable: true },
  { name: 'Zelle', handle: 'your-email@example.com', copyable: true },
  { name: 'In-Person', handle: 'Contact admin to arrange cash pickup', copyable: false },
]

export default function PaymentPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Fetch team data
  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) {
        setError('Team ID is missing')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await teamsApi.getTeam(teamId)

        if (response.success && response.data) {
          setTeam(response.data)

          // If already paid, redirect to dashboard
          if (response.data.paymentStatus === 'paid') {
            navigate('/dashboard?payment=already_paid')
          }
        } else {
          setError(response.error?.message || 'Failed to load team')
        }
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to load team')
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
  }, [teamId, navigate])

  // Copy to clipboard handler
  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-lg">Loading team...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Team Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Team not found'}</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pending payment state
  if (team.paymentStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Clock className="h-5 w-5" />
                Payment Pending Verification
              </CardTitle>
              <CardDescription>Team: {team.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-500/10 border-amber-500/50">
                <Clock className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-200">
                  Your payment is being verified by an admin. This typically takes up to 24 hours.
                  You'll be notified once your team is approved.
                </AlertDescription>
              </Alert>

              <p className="text-muted-foreground">
                If you haven't sent payment yet, please use one of the payment methods below and include your <strong>team name, email, and phone number</strong> in the payment memo.
              </p>

              {/* Payment Options */}
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((option, index) => (
                  <div
                    key={option.name}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{option.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{option.handle}</p>
                    </div>
                    {option.copyable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(option.handle, index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-up">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-2">Payment Instructions</h1>
          <p className="text-muted-foreground text-lg">
            Complete your payment to enter the {team.seasonYear} Home Run Derby contest
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Team Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Team: {team.name}</CardTitle>
            <CardDescription>Entry Fee Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm text-muted-foreground">Season</span>
              <span className="font-medium">{team.seasonYear}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm text-muted-foreground">Players</span>
              <span className="font-medium">8 Players</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm text-muted-foreground">{team.seasonYear - 1} Season HR Total</span>
              <span className="font-medium">{team.totalHrs2024} HRs</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm text-muted-foreground">Payment Status</span>
              <span className="font-medium capitalize">{team.paymentStatus}</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-slate-800/50 border border-slate-700 rounded-lg px-4">
              <span className="font-semibold text-lg text-foreground">Entry Fee</span>
              <span className="font-bold text-2xl stat-gold">${ENTRY_FEE.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Options Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Options
            </CardTitle>
            <CardDescription>
              Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PAYMENT_OPTIONS.map((option, index) => (
              <div
                key={option.name}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div>
                  <p className="font-semibold text-lg text-foreground">{option.name}</p>
                  <p className="text-muted-foreground font-mono">{option.handle}</p>
                </div>
                {option.copyable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(option.handle, index)}
                    className="shrink-0"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Important Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                  1
                </div>
                <p>
                  Send <strong className="text-foreground">${ENTRY_FEE.toFixed(2)}</strong> using one of the payment methods above.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                  2
                </div>
                <p>
                  Include your <strong className="text-foreground">team name, email, and phone number</strong> in the payment memo/note.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                  3
                </div>
                <p>
                  An admin will verify your payment and mark your team as paid within <strong className="text-foreground">24 hours</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                  4
                </div>
                <p>
                  You'll receive a confirmation email once your team is officially entered.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Already Paid or Status Info */}
        {team.paymentStatus === 'paid' ? (
          <Alert className="bg-emerald-500/10 border-emerald-500/50">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-emerald-200">
              Your payment has been received and your team is entered!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>Questions about payment? Contact the admin.</p>
            <p className="mt-2">
              After sending payment, your team will be reviewed and entered within 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
