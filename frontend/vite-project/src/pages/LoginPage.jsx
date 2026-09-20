import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';
import authService from '../services/authService';

/**
 * Login Page
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setIsLogin, getUserData } = useContext(AuthContext)

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setAlert({
        type: 'warning',
        message: 'Your session has expired. Please sign in again.'
      });
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
    const response = await axiosInstance.post('/api/auth/login', formData);
    console.log('Login response:', response.data);
    if (response.data.success) {
      setAlert({ type: 'success', message: response.data.message });
      const loggedInUser = response.data.user || response.data.userData;
      setIsLogin(true);
      await getUserData(true);
      if (loggedInUser?.isAccountVerified === false || String(loggedInUser?.isAccountVerified).toLowerCase() === 'false') {
        try {
          navigate('/verify-otp');
          await authService.resendOTP();
        } catch (resendError) {
          console.warn('Unable to resend verification OTP after login:', resendError?.message);
        }
      } else if(loggedInUser?.isAccountVerified === true){
        navigate('/dashboard');
      }
    } else {
      setAlert({ type: 'error', message: response.data.message || 'Login failed' });
      
    }
    setIsLoading(false);
  }
    catch (error) {
      console.error('Login error:', error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const formattedErrors = {};
        Object.keys(validationErrors).forEach(field => {
          formattedErrors[field] = Array.isArray(validationErrors[field]) 
            ? validationErrors[field].join('. ') 
            : validationErrors[field];
        });
        setErrors(formattedErrors);
        setAlert({ type: 'error', message: error.response?.data?.message });
      } else {
        setAlert({ type: 'error', message: error.response?.data?.message || 'Login failed' });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={cloudFarmLogo} alt="CloudFarm logo" className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain bg-emerald-50 p-2 shadow-sm" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CloudFarm</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome Back 🌾</p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="your@email.com"
            fullWidth
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="••••••••"
            fullWidth
          />

          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
