"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useInstitutions,
  useCreateInstitution,
  type Institution,
} from "@/hooks/use-institutions";

/** Map account type to institution type for the API query */
function institutionTypeFor(
  accountType: string
): "bank" | "bnpl" | "digital_wallet_provider" | null {
  switch (accountType) {
    case "bank_account":
    case "credit_card":
      return "bank";
    case "financing_app":
      return "bnpl";
    case "digital_wallet":
      return "digital_wallet_provider";
    default:
      return null; // cash_wallet — no institution needed
  }
}

interface InstitutionSelectorProps {
  accountType: string;
  value: Institution | null;
  onChange: (inst: Institution | null) => void;
}

export function InstitutionSelector({
  accountType,
  value,
  onChange,
}: InstitutionSelectorProps) {
  const t = useTranslations("institutions");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [otherMode, setOtherMode] = useState(false);
  const [otherNameEn, setOtherNameEn] = useState("");
  const [otherNameAr, setOtherNameAr] = useState("");

  const instType = institutionTypeFor(accountType);
  const { data: listResp, isLoading } = useInstitutions(
    instType ?? "bank",
    search || undefined,
    !!instType
  );
  const createInstitution = useCreateInstitution();

  // No institution needed for cash_wallet
  if (!instType) return null;

  const popular = listResp?.data?.popular ?? [];
  const all = listResp?.data?.all ?? [];

  // Type-specific label keys
  const allLabel =
    instType === "bnpl"
      ? t("allProviders")
      : instType === "digital_wallet_provider"
        ? t("allWalletProviders")
        : t("allBanks");
  const otherLabel =
    instType === "bnpl"
      ? t("otherProvider")
      : instType === "digital_wallet_provider"
        ? t("otherWalletProvider")
        : t("other");
  const enterNameLabel =
    instType === "bnpl"
      ? t("enterProviderName")
      : instType === "digital_wallet_provider"
        ? t("enterWalletProviderName")
        : t("enterName");

  const displayName = (inst: Institution) =>
    locale === "ar" ? inst.name_ar : inst.name_en;

  const initials = (inst: Institution) => {
    const name = inst.name_en;
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  const handleCreateOther = async () => {
    if (!otherNameEn.trim() || !otherNameAr.trim()) return;
    try {
      const resp = await createInstitution.mutateAsync({
        name_en: otherNameEn.trim(),
        name_ar: otherNameAr.trim(),
        type: instType,
      });
      onChange(resp.data);
      setOtherMode(false);
      setOtherNameEn("");
      setOtherNameAr("");
    } catch {
      // error toast handled by useApiMutation
    }
  };

  // Selected state — show institution with Change button
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
        {value.logo_url ? (
          <img
            src={value.logo_url}
            alt={displayName(value)}
            className="h-8 w-8 rounded-md object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
            {initials(value)}
          </div>
        )}
        <span className="flex-1 text-sm font-medium">{displayName(value)}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          {t("change")}
        </Button>
      </div>
    );
  }

  // "Other" inline form
  if (otherMode) {
    return (
      <div className="space-y-3 rounded-md border border-input p-3">
        <p className="text-sm font-medium text-muted-foreground">
          {enterNameLabel}
        </p>
        <div className="space-y-2">
          <Label htmlFor="inst-name-en" className="text-xs">
            {t("nameEn")}
          </Label>
          <Input
            id="inst-name-en"
            value={otherNameEn}
            onChange={(e) => setOtherNameEn(e.target.value)}
            placeholder="e.g. My Bank"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inst-name-ar" className="text-xs">
            {t("nameAr")}
          </Label>
          <Input
            id="inst-name-ar"
            value={otherNameAr}
            onChange={(e) => setOtherNameAr(e.target.value)}
            placeholder="مثال: بنكي"
            dir="rtl"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleCreateOther}
            disabled={
              !otherNameEn.trim() ||
              !otherNameAr.trim() ||
              createInstitution.isPending
            }
          >
            {createInstitution.isPending ? "..." : t("add")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOtherMode(false)}
          >
            {t("change")}
          </Button>
        </div>
      </div>
    );
  }

  // Dropdown-like list
  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
      />
      <div className="max-h-56 overflow-y-auto rounded-md border border-input">
        {isLoading && (
          <p className="px-3 py-2 text-sm text-muted-foreground">...</p>
        )}

        {/* Popular section */}
        {popular.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("popular")}
            </p>
            {popular.map((inst) => (
              <InstitutionRow
                key={inst.id}
                institution={inst}
                locale={locale}
                initials={initials(inst)}
                onClick={() => onChange(inst)}
              />
            ))}
            <div className="mx-3 border-t border-border/40" />
          </>
        )}

        {/* All section */}
        {all.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {allLabel}
            </p>
            {all.map((inst) => (
              <InstitutionRow
                key={inst.id}
                institution={inst}
                locale={locale}
                initials={initials(inst)}
                onClick={() => onChange(inst)}
              />
            ))}
          </>
        )}

        {/* "Other" option */}
        <button
          type="button"
          className="w-full px-3 py-2 text-start text-sm text-primary hover:bg-accent transition-colors"
          onClick={() => setOtherMode(true)}
        >
          {otherLabel}
        </button>
      </div>
    </div>
  );
}

function InstitutionRow({
  institution,
  locale,
  initials,
  onClick,
}: {
  institution: Institution;
  locale: string;
  initials: string;
  onClick: () => void;
}) {
  const displayName =
    locale === "ar" ? institution.name_ar : institution.name_en;

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-accent transition-colors"
      )}
      onClick={onClick}
    >
      {institution.logo_url ? (
        <img
          src={institution.logo_url}
          alt={displayName}
          className="h-6 w-6 rounded object-contain"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
          {initials}
        </div>
      )}
      <span className="flex-1">{displayName}</span>
      {institution.is_popular && (
        <span className="text-[10px] text-muted-foreground">★</span>
      )}
    </button>
  );
}
