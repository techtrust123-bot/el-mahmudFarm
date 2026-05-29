import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import axios from 'axios';
import { AiOutlineLock, AiOutlineCheckCircle, AiOutlineReload } from 'react-icons/ai';
import { BiErrorCircle } from 'react-icons/bi';

function ResetOtp() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AuthContext);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Timer state (10 minutes = 600 seconds)
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [timerActive, setTimerActive] = useState(true);

  // Timer effect
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

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Password validation rules
  const passwordRules = {
    minLength: formData.newPassword.length >= 8,
    hasLowercase: /[a-z]/.test(formData.newPassword),
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
    hasSpecial: /[@$!%*?&]/.test(formData.newPassword),
  };

  const allPasswordRulesMet =
    Object.values(passwordRules).every((rule) => rule === true);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.email) {
      setAlert({ type: 'error', message: 'Email is required' });
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setAlert({ type: 'error', message: 'Please enter a valid email' });
      return false;
    }

    if (!formData.otp) {
      setAlert({ type: 'error', message: 'OTP is required' });
      return false;
    }

    if (formData.otp.length !== 6) {
      setAlert({ type: 'error', message: 'OTP must be 6 digits' });
      return false;
    }

    if (!formData.newPassword) {
      setAlert({ type: 'error', message: 'New password is required' });
      return false;
    }

    // Check all password rules
    if (!passwordRules.minLength) {
      setAlert({ type: 'error', message: 'Password must be at least 8 characters' });
      return false;
    }

    if (!passwordRules.hasLowercase) {
      setAlert({ type: 'error', message: 'Password must contain at least one lowercase letter' });
      return false;
    }

    if (!passwordRules.hasUppercase) {
      setAlert({ type: 'error', message: 'Password must contain at least one uppercase letter' });
      return false;
    }

    if (!passwordRules.hasNumber) {
      setAlert({ type: 'error', message: 'Password must contain at least one number' });
      return false;
    }

    if (!passwordRules.hasSpecial) {
      setAlert({ type: 'error', message: 'Password must contain at least one special character (@$!%*?&)' });
      return false;
    }

    if (!formData.confirmPassword) {
      setAlert({ type: 'error', message: 'Please confirm your password' });
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setAlert({ type: 'error', message: 'Passwords do not match' });
      return false;
    }

    return true;
  };

  // Handle reset password submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/reset-password`,
        {
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setResetSuccess(true);
        setAlert({
          type: 'success',
          message: 'Password reset successful! Redirecting to login...',
        });

        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setAlert({
          type: 'error',
          message: response.data.message || 'Password reset failed',
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setAlert({
        type: 'error',
        message:
          error.response?.data?.message ||
          'An error occurred while resetting the password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (!formData.email) {
      setAlert({ type: 'error', message: 'Please enter your email first' });
      return;
    }

    setIsResending(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/forgot-password-otp`,
        { email: formData.email },
        { withCredentials: true }
      );

      if (response.data.success) {
        setAlert({
          type: 'success',
          message: 'OTP resent to your email',
        });
        // Reset timer
        setTimeRemaining(600);
        setTimerActive(true);
        setFormData((prev) => ({ ...prev, otp: '' }));
      } else {
        setAlert({
          type: 'error',
          message: response.data.message || 'Failed to resend OTP',
        });
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setAlert({
        type: 'error',
        message:
          error.response?.data?.message || 'Failed to resend OTP. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-4">
        <Card className="w-full max-w-md">
          <div className="text-center py-12">
            <AiOutlineCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Password Reset Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been reset successfully. Please log in with your new password.
            </p>
            <Button
              onClick={() => navigate('/login')}
              variant="primary"
              fullWidth
            >
              Go to Login
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
          <AiOutlineLock className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Enter the OTP sent to your email to reset your password
          </p>
        </div>

        {/* Alert Messages */}
        {alert && (
          <div className="mb-4">
            <Alert
              type={alert.type}
              message={alert.message}
              closeable
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {/* Timer Display */}
        <div className={`mb-6 p-4 rounded-lg text-center font-mono text-lg font-semibold ${
          timeRemaining < 120
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }`}>
          <div className="text-sm font-normal mb-1 opacity-75">OTP Expires In</div>
          <div className="text-2xl">{formatTime(timeRemaining)}</div>
          {!timerActive && timeRemaining === 0 && (
            <div className="text-sm mt-2 flex items-center justify-center gap-1">
              <BiErrorCircle className="w-4 h-4" />
              OTP Expired
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            fullWidth
            required
            disabled={isLoading}
          />

          {/* OTP Input with Resend */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OTP Code
            </label>
            <Input
              type="text"
              name="otp"
              value={formData.otp}
              onChange={(e) => {
                // Only allow 6 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setFormData((prev) => ({ ...prev, otp: value }));
              }}
              placeholder="000000"
              maxLength="6"
              fullWidth
              required
              disabled={isLoading || !timerActive}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
              Enter the 6-digit code sent to your email
            </p>

            {/* Resend OTP Button - Only enabled after timer expires */}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={timerActive || isResending || isLoading}
              className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                timerActive
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
              }`}
            >
              <AiOutlineReload className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Resending...' : timerActive ? `Resend OTP in ${formatTime(timeRemaining)}` : 'Resend OTP'}
            </button>
          </div>

          {/* New Password Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="At least 8 characters"
                fullWidth
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>

            {/* Password Requirements */}
            {formData.newPassword && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Password Requirements:
                </p>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${passwordRules.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span>{passwordRules.minLength ? '✓' : '○'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span>{passwordRules.hasLowercase ? '✓' : '○'}</span>
                    <span>One lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span>{passwordRules.hasUppercase ? '✓' : '○'}</span>
                    <span>One uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span>{passwordRules.hasNumber ? '✓' : '○'}</span>
                    <span>One number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRules.hasSpecial ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span>{passwordRules.hasSpecial ? '✓' : '○'}</span>
                    <span>One special character (@$!%*?&)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                fullWidth
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isLoading || !timerActive || (formData.newPassword && !allPasswordRulesMet)}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Resetting...
              </span>
            ) : formData.newPassword && !allPasswordRulesMet ? (
              'Complete Password Requirements'
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold"
          >
            ← Back to login
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default ResetOtp;