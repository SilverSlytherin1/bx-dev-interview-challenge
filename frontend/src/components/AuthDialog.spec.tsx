import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthDialog } from "./AuthDialog";
import { AuthProvider } from "../contexts/AuthContext";
import { AuthService } from "../services/auth.service";

// Mock the AuthService
jest.mock("../services/auth.service");

const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe("AuthDialog", () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    MockedAuthService.mockClear();
  });

  it("should render login tab by default", () => {
    renderWithAuthProvider(<AuthDialog open={true} onClose={mockOnClose} />);
    
    expect(screen.getByRole("tab", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    renderWithAuthProvider(<AuthDialog open={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("should switch to register tab when clicked", () => {
    renderWithAuthProvider(<AuthDialog open={true} onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByText("Register"));
    
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
  });

  it("should validate required fields on login", async () => {
    renderWithAuthProvider(<AuthDialog open={true} onClose={mockOnClose} />);
    
    const loginButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("should validate email format", async () => {
    renderWithAuthProvider(<AuthDialog open={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    
    const loginButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });
  });

  it("should validate password length", async () => {
    renderWithAuthProvider(<AuthDialog open={true} onClose={mockOnClose} />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: "123" } });
    
    const loginButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText("Password must be at least 6 characters long")).toBeInTheDocument();
    });
  });

  it("should call onClose when cancel button is clicked", () => {
    renderWithAuthProvider(<AuthDialog open={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
