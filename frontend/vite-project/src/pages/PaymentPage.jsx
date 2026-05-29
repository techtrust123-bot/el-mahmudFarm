import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'

const PaymentPage = () => {
  const { axiosInstance, userData } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axiosInstance.get('/api/payment/status')
        if (response.data.success && response.data.data.isSubscribed) {
          navigate('/dashboard')
        }
      } catch (error) {
        console.log('Subscription status check failed', error)
      }
    }
    checkStatus()
  }, [])

  const handlePayment = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.post('/api/payment/initialize')
      if (response.data.success) {
        window.location.href = response.data.data.authorizationUrl
      } else {
        setStatus({ type: 'error', message: response.data.message || 'Payment initialization failed' })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Unable to start payment. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">CloudFarm Subscription</h1>
          <p className="mt-2 text-slate-500">Pay to activate your farm dashboard access.</p>
          {userData?.farmName && <p className="mt-2 text-slate-500">Farm: {userData.farmName}</p>}
        </div>

        {status && (
          <Alert
            type={status.type}
            message={status.message}
            closeable
            onClose={() => setStatus(null)}
          />
        )}

        <div className="grid gap-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Monthly subscription</p>
            <p className="text-5xl font-semibold text-slate-900 mt-4">₦5,000</p>
            <p className="mt-2 text-slate-500">Billed every 30 days. Full farm access.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Unlimited animals</p>
              <p className="mt-2 text-sm text-slate-500">Track poultry, livestock, feed and sales.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Reports & finance</p>
              <p className="mt-2 text-sm text-slate-500">Access dashboard analytics and expenses.</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full"
          variant="primary"
        >
          {loading ? 'Redirecting to Paystack...' : 'Pay with Paystack'}
        </Button>

        <p className="mt-6 text-center text-sm text-slate-500">
          After payment you will be redirected back to complete activation.
        </p>
      </Card>
    </div>
  )
}

export default PaymentPage
