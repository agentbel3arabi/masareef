import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

// Mock useCreateAccount
const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-accounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-accounts")>();
  return {
    ...actual,
    useCreateAccount: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  };
});

// Mock InstitutionSelector
vi.mock("../institution-selector", () => ({
  InstitutionSelector: () => <div data-testid="institution-selector">Institution</div>,
}));

// Mock FormSheet to render children directly
vi.mock("@/components/shared/form-sheet", () => ({
  FormSheet: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) =>
    open ? (
      <div data-testid="form-sheet">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// Mock FieldError
vi.mock("@/components/shared/field-error", () => ({
  FieldError: ({ show, message }: { show: boolean; message: string }) =>
    show ? <span role="alert">{message}</span> : null,
}));

// Mock RequiredLabel
vi.mock("@/components/shared/required-label", () => ({
  RequiredLabel: ({ children, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

// Mock Select components
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("CreateAccountDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  it("renders the form title", () => {
    renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    expect(screen.getAllByText("accounts.addAccount").length).toBeGreaterThanOrEqual(1);
  });

  it("renders input fields for the account form", () => {
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    // Form renders text and number inputs via base-ui InputPrimitive
    const inputs = container.querySelectorAll("[data-slot='input']");
    expect(inputs.length).toBeGreaterThanOrEqual(2); // name + balance + date at minimum
  });

  it("renders account type options", () => {
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    const options = container.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.getAttribute("value"));
    expect(values).toContain("bank_account");
    expect(values).toContain("credit_card");
    expect(values).toContain("cash_wallet");
  });

  it("renders currency options with all 7 currencies", () => {
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    const options = container.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.getAttribute("value"));
    expect(values).toContain("EGP");
    expect(values).toContain("USD");
    expect(values).toContain("KWD");
    expect(values).toContain("EUR");
    expect(values).toContain("GBP");
    expect(values).toContain("SAR");
    expect(values).toContain("AED");
  });

  it("renders number type input for balance", () => {
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    const numberInputs = container.querySelectorAll("input[type='number']");
    expect(numberInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders institution selector for bank accounts", () => {
    renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    const selectors = screen.getAllByTestId("institution-selector");
    expect(selectors.length).toBeGreaterThanOrEqual(1);
  });

  it("shows validation error when name is empty and form is submitted", async () => {
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);

    // Use fireEvent.submit to bypass jsdom's native required validation
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    // After submit with empty name, FieldError mock renders role="alert"
    const alerts = container.querySelectorAll("[role='alert']");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].textContent).toBe("common.fieldRequired");
  });

  it("calls mutateAsync with correct data on valid submit", async () => {
    const user = userEvent.setup();
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);

    // Find the first text input (account name) -- it's the first data-slot="input"
    const inputs = container.querySelectorAll("[data-slot='input']");
    const nameInput = inputs[0] as HTMLElement;
    expect(nameInput).toBeTruthy();
    await user.type(nameInput, "My Bank Account");

    const submitButton = container.querySelector("[data-slot='button'][type='submit']") as HTMLElement;
    await user.click(submitButton);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Bank Account",
        type: "bank_account",
        currency: "EGP",
      })
    );
  });

  it("does not render when closed", () => {
    const { container } = renderWithQueryClient(
      <CreateAccountDialog open={false} onOpenChange={vi.fn()} />
    );
    expect(container.querySelectorAll("[data-testid='form-sheet']")).toHaveLength(0);
  });

  it("renders date input for opened-at", () => {
    const { container } = renderWithQueryClient(<CreateAccountDialog {...defaultProps} />);
    const dateInputs = container.querySelectorAll("input[type='date']");
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });
});
