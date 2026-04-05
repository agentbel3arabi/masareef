"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSheet } from "@/components/shared/form-sheet";
import { FieldError } from "@/components/shared/field-error";
import { RequiredLabel } from "@/components/shared/required-label";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/use-accounts";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { InstitutionSelector } from "./institution-selector";
import type { Institution } from "@/hooks/use-institutions";

const CREDIT_TYPES = new Set(["credit_card", "financing_app"]);
const INSTITUTION_TYPES = new Set([
  "bank_account",
  "credit_card",
  "digital_wallet",
  "financing_app",
]);

const ACCOUNT_TYPES = [
  { value: "bank_account", label: "accounts.bankAccount" },
  { value: "credit_card", label: "accounts.creditCard" },
  { value: "cash_wallet", label: "accounts.cashWallet" },
  { value: "digital_wallet", label: "accounts.digitalWallet" },
  { value: "financing_app", label: "accounts.financingApp" },
];

/** Map account type to institution API type for reset logic */
function institutionApiType(
  accountType: string
): string | null {
  switch (accountType) {
    case "bank_account":
    case "credit_card":
      return "bank";
    case "financing_app":
      return "bnpl";
    case "digital_wallet":
      return "digital_wallet_provider";
    default:
      return null;
  }
}

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedInstitution?: Institution;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  preselectedInstitution,
}: CreateAccountDialogProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");
  const [currency, setCurrency] = useState("EGP");
  const [institution, setInstitution] = useState<Institution | null>(
    preselectedInstitution ?? null
  );
  const [openingBalance, setOpeningBalance] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  // Additional details
  const [showAdditional, setShowAdditional] = useState(false);
  const [iban, setIban] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountTier, setAccountTier] = useState("");
  const [branch, setBranch] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const createAccount = useCreateAccount();

  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const balanceStep = (1 / Math.pow(10, exponent)).toFixed(exponent);
  const balancePlaceholder = (0).toFixed(exponent);
  const isCreditType = CREDIT_TYPES.has(type);
  const needsInstitution = INSTITUTION_TYPES.has(type);

  // Reset institution when account type changes if institution type changes
  const handleTypeChange = (newType: string) => {
    const oldInstType = institutionApiType(type);
    const newInstType = institutionApiType(newType);
    if (oldInstType !== newInstType && !preselectedInstitution) {
      setInstitution(null);
    }
    setType(newType);
  };

  const reset = () => {
    setName("");
    setType("bank_account");
    setCurrency("EGP");
    setInstitution(preselectedInstitution ?? null);
    setOpeningBalance("");
    setOpenedAt("");
    setCreditLimit("");
    setBillingDay("");
    setPaymentDueDay("");
    setShowAdditional(false);
    setIban("");
    setAccountNumber("");
    setAccountTier("");
    setBranch("");
    setError(null);
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim()) return;
    setError(null);
    try {
      await createAccount.mutateAsync({
        name,
        type,
        currency,
        opening_balance: openingBalance
          ? parseMajorToMinor(openingBalance, exponent)
          : undefined,
        institution_id: institution?.id,
        opened_at: openedAt || undefined,
        iban: iban || undefined,
        account_number: accountNumber || undefined,
        account_tier: accountTier || undefined,
        branch: branch || undefined,
        credit_limit:
          isCreditType && creditLimit
            ? parseMajorToMinor(creditLimit, exponent)
            : undefined,
        billing_cycle_day:
          isCreditType && billingDay ? parseInt(billingDay, 10) : undefined,
        payment_due_day:
          isCreditType && paymentDueDay
            ? parseInt(paymentDueDay, 10)
            : undefined,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("common.unexpectedError")
      );
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("accounts.addAccount")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Account Name */}
        <div className="space-y-2">
          <RequiredLabel required htmlFor="account-name">
            {t("accounts.name")}
          </RequiredLabel>
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FieldError
            show={submitted && !name.trim()}
            message={t("common.fieldRequired")}
          />
        </div>

        {/* Account Type */}
        <div className="space-y-2">
          <RequiredLabel required htmlFor="account-type">
            {t("accounts.type")}
          </RequiredLabel>
          <Select value={type} onValueChange={(val) => val && handleTypeChange(val)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t_item) => (
                <SelectItem key={t_item.value} value={t_item.value}>
                  {t(t_item.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <RequiredLabel required htmlFor="account-currency">
            {t("accounts.currency")}
          </RequiredLabel>
          <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CURRENCIES).map(([code, info]) => (
                <SelectItem key={code} value={code}>
                  {code} — {locale === "ar" ? info.nameAr : info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Institution Selector */}
        {needsInstitution && (
          <div className="space-y-2">
            <Label>{t("accounts.institution")}</Label>
            <InstitutionSelector
              accountType={type}
              value={institution}
              onChange={setInstitution}
            />
          </div>
        )}

        {/* Opening Balance */}
        <div className="space-y-2">
          <Label htmlFor="account-balance">
            {isCreditType
              ? t("accounts.currentBalanceDue")
              : t("accounts.openingBalance")}
          </Label>
          <Input
            id="account-balance"
            type="number"
            step={balanceStep}
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder={balancePlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            {isCreditType
              ? t("accounts.currentBalanceDueHint")
              : t("accounts.openingBalanceHint")}
          </p>
        </div>

        {/* Opened At */}
        <div className="space-y-2">
          <Label htmlFor="account-opened-at">{t("accounts.openedAt")}</Label>
          <Input
            id="account-opened-at"
            type="date"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
          />
        </div>

        {/* Credit-specific fields */}
        {isCreditType && (
          <>
            <div className="space-y-2">
              <Label htmlFor="account-credit-limit">
                {t("accounts.creditLimit")}
              </Label>
              <Input
                id="account-credit-limit"
                type="number"
                step={balanceStep}
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder={balancePlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="account-billing-day">
                  {t("accounts.billingCycleDay")}
                </Label>
                <Input
                  id="account-billing-day"
                  type="number"
                  min="1"
                  max="31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  placeholder="1–31"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-payment-due-day">
                  {t("accounts.paymentDueDay")}
                </Label>
                <Input
                  id="account-payment-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={paymentDueDay}
                  onChange={(e) => setPaymentDueDay(e.target.value)}
                  placeholder="1–31"
                />
              </div>
            </div>
          </>
        )}

        {/* Additional Details (collapsible) */}
        <div className="border-t border-border/40 pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAdditional(!showAdditional)}
          >
            {t("accounts.additionalDetails")}
            {showAdditional ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showAdditional && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="account-iban">{t("accounts.iban")}</Label>
                <Input
                  id="account-iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder={t("accounts.ibanPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">
                  {t("accounts.accountNumber")}
                </Label>
                <Input
                  id="account-number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="account-tier">
                    {t("accounts.accountTier")}
                  </Label>
                  <Input
                    id="account-tier"
                    value={accountTier}
                    onChange={(e) => setAccountTier(e.target.value)}
                    placeholder={t("accounts.accountTierPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-branch">
                    {t("accounts.branch")}
                  </Label>
                  <Input
                    id="account-branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder={t("accounts.branchPlaceholder")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createAccount.isPending}
        >
          {createAccount.isPending ? t("common.loading") : t("common.create")}
        </Button>
      </form>
    </FormSheet>
  );
}
