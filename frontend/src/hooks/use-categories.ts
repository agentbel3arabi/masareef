import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

export interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  type: string;
  icon: string | null;
  color: string | null;
  is_predefined: boolean;
  sort_order: number;
}

export function useCategories(type?: "expense" | "income") {
  const path = type
    ? `/api/v1/categories?type=${type}`
    : "/api/v1/categories";
  return useQuery({
    queryKey: ["categories", type],
    queryFn: () => apiGet<Category[]>(path),
  });
}
