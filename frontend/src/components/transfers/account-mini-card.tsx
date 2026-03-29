import { Wallet, CreditCard, Banknote, Smartphone, ShoppingBag } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  bank_account: Wallet,
  credit_card: CreditCard,
  cash_wallet: Banknote,
  digital_wallet: Smartphone,
  financing_app: ShoppingBag,
};

const typeColors: Record<string, string> = {
  bank_account: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  credit_card: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  cash_wallet: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  digital_wallet: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  financing_app: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

interface AccountMiniCardProps {
  id: number;
  name: string;
  institution: string | null;
  type: string;
  currency: string;
}

export function AccountMiniCard({ id: _id, name, institution, type, currency: _currency }: AccountMiniCardProps) {
  const Icon = typeIcons[type] || Wallet;
  const colorClass = typeColors[type] || "bg-muted text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-md p-1.5 ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {institution && (
          <p className="text-xs text-muted-foreground truncate">{institution}</p>
        )}
      </div>
    </div>
  );
}
