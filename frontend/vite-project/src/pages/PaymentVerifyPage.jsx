import { useEffect, useState, useContext } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const PaymentVerifyPage = () => {
  const [searchParams] = useSearchParams()
  const { axiosInstance } = useContext(AuthContext)
  const [status, setStatus] = useState('verifying')
  const navigate = useNavigate()

  useEffect(() => {
    const reference = searchParams.get('reference')
    if (!reference) {
      setStatus('failed')
      return
    }

    const verify = async () => {
      try {
        const response = await axiosInstance.get(`/api/payment/verify/${reference}`)
        if (response.data.success) {
          setStatus('success')
          setTimeout(() => navigate('/dashboard'), 3000)
        } else {
          setStatus('failed')
        }
      } catch (error) {
        setStatus('failed')
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-slate-900">Verifying payment…</h2>
            <p className="mt-3 text-slate-500">Please wait while we confirm your subscription.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl text-emerald-600 mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900">Payment successful!</h2>
            <p className="mt-3 text-slate-500">Your subscription is now active. Redirecting to dashboard...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="text-6xl text-red-600 mb-4">❌</div>
            <h2 className="text-2xl font-bold text-slate-900">Payment verification failed</h2>
            <p className="mt-3 text-slate-500">Please try again or contact support.</p>
            <Button onClick={() => navigate('/payment')} variant="primary" className="mt-6">
              Back to Payment
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default PaymentVerifyPage
