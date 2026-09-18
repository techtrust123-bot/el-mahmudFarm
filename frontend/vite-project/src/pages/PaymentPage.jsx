import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import { subscriptionPlans, billingCycleOptions, formatCurrency } from '../data/subscriptionPlans'
import paymentService from '../services/paymentService'
import cloudFarmLogo from '../assets/CloudFarm_logo.png'

const PaymentPage = () => {
  const { userData, getUserData } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [selectedPlanKey, setSelectedPlanKey] = useState('basic')
  const navigate = useNavigate()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await paymentService.getStatus()
        if (response?.success && response?.data?.isSubscribed) {
          navigate('/dashboard')
        }
      } catch (error) {
        console.log('Subscription status check failed', error)
      }
    }
    checkStatus()
  }, [navigate])

  const selectedPlan = subscriptionPlans.find((plan) => plan.key === selectedPlanKey) || subscriptionPlans[0]
  const selectedPrice = billingCycle === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice

  const handlePayment = async () => {
    setLoading(true)
    setStatus(null)

    try {
      const response = await paymentService.initializePayment({
        plan: selectedPlanKey,
        billingCycle,
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Payment initialization failed')
      }

      if (!response.data?.authorizationUrl) {
        throw new Error('Payment authorization URL is missing.')
      }

      window.location.href = response.data.authorizationUrl
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Unable to start payment. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-5xl w-full shadow-xl p-8">
        <div className="text-center mb-8">
          <img src={cloudFarmLogo} alt="CloudFarm logo" className="mx-auto mb-4 h-16 w-16 rounded-xl object-contain bg-emerald-50 p-2 shadow-sm" />
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

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
            {billingCycleOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setBillingCycle(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  billingCycle === option.key
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {subscriptionPlans.map((plan) => {
            const isSelected = plan.key === selectedPlanKey
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice

            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlanKey(plan.key)}
                className={`rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{plan.name}</p>
                    {plan.recommended && (
                      <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        isSelected ? 'bg-white/15 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        Recommended
                      </span>
                    )}
                  </div>
                </div>

                <p className={`mt-6 text-4xl font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(price)}
                </p>
                <p className={`mt-2 text-sm ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                  Billed {billingCycle === 'yearly' ? 'annually' : 'monthly'}
                </p>

                <ul className={`mt-5 space-y-3 text-sm ${isSelected ? 'text-slate-100' : 'text-slate-600'}`}>
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Selected plan</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{selectedPlan.name}</h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(selectedPrice)}</p>
            <p className="text-sm text-slate-500">{billingCycle === 'yearly' ? 'per year' : 'per month'}</p>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full"
          variant="primary"
        >
          {loading ? 'Redirecting to Paystack...' : `Pay ${formatCurrency(selectedPrice)} with Paystack`}
        </Button>

        <p className="mt-6 text-center text-sm text-slate-500">
          After payment you will be redirected back to complete activation.
        </p>
      </Card>
    </div>
  )
}

export default PaymentPage
