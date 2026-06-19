"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowUpDown } from "lucide-react";
import { useState } from "react";

export type FilterState = {
  q: string;
  minPrice: string;
  maxPrice: string;
  sort: "recent" | "price_asc" | "price_desc";
};

export const emptyFilter: FilterState = {
  q: "",
  minPrice: "",
  maxPrice: "",
  sort: "recent",
};

export function ListingSearch({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Rechercher une annonce…"
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            className="h-10 pl-9 rounded-full"
          />
          {value.q && (
            <button
              onClick={() => onChange({ ...value, q: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full bg-slate-200 hover:bg-slate-300"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button
          variant={open ? "default" : "outline"}
          size="icon"
          onClick={() => setOpen(!open)}
          className="h-10 w-10 rounded-full shrink-0"
          title="Filtres prix"
        >
          <ArrowUpDown className="size-4" />
        </Button>
      </div>

      {open && (
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] text-slate-500 font-medium block mb-1">
              Prix min
            </label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={value.minPrice}
              onChange={(e) => onChange({ ...value, minPrice: e.target.value })}
              className="h-9 rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] text-slate-500 font-medium block mb-1">
              Prix max
            </label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="100000"
              value={value.maxPrice}
              onChange={(e) => onChange({ ...value, maxPrice: e.target.value })}
              className="h-9 rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[11px] text-slate-500 font-medium block mb-1">
              Trier
            </label>
            <select
              value={value.sort}
              onChange={(e) =>
                onChange({
                  ...value,
                  sort: e.target.value as FilterState["sort"],
                })
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="recent">Plus récentes</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(emptyFilter)}
            className="h-9 rounded-lg text-slate-500"
          >
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  );
}

export function StarsDisplay({
  stars,
  size = "sm",
}: {
  stars: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-4";
  const avg = Math.round(stars);
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`${sizeCls} ${
            i < avg ? "text-amber-400" : "text-slate-200"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function StarsInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = (hover || value) >= n;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`size-10 text-3xl transition-transform hover:scale-110 ${
              active ? "text-amber-400" : "text-slate-200"
            }`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function avgRating(ratings: { stars: number }[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
}
