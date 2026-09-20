import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';

/**
 * Register Page
 */
const RegisterPage = () => {
  const navigate = useNavigate();
  const { getUserData, setIsLogin } = useContext(AuthContext)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    farmName: '',
    phone: '',
    address: '',
    city: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
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
    if (!formData.acceptedTerms) {
      setErrors((prev) => ({ ...prev, acceptedTerms: 'You must accept the Terms and Conditions and Privacy Policy.' }));
      return;
    }
    setIsLoading(true);
    try {
      const { acceptedTerms, ...registrationData } = formData;
      const response = await axiosInstance.post('/api/auth/register', registrationData);
      setAlert({ type: 'success', message: response.data.message || 'Registration successful!' });
      setIsLogin(true);
      await getUserData(true);
      navigate('/verify-otp');
      setFormData({
        name: '',
        email: '',
        farmName: '',
        phone: '',
        address: '',
        city: '',
        password: '',
        confirmPassword: '',
          acceptedTerms: false,
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
        setAlert({ type: 'error', message: error.response?.data?.message });
        // setAlert({ type: 'error', message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" });
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
          <img src={cloudFarmLogo} alt="CloudFarm logo" className="mx-auto mb-3 h-16 w-16 rounded-xl object-contain bg-emerald-50 p-2 shadow-sm" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CloudFarm</h1>
          <p className="text-gray-600 dark:text-gray-400">Create Your Account 🌾</p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
           <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Mahmud Abdullahi"
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
          <Input
            label="Farm Name"
            type="text"
            name="farmName"
            value={formData.farmName}
            onChange={handleChange}
            error={errors.farmName}
            placeholder="Your Farm Name"
            fullWidth
          />
          <Input
            label="Phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="+2348029945242"
            fullWidth
          />
         
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
           <Input
            label="Address"
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            error={errors.address}
            placeholder="123 Main St"
            fullWidth
          />
          <Input
            label="City"
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            error={errors.city}
            placeholder="Your City"
            fullWidth
          />
        </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
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
          </div>
          

          <label className="flex items-start gap-3">
            <input type="checkbox" name="acceptedTerms" checked={formData.acceptedTerms} onChange={(e) => setFormData((prev) => ({ ...prev, acceptedTerms: e.target.checked }))} className="mt-1 h-4 w-4 rounded" required />
            <span className="text-sm leading-6 text-gray-700 dark:text-gray-300">
              I agree to the <Link to="/terms" target="_blank" className="font-semibold text-emerald-700 hover:underline">Terms and Conditions</Link> and <Link to="/privacy-policy" target="_blank" className="font-semibold text-emerald-700 hover:underline">Privacy Policy</Link>.
              {errors.acceptedTerms && <span className="mt-1 block text-red-600">{errors.acceptedTerms}</span>}
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
