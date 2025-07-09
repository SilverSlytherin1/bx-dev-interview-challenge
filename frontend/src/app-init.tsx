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
} from "@mui/material";
import Grid from "@mui/material/Grid";
import theme from "./theme";
import { useMemo } from "react";
import { FileService } from "./services/file.service";
import { FileUpload } from "./components/FileUpload";

function App() {
  const fileService = useMemo(function initFileService() {
    return new FileService();
  }, []);

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
              <Button color="inherit">Login</Button>
            </Toolbar>
          </AppBar>

          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h4" gutterBottom>
                    File Upload & Download System
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Upload files to AWS S3 and manage them with secure download links.
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={12}>
                <FileUpload fileService={fileService} />
              </Grid>

              <Grid size={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    System Status
                  </Typography>
                  <Typography variant="body2">
                    ✅ File Upload to S3 configured
                    <br />
                    ✅ Secure Download URLs
                    <br />
                    ✅ File Management (Delete)
                    <br />
                    ✅ File Listing with Metadata
                    <br />
                    ✅ Material-UI Interface
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
