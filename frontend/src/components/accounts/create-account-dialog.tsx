"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank_account");
  const [currency, setCurrency] = useState("EGP");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  const createAccount = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceMinor = initialBalance
      ? Math.round(parseFloat(initialBalance) * 100)
      : 0;

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
          <div className="space-y-2">
            <Label>{t("common.name") || "Name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <select
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
            <Label>Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} — {info.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Institution</Label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., CIB, HSBC"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("accounts.balance")}</Label>
            <Input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0.00"
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
