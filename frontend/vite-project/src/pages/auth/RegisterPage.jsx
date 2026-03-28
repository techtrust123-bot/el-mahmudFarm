import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

/**
 * Register Page - New user account creation
 */
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    farmName: '',
    userType: 'farmer',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.farmName) newErrors.farmName = 'Farm name is required';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Mock registration
      const mockToken = `token_${Date.now()}`;
      const mockUser = {
        id: Math.random(),
        email: formData.email,
        name: formData.fullName,
        role: formData.userType,
        farm: { id: Math.random(), name: formData.farmName },
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      login(mockUser, mockToken);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">🌾 AgroSaaS</h1>
          <p className="text-gray-600 dark:text-gray-400">Join the Smart Farming Revolution</p>
        </div>

        {/* Form Card */}
        <Card shadow="lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Account</h2>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am a:</label>
              <div className="flex gap-4">
                {['farmer', 'vet', 'supplier'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="userType"
                      value={type}
                      checked={formData.userType === type}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="capitalize text-gray-700 dark:text-gray-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                type="text"
                name="fullName"
                icon={FiUser}
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                error={errors.fullName}
              />

              <Input
                label="Email"
                type="email"
                name="email"
                icon={FiMail}
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <Input
                label="Farm Name"
                type="text"
                name="farmName"
                icon={FiMapPin}
                placeholder="Your Farm Name"
                value={formData.farmName}
                onChange={handleChange}
                error={errors.farmName}
              />

              <Input
                label="Phone"
                type="tel"
                name="phone"
                icon={FiPhone}
                placeholder="+1234567890"
                value={formData.phone}
                onChange={handleChange}
              />

              <Input
                label="Password"
                type="password"
                name="password"
                icon={FiLock}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                icon={FiLock}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
              />
            </div>

            <Input
              label="Farm Address"
              type="text"
              name="address"
              placeholder="123 Farm Road, Agriculture Valley"
              value={formData.address}
              onChange={handleChange}
            />

            <Button type="submit" fullWidth variant="primary" size="lg" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 hover:text-green-700 dark:text-green-400 font-semibold">
                Login
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
