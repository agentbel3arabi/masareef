"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAccount } from "@/hooks/use-accounts";
import { CURRENCIES } from "@/lib/money";
import { Plus } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "bank_account", label: "accounts.bankAccount" },
  { value: "credit_card", label: "accounts.creditCard" },
  { value: "cash_wallet", label: "accounts.cashWallet" },
  { value: "digital_wallet", label: "accounts.digitalWallet" },
  { value: "financing_app", label: "accounts.financingApp" },
];

export function CreateAccountDialog() {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");
  const [currency, setCurrency] = useState("EGP");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAccount = useCreateAccount();

  const exponent = CURRENCIES[currency]?.exponent ?? 2;
  const balanceStep = (1 / Math.pow(10, exponent)).toFixed(exponent);
  const balancePlaceholder = (0).toFixed(exponent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let balanceMinor = 0;
    const trimmed = initialBalance.trim();
    if (trimmed !== "") {
      const isNegative = trimmed.startsWith("-");
      const unsigned = isNegative ? trimmed.slice(1) : trimmed;
      const [intPart = "0", fracRaw = ""] = unsigned.split(".");
      const padded = (fracRaw + "0".repeat(exponent)).slice(0, exponent);
      balanceMinor = parseInt(intPart + padded, 10) || 0;
      if (isNegative && balanceMinor !== 0) balanceMinor = -balanceMinor;
    }

    try {
      await createAccount.mutateAsync({
        name,
        type,
        currency,
        initial_balance: balanceMinor,
        institution: institution || undefined,
      });

      setOpen(false);
      setName("");
      setType("bank_account");
      setCurrency("EGP");
      setInstitution("");
      setInitialBalance("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unexpectedError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {t("accounts.addAccount")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("accounts.addAccount")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="account-name">{t("common.name")}</Label>
            <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-type">{t("accounts.type")}</Label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ACCOUNT_TYPES.map((t_item) => (
                <option key={t_item.value} value={t_item.value}>
                  {t(t_item.label)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-currency">{t("accounts.currency")}</Label>
            <select
              id="account-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} — {locale === "ar" ? info.nameAr : info.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-institution">{t("accounts.institution")}</Label>
            <Input
              id="account-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t("accounts.institutionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-balance">{t("accounts.balance")}</Label>
            <Input
              id="account-balance"
              type="number"
              step={balanceStep}
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder={balancePlaceholder}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createAccount.isPending}>
            {createAccount.isPending ? t("common.loading") : t("common.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
