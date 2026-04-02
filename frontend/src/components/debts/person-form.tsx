"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreatePerson, useUpdatePerson } from "@/hooks/use-persons";
import type { PersonResponse, PersonRelationship } from "@/lib/types/debts";

interface PersonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: PersonResponse;
}

const RELATIONSHIPS: PersonRelationship[] = [
  "family",
  "friend",
  "colleague",
  "business",
  "other",
];

export function PersonForm({ open, onOpenChange, initialData }: PersonFormProps) {
  const tForm = useTranslations("persons.form");
  const isEdit = !!initialData;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? tForm("editTitle") : tForm("title")}
      description={isEdit ? tForm("editDescription") : tForm("description")}
    >
      {/* key forces remount when switching between create/edit or different items */}
      <PersonFormContent
        key={initialData?.id ?? "new"}
        initialData={initialData}
        onOpenChange={onOpenChange}
      />
    </FormSheet>
  );
}

function PersonFormContent({
  initialData,
  onOpenChange,
}: Omit<PersonFormProps, "open">) {
  const t = useTranslations("persons");
  const tForm = useTranslations("persons.form");
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [nameAr, setNameAr] = useState(initialData?.name_ar ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [relationship, setRelationship] = useState(
    initialData?.relationship ?? ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();

  const resetFields = () => {
    setName("");
    setNameAr("");
    setPhone("");
    setEmail("");
    setRelationship("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && initialData) {
      updateMutation.mutate(
        {
          id: initialData.id,
          name,
          name_ar: nameAr || null,
          phone: phone || null,
          email: email || null,
          relationship: (relationship as PersonRelationship) || null,
          notes: notes || null,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createMutation.mutate(
        {
          name,
          name_ar: nameAr || null,
          phone: phone || null,
          email: email || null,
          relationship: (relationship as PersonRelationship) || null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetFields();
          },
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="person-name">{t("name")}</Label>
          <Input
            id="person-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="person-name-ar">{t("nameAr")}</Label>
          <Input
            id="person-name-ar"
            dir="rtl"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="person-phone">{t("phone")}</Label>
          <Input
            id="person-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="person-email">{t("email")}</Label>
          <Input
            id="person-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("relationship")}</Label>
          <Select value={relationship} onValueChange={(v) => setRelationship(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tForm("selectRelationship")} />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((rel) => (
                <SelectItem key={rel} value={rel}>
                  {t(`relationships.${rel}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="person-notes">{t("notes")}</Label>
          <textarea
            id="person-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? tForm("saving") : isEdit ? tForm("update") : tForm("submit")}
        </Button>
      </form>
  );
}
