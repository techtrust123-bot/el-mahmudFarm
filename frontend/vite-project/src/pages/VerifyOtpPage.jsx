import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';
import { toast } from 'react-hot-toast';
import axiosInstance from '../utils/axiosInstance.js'

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const { userData, getUserData } = useAuth();
  const [otp, setOtp] = useState('');
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) {
      setTimerActive(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          setAlert({
            type: 'error',
            message: 'OTP has expired. Please request a new one.',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeRemaining]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error({message: 'Please enter the OTP code.' });
      return;
    }

    if (otp.length !== 6) {
      toast.error({message: 'OTP must be 6 digits.' });
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const response = await authService.verifyOTP(otp);

      if (response?.success) {
        await getUserData(true);
        setIsVerified(true);
        toast.success( response?.message || 'Account verified successfully.');
        navigate('/dashboard')

        // setTimeout(() => {
        //   navigate('/dashboard');
        // }, 10000);
      } else {
        setAlert({ type: 'error', message: response?.message || 'OTP verification failed.' });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error?.message || 'Unable to verify OTP. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setAlert(null);

    try {
      const response = await axiosInstance.post('/api/auth/resend-otp');

      if (response?.success) {
        setAlert({ type: 'success', message: 'A new OTP has been sent to your email.' });
        setOtp('');
        setTimeRemaining(600);
        setTimerActive(true);
      } else {
        setAlert({ type: 'error', message: response?.message || 'Failed to resend OTP.' });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error?.message || 'Unable to resend OTP right now.',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-4">
        <Card className="w-full max-w-md">
          <div className="text-center py-10">
            <img src={cloudFarmLogo} alt="CloudFarm logo" className="mx-auto mb-5 h-16 w-16 rounded-xl object-contain bg-emerald-50 p-2 shadow-sm" />
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Verified</h2>
            <p className="text-slate-600 mb-6">Your account has been verified successfully. Redirecting to your dashboard...</p>
            <Button variant="primary" fullWidth onClick={() => navigate('/dashboard')}>
              Continue to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={cloudFarmLogo} alt="CloudFarm logo" className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain bg-emerald-50 p-2 shadow-sm" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verify Your Account</h1>
          <p className="text-slate-600 text-sm">
            Enter the 6-digit code sent to <span className="font-semibold">{userData?.email || 'your email'}</span>
          </p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
          </div>
        )}

        <div className={`mb-6 p-4 rounded-xl text-center font-mono text-lg font-semibold ${
          timeRemaining < 120 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <div className="text-xs uppercase tracking-[0.2em] mb-1 opacity-75">OTP expires in</div>
          <div className="text-2xl">{formatTime(timeRemaining)}</div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="OTP Code"
            type="text"
            name="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            fullWidth
            disabled={isLoading}
          />

          <Button type="submit" variant="primary" fullWidth disabled={isLoading || !timerActive}>
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
            disabled={isResending || isLoading || timerActive}
          >
            {isResending ? 'Resending...' : timerActive ? `Resend OTP in ${formatTime(timeRemaining)}` : 'Resend OTP'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default VerifyOtpPage;
