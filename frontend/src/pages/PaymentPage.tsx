/**
 * PaymentPage
 * Team payment page with Stripe Checkout integration
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { teamsApi, paymentsApi, Team } from '../services/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, CreditCard, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

const ENTRY_FEE = 100 // $100.00

export default function PaymentPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canceled = searchParams.get('canceled')

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

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

  // Handle payment
  const handlePayment = async () => {
    if (!teamId || !team) return

    try {
      setProcessing(true)
      setError('')

      const response = await paymentsApi.createCheckout(teamId)

      if (response.success && response.data?.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkoutUrl
      } else {
        setError(response.error?.message || 'Failed to create checkout session')
        setProcessing(false)
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading team...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:text-white/80 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold text-white mb-2">Team Payment</h1>
          <p className="text-slate-300 text-lg">
            Complete your payment to enter the 2026 Home Run Derby contest
          </p>
        </div>

        {/* Cancellation Alert */}
        {canceled && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Payment was canceled. You can try again below.
            </AlertDescription>
          </Alert>
        )}

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
              <span className="text-sm text-muted-foreground">2025 Season HR Total</span>
              <span className="font-medium">{team.totalHrs2024} HRs</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm text-muted-foreground">Payment Status</span>
              <span className="font-medium capitalize">{team.paymentStatus}</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-slate-50 dark:bg-slate-900 rounded-lg px-4">
              <span className="font-semibold text-lg">Entry Fee</span>
              <span className="font-bold text-2xl">${ENTRY_FEE.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={processing || team.paymentStatus === 'paid'}
          size="lg"
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Redirecting to Payment...
            </>
          ) : team.paymentStatus === 'paid' ? (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Already Paid
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              Pay ${ENTRY_FEE.toFixed(2)} with Stripe
            </>
          )}
        </Button>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-slate-400">
          <p>Secure payment powered by Stripe</p>
          <p className="mt-2">
            After payment, your team will be entered into the contest
          </p>
        </div>
      </div>
    </div>
  )
}
