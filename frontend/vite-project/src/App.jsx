import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/index';
import CloudFarmLoader from './components/common/CloudFarmLoader';
import { useContext } from 'react';

/**
 * Main App Component - AgroSaaS Frontend
 * Global providers for authentication and theme
 */
function AppContent() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <CloudFarmLoader />;
  }

  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
