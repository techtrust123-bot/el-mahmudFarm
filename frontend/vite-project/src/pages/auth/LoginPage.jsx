import { useState } from 'react';
import { FiMail, FiLock } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

/**
 * Login Page - User authentication
 */
const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
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
      // Mock login - replace with actual API call
      const mockToken = `token_${Date.now()}`;
      const mockUser = {
        id: 1,
        email: formData.email,
        name: 'Farmer John',
        role: 'farmer',
        farm: { id: 1, name: 'Green Valley Farm' },
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      login(mockUser, mockToken);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">🌾 AgroSaaS</h1>
          <p className="text-gray-600 dark:text-gray-400">Smart Farming Platform</p>
        </div>

        {/* Form Card */}
        <Card shadow="lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Login</h2>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              label="Password"
              type="password"
              name="password"
              icon={FiLock}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <Button type="submit" fullWidth variant="primary" size="lg" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3 text-center">
            <Link to="/forgot-password" className="block text-sm text-green-600 hover:text-green-700 dark:text-green-400">
              Forgot Password?
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-green-600 hover:text-green-700 dark:text-green-400 font-semibold">
                Register
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
