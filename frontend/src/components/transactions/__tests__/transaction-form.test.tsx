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

// Mock useCreateTransaction
const mockCreateTxMutateAsync = vi.fn();
vi.mock("@/hooks/use-transactions", () => ({
  useCreateTransaction: () => ({
    mutateAsync: mockCreateTxMutateAsync,
    isPending: false,
  }),
}));

// Mock useCategories
vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({
    data: {
      data: [
        { id: 1, name_en: "Food", name_ar: "طعام", icon: "utensils" },
        { id: 2, name_en: "Transport", name_ar: "مواصلات", icon: "car" },
      ],
    },
  }),
}));

// Mock useAccounts
vi.mock("@/hooks/use-accounts", () => ({
  useAccounts: () => ({
    data: {
      data: [
        { id: 1, name: "Main Account", currency: "EGP", is_active: true, institution: null },
        { id: 2, name: "USD Account", currency: "USD", is_active: true, institution: null },
      ],
    },
  }),
}));

// Mock FormSheet
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

// Mock CurrencyInput
vi.mock("@/components/shared/currency-input", () => ({
  CurrencyInput: ({ value, onChange, ...props }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; [key: string]: unknown }) => (
    <input data-testid="currency-input" value={value} onChange={onChange} aria-label="amount" {...props} />
  ),
}));

// Mock DatePicker
vi.mock("@/components/shared/date-picker", () => ({
  DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="date-picker" type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label="date" />
  ),
}));

// Mock Select
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

// Mock CategoryIcon
vi.mock("@/lib/category-icon", () => ({
  CategoryIcon: ({ icon }: { icon: string }) => <span data-testid="category-icon">{icon}</span>,
}));

import { TransactionForm } from "@/components/transactions/transaction-form";

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("TransactionForm", () => {
  const defaultProps = {
    accountId: 1,
    accountCurrency: "EGP",
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTxMutateAsync.mockResolvedValue({});
  });

  it("renders form title", () => {
    renderWithQueryClient(<TransactionForm {...defaultProps} />);
    expect(screen.getAllByText("transactions.newTransaction").length).toBeGreaterThanOrEqual(1);
  });

  it("renders expense/income type toggle buttons", () => {
    const { container } = renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const buttons = container.querySelectorAll("[data-slot='button']");
    const buttonTexts = Array.from(buttons).map((b) => b.textContent);
    expect(buttonTexts).toContain("transactions.expense");
    expect(buttonTexts).toContain("transactions.incomeType");
  });

  it("renders description input", () => {
    const { container } = renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const descInput = container.querySelector("[data-slot='input']") as HTMLInputElement;
    expect(descInput).toBeInTheDocument();
  });

  it("renders amount field with currency input", () => {
    renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const inputs = screen.getAllByTestId("currency-input");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders date picker", () => {
    renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const pickers = screen.getAllByTestId("date-picker");
    expect(pickers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders category options", () => {
    renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const foods = screen.getAllByText("Food");
    expect(foods.length).toBeGreaterThanOrEqual(1);
  });

  it("renders notes textarea", () => {
    const { container } = renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toBeInTheDocument();
  });

  it("renders submit button", () => {
    const { container } = renderWithQueryClient(<TransactionForm {...defaultProps} />);
    const submitBtn = container.querySelector("[data-slot='button'][type='submit']");
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn?.textContent).toBe("common.save");
  });

  it("does not render when closed", () => {
    const { container } = renderWithQueryClient(
      <TransactionForm {...defaultProps} open={false} />
    );
    expect(container.querySelectorAll("[data-testid='form-sheet']")).toHaveLength(0);
  });

  it("converts amount to minor units using parseMajorToMinor", async () => {
    // Dynamically import to avoid require path issues
    const { parseMajorToMinor } = await import("@/lib/money");
    // TransactionForm uses parseMajorToMinor to convert user input to minor units
    expect(parseMajorToMinor("50.00", 2)).toBe(5000);
    expect(parseMajorToMinor("1250.50", 2)).toBe(125050);
    expect(parseMajorToMinor("0.01", 2)).toBe(1);
    // Negative amounts are made absolute in the form via Math.abs
    expect(Math.abs(parseMajorToMinor("-50.00", 2))).toBe(5000);
  });

  it("does not submit when amount is empty", async () => {
    const user = userEvent.setup();
    const { container } = renderWithQueryClient(<TransactionForm {...defaultProps} />);

    const descInput = container.querySelector("[data-slot='input']") as HTMLElement;
    await user.type(descInput, "Test");

    // Amount defaults to empty -> submit should not call mutateAsync
    const submitButton = container.querySelector("[data-slot='button'][type='submit']") as HTMLElement;
    await user.click(submitButton);

    expect(mockCreateTxMutateAsync).not.toHaveBeenCalled();
  });
});
