import {
  ArrowLeftRight,
  Banknote,
  Car,
  Film,
  Fuel,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Home,
  Landmark,
  Laptop,
  Phone,
  PiggyBank,
  PlusCircle,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "arrow-left-right": ArrowLeftRight,
  "banknote": Banknote,
  "car": Car,
  "film": Film,
  "fuel": Fuel,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  "help-circle": HelpCircle,
  "home": Home,
  "landmark": Landmark,
  "laptop": Laptop,
  "phone": Phone,
  "piggy-bank": PiggyBank,
  "plus-circle": PlusCircle,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  "utensils": Utensils,
  "zap": Zap,
};

interface CategoryIconProps {
  icon: string | null | undefined;
  className?: string;
}

export function CategoryIcon({ icon, className = "h-4 w-4" }: CategoryIconProps) {
  if (!icon) return null;
  const Icon = ICON_MAP[icon];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function getCategoryIcon(icon: string | null | undefined): LucideIcon | null {
  if (!icon) return null;
  return ICON_MAP[icon] ?? null;
}
