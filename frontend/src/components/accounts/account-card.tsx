"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag, Pencil, Trash2 } from "lucide-react";
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
import { CURRENCIES, parseMajorToMinor, formatAmount } from "@/lib/money";
import { UtilizationBar } from "./utilization-bar";
import { useUpdateAccount, useDeleteAccount } from "@/hooks/use-accounts";
import type { Account, UpdateAccountInput } from "@/hooks/use-accounts";
import { cn } from "@/lib/utils";

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
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

// Credit card physical face gradient — alternates by account id
function creditCardGradient(id: number): string {
  return id % 2 === 1
    ? "from-slate-800 to-slate-900"    // dark navy
    : "from-emerald-800 to-emerald-900"; // dark green
}

// Last 4 digits placeholder based on account id
function maskedLast4(id: number): string {
  return String(id).padStart(4, "0").slice(-4);
}

function CreditAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}) {
  const t = useTranslations("accounts");
  const gradient = creditCardGradient(account.id);
  const last4 = maskedLast4(account.id);
  const available =
    account.credit_limit != null
      ? account.credit_limit + account.displayed_balance_minor
      : null;

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      <Link href={manageMode ? "#" : `/accounts/${account.id}`} onClick={manageMode ? (e) => { e.preventDefault(); onSelect?.(account.id); } : undefined}>
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer">
          {/* Physical card face */}
          <div className={cn("bg-gradient-to-br p-5 relative h-40", gradient)}>
            {manageMode && (
              <button
                onClick={(e) => { e.preventDefault(); onSelect?.(account.id); }}
                className={cn(
                  "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all",
                  selected
                    ? "bg-primary border-primary text-white"
                    : "bg-white/20 border-white/60"
                )}
                aria-label={t("editAccount")}
              >
                {selected && <span className="text-xs font-bold">✓</span>}
              </button>
            )}
            <div className="flex items-start justify-between mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                {account.institution || account.name}
              </p>
              <div className="flex gap-1">
                <div className="w-7 h-5 rounded bg-white/20" />
                <div className="w-7 h-5 rounded bg-white/10 -ms-3" />
              </div>
            </div>
            <p className="text-sm font-mono tracking-[0.2em] text-white/90 mb-4">
              •••• •••• •••• {last4}
            </p>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5">
                Cardholder
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-white">
                {account.name}
              </p>
            </div>
          </div>

          {/* Stats below the card face */}
          <div className="p-4 space-y-3">
            {account.credit_limit != null && (
              <UtilizationBar
                balanceMinor={account.displayed_balance_minor}
                creditLimitMinor={account.credit_limit}
                currency={account.currency}
              />
            )}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("creditLimit")}
                </p>
                <p className="text-xs font-semibold">
                  {account.credit_limit != null
                    ? formatAmount(account.credit_limit, account.currency)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("amountDue")}
                </p>
                <p className="text-xs font-semibold text-destructive">
                  {formatAmount(
                    Math.abs(account.displayed_balance_minor),
                    account.currency
                  )}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("available")}
                </p>
                <p className="text-xs font-semibold text-primary">
                  {available != null
                    ? formatAmount(available, account.currency)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {!manageMode && (
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-white/20 text-white hover:bg-white/30"
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            aria-label={t("editAccount")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-white/20 text-white hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            aria-label={t("deleteAccount")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function BankAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}) {
  const t = useTranslations("accounts");

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      <Link href={manageMode ? "#" : `/accounts/${account.id}`} onClick={manageMode ? (e) => { e.preventDefault(); onSelect?.(account.id); } : undefined}>
        <div className="bg-white rounded-lg p-5 shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer">
          {manageMode && (
            <button
              onClick={(e) => { e.preventDefault(); onSelect?.(account.id); }}
              className={cn(
                "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all",
                selected
                  ? "bg-primary border-primary text-white"
                  : "bg-background/90 border-border"
              )}
              aria-label={t("editAccount")}
            >
              {selected && <span className="text-xs font-bold">✓</span>}
            </button>
          )}
          {account.institution && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {account.institution}
            </p>
          )}
          <p className="text-sm font-medium text-foreground mb-3">{account.name}</p>
          <MoneyDisplay
            amount={account.displayed_balance_minor}
            currency={account.currency}
            size="lg"
            colorize
          />
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active
            </span>
          </div>
        </div>
      </Link>
      {!manageMode && (
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              onEdit();
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
              onDelete();
            }}
            aria-label={t("deleteAccount")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function OtherAccountCard({
  account,
  onEdit,
  onDelete,
  manageMode,
  selected,
  onSelect,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  manageMode?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}) {
  const t = useTranslations("accounts");
  const Icon = typeIcons[account.type] ?? Wallet;
  const iconColor = typeColors[account.type] ?? "bg-primary/10 text-primary";

  // Extract just the background color class for the accent stripe
  const accentBg = iconColor.split(" ")[0]; // e.g. "bg-green-100"

  return (
    <div className={cn("relative group", selected && "ring-2 ring-primary rounded-lg")}>
      <Link href={manageMode ? "#" : `/accounts/${account.id}`} onClick={manageMode ? (e) => { e.preventDefault(); onSelect?.(account.id); } : undefined}>
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:-translate-y-1 transition-all duration-200 cursor-pointer flex">
          {/* Left accent stripe */}
          <div className={cn("w-1.5 shrink-0", accentBg)} />
          {/* Card content */}
          <div className="flex-1 p-5">
            {manageMode && (
              <button
                onClick={(e) => { e.preventDefault(); onSelect?.(account.id); }}
                className={cn(
                  "absolute top-2 end-2 z-20 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all",
                  selected
                    ? "bg-primary border-primary text-white"
                    : "bg-background/90 border-border"
                )}
                aria-label={t("editAccount")}
              >
                {selected && <span className="text-xs font-bold">✓</span>}
              </button>
            )}
            <div className={cn("inline-flex rounded-lg p-2 mb-3", iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">{account.name}</p>
            {account.institution && (
              <p className="text-xs text-muted-foreground mb-3">{account.institution}</p>
            )}
            <MoneyDisplay
              amount={account.displayed_balance_minor}
              currency={account.currency}
              size="lg"
              colorize
            />
          </div>
        </div>
      </Link>
      {!manageMode && (
        <div className="absolute top-3 end-3 hidden group-hover:flex group-focus-within:flex gap-1 z-10">
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-background"
            onClick={(e) => { e.preventDefault(); onEdit(); }} aria-label={t("editAccount")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.preventDefault(); onDelete(); }} aria-label={t("deleteAccount")}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function AccountCard({ account, manageMode, selected, onSelect }: AccountCardProps) {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution ?? "");
  const [creditLimit, setCreditLimit] = useState(
    account.credit_limit != null
      ? String(
          account.credit_limit /
            Math.pow(10, CURRENCIES[account.currency]?.exponent ?? 2)
        )
      : ""
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
    setCreditLimit(
      account.credit_limit != null
        ? String(account.credit_limit / Math.pow(10, currencyExponent))
        : ""
    );
    setBillingDay(
      account.billing_cycle_day != null ? String(account.billing_cycle_day) : ""
    );
    setPaymentDueDay(
      account.payment_due_day != null ? String(account.payment_due_day) : ""
    );
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

  const isCreditCard = account.type === "credit_card";
  const isOther =
    account.type === "cash_wallet" || account.type === "digital_wallet" || account.type === "financing_app";

  return (
    <>
      {isCreditCard ? (
        <CreditAccountCard
          account={account}
          onEdit={openEdit}
          onDelete={() => setDeleteOpen(true)}
          manageMode={manageMode}
          selected={selected}
          onSelect={onSelect}
        />
      ) : isOther ? (
        <OtherAccountCard
          account={account}
          onEdit={openEdit}
          onDelete={() => setDeleteOpen(true)}
          manageMode={manageMode}
          selected={selected}
          onSelect={onSelect}
        />
      ) : (
        <BankAccountCard
          account={account}
          onEdit={openEdit}
          onDelete={() => setDeleteOpen(true)}
          manageMode={manageMode}
          selected={selected}
          onSelect={onSelect}
        />
      )}

      {/* Edit dialog */}
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
                    <Label htmlFor="edit-payment-due-day">
                      {t("paymentDueDay")}
                    </Label>
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
