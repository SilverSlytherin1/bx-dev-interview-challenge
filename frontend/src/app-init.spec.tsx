import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock localStorage before any imports
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Create mock functions that will be used across tests
const mockGetUser = jest.fn();
const mockIsAuthenticated = jest.fn();
const mockGetAuthHeaders = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();
const mockGetToken = jest.fn();

// Mock the services before importing components
jest.mock("./services/auth.service", () => {
  return {
    AuthService: jest.fn().mockImplementation(() => ({
      getUser: mockGetUser,
      isAuthenticated: mockIsAuthenticated,
      getAuthHeaders: mockGetAuthHeaders,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      getToken: mockGetToken,
    })),
  };
});

jest.mock("./services/file.service");

import App from "./app-init.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { FileService } from "./services/file.service";

const MockedFileService = FileService as jest.MockedClass<typeof FileService>;

// Mock fetch for API calls
global.fetch = jest.fn();

describe("App", () => {
  let mockFileService: jest.Mocked<FileService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Reset auth service mocks to default unauthenticated state
    mockGetUser.mockReturnValue(null);
    mockIsAuthenticated.mockReturnValue(false);
    mockGetAuthHeaders.mockReturnValue({});
    mockLogin.mockResolvedValue({ user: {}, accessToken: 'token' });
    mockRegister.mockResolvedValue({ user: {}, accessToken: 'token' });
    mockLogout.mockImplementation(() => {});
    mockGetToken.mockReturnValue(null);

    // Setup FileService mock
    mockFileService = {
      uploadFile: jest.fn(),
      listFiles: jest.fn().mockResolvedValue({ files: [] }),
      deleteFile: jest.fn(),
      getDownloadUrl: jest.fn(),
    } as unknown as jest.Mocked<FileService>;

    MockedFileService.mockClear();
    MockedFileService.mockImplementation(() => mockFileService);
  });

  it("should render the main app components", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Check for main elements
    expect(screen.getByText("BonusX Interview Challenge")).toBeInTheDocument();
    expect(
      screen.getByText("File Upload & Download System")
    ).toBeInTheDocument();
    
    // Find the specific header login button (not the disabled file upload button)
    const headerLoginButton = screen
      .getAllByRole("button", { name: /login/i })
      .find((button) => button.querySelector('[data-testid="LoginIcon"]'));
    expect(headerLoginButton).toBeInTheDocument();
    
    expect(
      screen.getByText(
        "Please log in to upload and manage your files. Click the Login button in the top-right corner to get started."
      )
    ).toBeInTheDocument();
  });

  it("should show login button when user is not authenticated", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const headerLoginButton = screen
      .getAllByRole("button", { name: /login/i })
      .find((button) => button.querySelector('[data-testid="LoginIcon"]'));
    if (!headerLoginButton) throw new Error("Header login button not found");
    expect(headerLoginButton).toBeInTheDocument();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("should open auth dialog when login button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const headerLoginButton = screen
      .getAllByRole("button", { name: /login/i })
      .find((button) => button.querySelector('[data-testid="LoginIcon"]'));
    if (!headerLoginButton) throw new Error("Header login button not found");
    await user.click(headerLoginButton);

    // Check if auth dialog opens (it contains tabs for Login/Register)
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("should show user menu when authenticated", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      createdAt: "2023-01-01T00:00:00Z",
    };

    mockGetUser.mockReturnValue(mockUser);
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show welcome message (text is split across elements)
    const welcomeElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("Welcome back") || false;
    });
    expect(welcomeElements[0]).toBeInTheDocument();

    // Should not show login button
    expect(
      screen.queryByRole("button", { name: /login/i })
    ).not.toBeInTheDocument();
  });

  it("should display file upload component", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText("File Upload")).toBeInTheDocument();
    const loginToUploadElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("Please login to upload files") || false;
    });
    expect(loginToUploadElements[0]).toBeInTheDocument();
  });

  it("should display system status", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByText("System Status")).toBeInTheDocument();
    
    const s3ConfiguredElements = screen.getAllByText((_, element) => {
      return (
        element?.textContent?.includes("✅ File Upload to S3 configured") ||
        false
      );
    });
    expect(s3ConfiguredElements[0]).toBeInTheDocument();
    
    const secureDownloadElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("✅ Secure Download URLs") || false;
    });
    expect(secureDownloadElements[0]).toBeInTheDocument();
    
    const jwtAuthElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("✅ JWT Authentication") || false;
    });
    expect(jwtAuthElements[0]).toBeInTheDocument();
    
    const notAuthenticatedElements = screen.getAllByText((_, element) => {
      return (
        element?.textContent?.includes("❌ User Not Authenticated") || false
      );
    });
    expect(notAuthenticatedElements[0]).toBeInTheDocument();
  });

  it("should update system status when authenticated", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      createdAt: "2023-01-01T00:00:00Z",
    };

    mockGetUser.mockReturnValue(mockUser);
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const authenticatedElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("✅ User Authenticated") || false;
    });
    expect(authenticatedElements[0]).toBeInTheDocument();
    expect(
      screen.queryByText((_, element) => {
        return (
          element?.textContent?.includes("❌ User Not Authenticated") || false
        );
      })
    ).not.toBeInTheDocument();
  });

  it("should handle file service integration", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Verify FileService is instantiated
    expect(MockedFileService).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should provide auth headers to file service", () => {
    const mockHeaders = { Authorization: "Bearer token123" };
    mockGetAuthHeaders.mockReturnValue(mockHeaders);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Get the function passed to FileService constructor
    const [[getAuthHeadersFunction]] = MockedFileService.mock.calls;
    const headers = getAuthHeadersFunction();

    expect(headers).toEqual(mockHeaders);
  });

  it("should display different content for authenticated vs unauthenticated users", () => {
    // Test unauthenticated state first
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Initially unauthenticated - check for the alert message
    expect(
      screen.getByText(
        "Please log in to upload and manage your files. Click the Login button in the top-right corner to get started."
      )
    ).toBeInTheDocument();
  });

  it("should show authenticated content when user is logged in", () => {
    // Mock authentication before rendering
    const mockUser = {
      id: "1",
      email: "test@example.com",
      firstName: "Jane",
      lastName: "Smith",
      createdAt: "2023-01-01T00:00:00Z",
    };

    mockGetUser.mockReturnValue(mockUser);
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Check for welcome text (it's split across elements with line breaks)
    const welcomeElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("Welcome back") || false;
    });
    expect(welcomeElements[0]).toBeInTheDocument();
    // The alert should no longer be present when authenticated
    expect(
      screen.queryByText(
        "Please log in to upload and manage your files. Click the Login button in the top-right corner to get started."
      )
    ).not.toBeInTheDocument();
  });

  it("should handle user with email only (no first/last name)", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      createdAt: "2023-01-01T00:00:00Z",
    };

    mockGetUser.mockReturnValue(mockUser);
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Use getAllByText to handle multiple instances and select the first one
    const welcomeElements = screen.getAllByText((_, element) => {
      return element?.textContent?.includes("Welcome back, test@example.com!") || false;
    });
    expect(welcomeElements[0]).toBeInTheDocument();
  });

  it("should close auth dialog when handleAuthDialogClose is called", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Open the dialog - specifically target the header login button using text content and svg icon
    const headerLoginButton = screen
      .getAllByRole("button", { name: /login/i })
      .find((button) => button.querySelector('[data-testid="LoginIcon"]'));
    if (!headerLoginButton) throw new Error("Header login button not found");
    await user.click(headerLoginButton);

    expect(screen.getByRole("tablist")).toBeInTheDocument();

    // Close the dialog by clicking Cancel button
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should be closed - wait for it to disappear with longer timeout
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
