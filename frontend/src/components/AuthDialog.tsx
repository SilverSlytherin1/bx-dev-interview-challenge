import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ open, onClose }) => {
  const { login, register } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    setLoginData({ email: '', password: '' });
    setRegisterData({ email: '', password: '', firstName: '', lastName: '' });
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(loginData);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register(registerData);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Login" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
          <Tab label="Register" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
        </Tabs>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={handleLogin} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="login-email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="login-password"
              autoComplete="current-password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              disabled={loading}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={handleRegister} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="register-email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="register-password"
              autoComplete="new-password"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              disabled={loading}
            />
            <TextField
              margin="normal"
              fullWidth
              id="register-firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              value={registerData.firstName}
              onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
              disabled={loading}
            />
            <TextField
              margin="normal"
              fullWidth
              id="register-lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={registerData.lastName}
              onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
              disabled={loading}
            />
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {tabValue === 0 ? (
          <Button
            onClick={handleLogin}
            variant="contained"
            disabled={loading || !loginData.email || !loginData.password}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        ) : (
          <Button
            onClick={handleRegister}
            variant="contained"
            disabled={loading || !registerData.email || !registerData.password}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
