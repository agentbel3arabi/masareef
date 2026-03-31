"use client";

import { useState } from "react";

export interface BulkSelection {
  bulkMode: boolean;
  selectedIds: Set<number>;
  enterBulkMode: () => void;
  exitBulkMode: () => void;
  toggleSelect: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  isSelected: (id: number) => boolean;
}

export function useBulkSelection(): BulkSelection {
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const enterBulkMode = () => setBulkMode(true);

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (ids: number[]) => setSelectedIds(new Set(ids));

  const clearSelection = () => setSelectedIds(new Set());

  const isSelected = (id: number) => selectedIds.has(id);

  return {
    bulkMode,
    selectedIds,
    enterBulkMode,
    exitBulkMode,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
