"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MoneyDisplay } from "@/components/shared/money-display";
import { CURRENCIES, parseMajorToMinor } from "@/lib/money";
import { UtilizationBar } from "./utilization-bar";
import { BillingBadge } from "./billing-badge";
import { useUpdateAccount, useDeleteAccount } from "@/hooks/use-accounts";
import type { Account, UpdateAccountInput } from "@/hooks/use-accounts";

export const typeIcons: Record<string, typeof Wallet> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

export const typeColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  credit_card: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  cash_wallet: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  digital_wallet: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  financing_app: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

// Used by AccountPill in transactions/account-pill.tsx
export const typePillColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  credit_card: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  cash_wallet: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  digital_wallet: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  financing_app: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");
  const Icon = typeIcons[account.type] ?? Wallet;
  const iconColor = typeColors[account.type] ?? "bg-primary/10 text-primary";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution ?? "");
  const [creditLimit, setCreditLimit] = useState(
    account.credit_limit != null ? String(account.credit_limit / Math.pow(10, CURRENCIES[account.currency]?.exponent ?? 2)) : ""
  );
  const [billingDay, setBillingDay] = useState(
    account.billing_cycle_day != null ? String(account.billing_cycle_day) : ""
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account.payment_due_day != null ? String(account.payment_due_day) : ""
  );

  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const isCreditType =
    account.type === "credit_card" || account.type === "financing_app";

  const currencyExponent = CURRENCIES[account.currency]?.exponent ?? 2;

  const openEdit = () => {
    setName(account.name);
    setInstitution(account.institution ?? "");
    setCreditLimit(account.credit_limit != null ? String(account.credit_limit / Math.pow(10, currencyExponent)) : "");
    setBillingDay(account.billing_cycle_day != null ? String(account.billing_cycle_day) : "");
    setPaymentDueDay(account.payment_due_day != null ? String(account.payment_due_day) : "");
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateAccountInput = {
      id: account.id,
      name: name || undefined,
      institution: institution === "" ? null : institution,
      credit_limit: isCreditType
        ? creditLimit === ""
          ? null
          : parseMajorToMinor(creditLimit, currencyExponent)
        : undefined,
      billing_cycle_day: isCreditType
        ? billingDay === ""
          ? null
          : parseInt(billingDay, 10)
        : undefined,
      payment_due_day: isCreditType
        ? paymentDueDay === ""
          ? null
          : parseInt(paymentDueDay, 10)
        : undefined,
    };
    await updateAccount.mutateAsync(payload);
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await deleteAccount.mutateAsync(account.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div className="relative group">
        <Link href={`/accounts/${account.id}`}>
          <Card className="hover:bg-accent/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className={`rounded-lg p-2 ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {account.name}
                </CardTitle>
                {account.institution && (
                  <p className="text-xs text-muted-foreground">{account.institution}</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <MoneyDisplay
                amount={account.displayed_balance_minor}
                currency={account.currency}
                size="lg"
                colorize
              />
              {isCreditType && account.credit_limit != null && (
                <UtilizationBar
                  balanceMinor={account.displayed_balance_minor}
                  creditLimitMinor={account.credit_limit}
                  currency={account.currency}
                />
              )}
              {isCreditType && account.payment_due_day != null && (
                <BillingBadge paymentDueDay={account.payment_due_day} />
              )}
            </CardContent>
          </Card>
        </Link>

        <div className="absolute top-2 end-2 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              openEdit();
            }}
            aria-label={t("editAccount")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
            aria-label={t("deleteAccount")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editAccount")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-account-name">{t("name")}</Label>
              <Input
                id="edit-account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-account-institution">{t("institution")}</Label>
              <Input
                id="edit-account-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={t("institutionPlaceholder")}
              />
            </div>
            {isCreditType && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-credit-limit">{t("creditLimit")}</Label>
                  <Input
                    id="edit-credit-limit"
                    type="number"
                    step={String(Math.pow(10, -currencyExponent))}
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-billing-day">{t("billingCycleDay")}</Label>
                    <Input
                      id="edit-billing-day"
                      type="number"
                      min="1"
                      max="31"
                      value={billingDay}
                      onChange={(e) => setBillingDay(e.target.value)}
                      placeholder="1–31"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-payment-due-day">{t("paymentDueDay")}</Label>
                    <Input
                      id="edit-payment-due-day"
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? tCommon("loading") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteAccount")}</DialogTitle>
            <DialogDescription>{t("deleteAccountConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={handleDelete}
            >
              {deleteAccount.isPending ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
