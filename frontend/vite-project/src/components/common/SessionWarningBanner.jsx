import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

const SessionWarningBanner = () => {
  const { sessionWarning, refresh, logout } = useContext(AuthContext);

  if (!sessionWarning) return null;

  const handleStayLoggedIn = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 border-b border-yellow-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <Alert type="warning" message="Your session will expire in 2 minutes. Please save your work." className="mb-0" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStayLoggedIn}
            className="bg-white hover:bg-gray-50 border-yellow-300 text-yellow-800"
          >
            Stay Logged In
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="bg-white hover:bg-gray-50 border-yellow-300 text-yellow-800"
          >
            Logout Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningBanner;