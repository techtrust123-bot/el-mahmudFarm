import React, { useState,useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import axios from 'axios'
import { AuthContext } from '../context/AuthContext';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';
/**
 * Forgot Password Page
 */
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
 
  const [formData, setFormData] = useState({ email: '' });
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { axiosInstance } = useContext(AuthContext);
  const {backendUrl} = useContext(AuthContext)



  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value)
    setFormData((prev)=>({ ...prev, [name]: value }));
  }
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setAlert({ type: 'error', message: 'Please enter your email' });
      return;
    }

    // setIsLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/auth/send-reset-otp`, { email: formData.email }, { withCredentials: true });
      if (response.data.success) {
        setAlert({
          type: 'success',
          message: 'Check your email for password reset instructions',
        });
        navigate('/reset-password');
      }
      // setSubmitted(true);
      // setTimeout(() => navigate('/reset-password'), 3000);
    } catch (error) {
      console.log('Error sending reset OTP:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={cloudFarmLogo} alt="CloudFarm logo" className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain bg-emerald-50 p-2 shadow-sm" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CloudFarm</h1>
          <p className="text-gray-600 dark:text-gray-400">Reset Your Password 🔐</p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
          </div>
        )}

        {!submitted ? (
          <div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                fullWidth
                required
              />

              <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Otp'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-4">✉️</div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Check your email for instructions to reset your password.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
            Back to login
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
