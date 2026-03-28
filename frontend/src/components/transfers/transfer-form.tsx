"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { CURRENCIES } from "@/lib/money";
import { ArrowLeftRight } from "lucide-react";

export function TransferForm() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { data: accountsData } = useAccounts();
  const createTransfer = useCreateTransfer();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [fxRate, setFxRate] = useState("");

  const accounts = accountsData?.data || [];
  const fromAccount = accounts.find((a) => a.id === Number(fromId));
  const toAccount = accounts.find((a) => a.id === Number(toId));
  const isCrossCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const exponent = CURRENCIES[fromAccount?.currency || "EGP"]?.exponent ?? 2;
    const amountMinor = Math.round(parseFloat(amount) * Math.pow(10, exponent));

    await createTransfer.mutateAsync({
      from_account_id: Number(fromId),
      to_account_id: Number(toId),
      amount_minor: amountMinor,
      date,
      description: description || undefined,
      fx_rate_minor_units: isCrossCurrency && fxRate
        ? Math.round(parseFloat(fxRate) * 10000)
        : undefined,
    });

    setOpen(false);
    setFromId("");
    setToId("");
    setAmount("");
    setDescription("");
    setFxRate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ArrowLeftRight className="h-4 w-4 me-2" />
          New Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Between Accounts</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>From Account</Label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>To Account</Label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select...</option>
              {accounts.filter((a) => a.id !== Number(fromId)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Amount ({fromAccount?.currency || ""})</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {isCrossCurrency && (
            <div className="space-y-2">
              <Label>
                Exchange Rate ({fromAccount?.currency} to {toAccount?.currency})
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                placeholder="e.g., 0.0199"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., ATM withdrawal"
            />
          </div>

          <Button type="submit" className="w-full" disabled={createTransfer.isPending}>
            {createTransfer.isPending ? t("common.loading") : "Transfer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
