import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './utils/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';

// Client pages
import ClientDashboard from './pages/client/Dashboard';
import Home from './pages/client/Home';
import Contacts from './pages/client/Contacts';
import CallsTexts from './pages/client/CallsTexts';
import Emails from './pages/client/Emails';
import Mailers from './pages/client/Mailers';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Client routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="calls-texts" element={<CallsTexts />} />
              <Route path="emails" element={<Emails />} />
              <Route path="mailers" element={<Mailers />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
