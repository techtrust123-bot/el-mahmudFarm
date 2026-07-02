import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/index';

/**
 * Main App Component - AgroSaaS Frontend
 * Global providers for authentication and theme
 */
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
