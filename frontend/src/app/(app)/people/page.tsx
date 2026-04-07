"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonForm } from "@/components/debts/person-form";
import { PersonList } from "@/components/people/person-list";
import type { PersonResponse } from "@/lib/types/debts";

export default function PeoplePage() {
  const t = useTranslations("people");
  const [formOpen, setFormOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<PersonResponse | null>(null);

  const handleEdit = (person: PersonResponse) => {
    setEditPerson(person);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditPerson(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => { setEditPerson(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 me-1" />
          {t("addPerson")}
        </Button>
      </header>

      {/* Person list */}
      <PersonList onEdit={handleEdit} onAdd={() => setFormOpen(true)} />

      {/* Create/Edit form sheet */}
      <PersonForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        initialData={editPerson ?? undefined}
      />
    </div>
  );
}