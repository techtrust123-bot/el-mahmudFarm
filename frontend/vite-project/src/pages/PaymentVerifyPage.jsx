import { useEffect, useState, useContext, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import paymentService from '../services/paymentService'

const PaymentVerifyPage = () => {
  const [searchParams] = useSearchParams()
  const { getUserData, setUserData } = useContext(AuthContext)
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('Please wait while we confirm your subscription.')
  const navigate = useNavigate()
  const verificationStarted = useRef(false)
  const redirectTimer = useRef(null)

  useEffect(() => {
    const reference = searchParams.get('reference')
    if (!reference) {
      setStatus('failed')
      setMessage('Payment reference is missing.')
      return
    }

    if (verificationStarted.current) return
    verificationStarted.current = true

    const verify = async () => {
      try {
        const response = await paymentService.verifyPayment(reference)

        if (!response?.success) {
          setStatus('failed')
          setMessage(response?.message || 'Payment verification failed.')
          return
        }

        const verifiedSubscription = response.data || {}
        setUserData((currentUser) => currentUser ? {
          ...currentUser,
          isSubscribed: true,
          subscriptionStatus: verifiedSubscription.subscriptionStatus || 'active',
          subscriptionType: verifiedSubscription.subscriptionType || 'paid',
          subscriptionPlan: verifiedSubscription.subscriptionPlan || currentUser.subscriptionPlan,
          billingCycle: verifiedSubscription.billingCycle || verifiedSubscription.subscriptionBillingCycle || currentUser.billingCycle,
          subscriptionStart: verifiedSubscription.subscriptionStart || currentUser.subscriptionStart,
          subscriptionEnd: verifiedSubscription.subscriptionEnd || currentUser.subscriptionEnd,
        } : currentUser)
        await getUserData(true)
        setStatus('success')
        setMessage(response.message || 'Your subscription is now active.')
        redirectTimer.current = window.setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
      } catch (error) {
        console.error('Payment verification error:', error)
        setStatus('failed')
        setMessage(
          error.response?.data?.message ||
          error.message ||
          'Payment verification is temporarily unavailable. Please try again.'
        )
      }
    }

    verify()

    return () => {
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current)
      }
    }
  }, [getUserData, navigate, searchParams])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-slate-900">Verifying payment…</h2>
            <p className="mt-3 text-slate-500">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl text-emerald-600 mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900">Payment successful!</h2>
            <p className="mt-3 text-slate-500">{message}</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="text-6xl text-red-600 mb-4">❌</div>
            <h2 className="text-2xl font-bold text-slate-900">Payment verification failed</h2>
            <p className="mt-3 text-slate-500">{message}</p>
            <Button onClick={() => navigate('/subscription')} variant="primary" className="mt-6">
              Back to Subscription
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default PaymentVerifyPage
