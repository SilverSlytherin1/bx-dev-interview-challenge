import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Paper,
  StyledEngineProvider,
  ThemeProvider,
  Toolbar,
  Typography,
  Alert,
} from "@mui/material";
import { Login } from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import theme from "./theme";
import { useMemo, useState } from "react";
import { FileService } from "./services/file.service";
import { FileUpload } from "./components/FileUpload";
import { AuthDialog } from "./components/AuthDialog";
import { UserMenu } from "./components/UserMenu";
import { useAuth } from "./contexts/AuthContext";

function App() {
  const { isAuthenticated, user, authService } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const fileService = useMemo(function initFileService() {
    return new FileService(() => authService.getAuthHeaders());
  }, [authService]);

  const handleLoginClick = () => {
    setAuthDialogOpen(true);
  };

  const handleAuthDialogClose = () => {
    setAuthDialogOpen(false);
  };

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                BonusX Interview Challenge
              </Typography>
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <Button 
                  color="inherit" 
                  onClick={handleLoginClick}
                  startIcon={<Login />}
                >
                  Login
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {!isAuthenticated && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Alert severity="info">
                    Please log in to upload and manage your files. Click the Login button in the top-right corner to get started.
                  </Alert>
                </Grid>
              </Grid>
            )}

            <Grid container spacing={3}>
              <Grid size={12}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h4" gutterBottom>
                    File Upload & Download System
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Upload files to AWS S3 and manage them with secure download links.
                    {isAuthenticated && user && (
                      <>
                        <br />
                        Welcome back, {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}!
                      </>
                    )}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={12}>
                <FileUpload fileService={fileService} disabled={!isAuthenticated} />
              </Grid>

              <Grid size={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    System Status
                  </Typography>
                  <Typography variant="body2">
                    ✅ File Upload to S3 configured (Presigned URLs + Direct)
                    <br />
                    ✅ Secure Download URLs (Presigned URLs + Direct)
                    <br />
                    ✅ Multiple Upload Methods (Choose your preferred approach)
                    <br />
                    ✅ File Management (Delete)
                    <br />
                    ✅ File Listing with Metadata
                    <br />
                    ✅ Material-UI Interface
                    <br />
                    ✅ JWT Authentication
                    <br />
                    {isAuthenticated ? '✅ User Authenticated' : '❌ User Not Authenticated'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Container>

          <AuthDialog 
            open={authDialogOpen} 
            onClose={handleAuthDialogClose} 
          />
        </Box>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
