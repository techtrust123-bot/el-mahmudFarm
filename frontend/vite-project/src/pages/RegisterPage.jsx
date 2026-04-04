import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { validateForm, registerSchema } from '../utils/validation';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';


/**
 * Register Page
 */
const RegisterPage = () => {
  const navigate = useNavigate();
  const {getUserData, setIsLogin,backendUrl} = useContext(AuthContext)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(backendUrl+'/api/auth/register', formData, { withCredentials: true });
      setAlert({ type: 'success', message: response.data.message || 'Registration successful!' });
      setIsLogin(true)
      getUserData()
      navigate('/');
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Registration error:', error);
      
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
        setAlert({ type: 'error', message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" });
      } else {
        setAlert({ type: 'error', message: error.response?.data?.message || 'Registration failed' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CloudFarm</h1>
          <p className="text-gray-600 dark:text-gray-400">Create Your Account 🌾</p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="John Doe"
            fullWidth
            required
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="your@email.com"
            fullWidth
            required
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
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            placeholder="••••••••"
            fullWidth
            required
          />

          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 rounded" required />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I agree to the Terms and Conditions
            </span>
          </label>

          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
