import React, { useState,useContext,useEffect } from 'react';
import { FiSave, FiMoon, FiSun } from 'react-icons/fi';
import MainLayout from '../layouts/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Alert from '../components/ui/Alert';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

/**
 * Settings Page
 */
const SettingsPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [alert, setAlert] = useState(null);
  const {userData} = useContext(AuthContext)
  const [farmData, setFarmData] = useState({
    farmName: userData?.farmName || 'Green Valley Farm',
    owner: userData?.name || 'John Doe',
    email: userData?.email || 'john@greenvalley.com',
    phone: userData?.phone || '+1234567890',
    address: userData?.address || '123 Farm Road, Agriculture Valley',
    city: userData?.city || 'Springfield',
    country: userData?.country || 'United States',
    postalCode: userData?.postalCode || '12345',
    description: 'A modern livestock and poultry farm',
  });

  const [profileData, setProfileData] = useState({
    fullName: userData?.name || 'John Doe',
    email: userData?.email || 'john@greenvalley.com',
    phone: userData?.phone || '+1234567890',
    position: userData?.position || 'Farm Manager',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleFarmChange = (e) => {
    const { name, value } = e.target;
    setFarmData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveFarm = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAlert({ type: 'success', message: 'Farm details saved successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save farm details' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAlert({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your farm and account settings</p>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} closeable onClose={() => setAlert(null)} />
        )}

        {/* Farm Details Section */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Farm Details</h2>
          <form onSubmit={handleSaveFarm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Farm Name"
                type="text"
                name="farmName"
                value={farmData.farmName}
                onChange={handleFarmChange}
              />
              <Input
                label="Owner Name"
                type="text"
                name="owner"
                value={farmData.owner}
                onChange={handleFarmChange}
              />
              <Input
                label="Email"
                type="email"
                name="email"
                value={farmData.email}
                onChange={handleFarmChange}
              />
              <Input
                label="Phone"
                type="tel"
                name="phone"
                value={farmData.phone}
                onChange={handleFarmChange}
              />
              <Input
                label="City"
                type="text"
                name="city"
                value={farmData.city}
                onChange={handleFarmChange}
              />
              <Input
                label="Country"
                type="text"
                name="country"
                value={farmData.country}
                onChange={handleFarmChange}
              />
              <Input
                label="Postal Code"
                type="text"
                name="postalCode"
                value={farmData.postalCode}
                onChange={handleFarmChange}
              />
              <Input
                label="Address"
                type="text"
                name="address"
                value={farmData.address}
                onChange={handleFarmChange}
              />
            </div>

            <Textarea
              label="Farm Description"
              name="description"
              value={farmData.description}
              onChange={handleFarmChange}
              rows={4}
            />

            <Button type="submit" variant="primary" className="flex items-center gap-2" disabled={isSaving}>
              <FiSave size={18} />
              {isSaving ? 'Saving...' : 'Save Farm Details'}
            </Button>
          </form>
        </Card>

        {/* Profile Section */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Settings</h2>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                type="text"
                name="fullName"
                value={profileData.fullName}
                onChange={handleProfileChange}
              />
              <Input
                label="Position"
                type="text"
                name="position"
                value={profileData.position}
                onChange={handleProfileChange}
              />
              <Input
                label="Email"
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
              />
              <Input
                label="Phone"
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
              />
            </div>

            <Button type="submit" variant="primary" className="flex items-center gap-2" disabled={isSaving}>
              <FiSave size={18} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Card>

        {/* Theme Settings */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light and dark mode</p>
              </div>
              <Button
                onClick={toggleTheme}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isDark ? (
                  <>
                    <FiSun size={18} />
                    Light Mode
                  </>
                ) : (
                  <>
                    <FiMoon size={18} />
                    Dark Mode
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Low Stock Alerts</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notify when feed or supplies are low</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Health Alerts</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notify about animal health issues</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Weekly Reports</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly farm reports</p>
              </div>
            </label>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6">Danger Zone</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            These actions cannot be undone. Please proceed with caution.
          </p>
          <Button variant="danger">Delete Account</Button>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
