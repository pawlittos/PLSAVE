import { useState, useMemo } from "react";
import { fmtPLN } from "@/lib/api";
import { Trash, MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TransactionsCard({ transactions, categories, onChange }) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | income | expense | <category_id>

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter === "income" && t.type !== "income") return false;
      if (filter === "expense" && t.type !== "expense") return false;
      if (
        filter !== "all" &&
        filter !== "income" &&
        filter !== "expense" &&
        t.category_id !== filter
      )
        return false;
      if (!q) return true;
      const desc = (t.description || "").toLowerCase();
      const catName = (catMap[t.category_id]?.name || "").toLowerCase();
      return (
        desc.includes(q) ||
        catName.includes(q) ||
        String(t.amount).includes(q) ||
        t.date.includes(q)
      );
    });
  }, [transactions, query, filter, catMap]);

  const remove = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      onChange?.();
    } catch {
      toast.error("Nie udało się usunąć");
    }
  };

  return (
    <div className="balans-card" data-testid="transactions-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-lg tracking-tight">Transakcje</h3>
          <p className="text-xs text-[color:var(--balans-muted)]">
            Ostatnie operacje w tym miesiącu
          </p>
        </div>
        <span className="balans-label" data-testid="transactions-count">
          {filtered.length} / {transactions.length}
        </span>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--balans-muted)]"
            size={14}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj opisu, kategorii, kwoty..."
            className="rounded-xl border-[color:var(--balans-border)] pl-9 text-sm"
            data-testid="transactions-search-input"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger
            className="rounded-xl sm:w-48 border-[color:var(--balans-border)]"
            data-testid="transactions-filter-select"
          >
            <SelectValue placeholder="Filtruj" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="income">Tylko przychody</SelectItem>
            <SelectItem value="expense">Tylko wydatki</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="max-h-[440px] space-y-1.5 overflow-y-auto pr-1"
        data-testid="transactions-list"
      >
        {transactions.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-[color:var(--balans-muted)]">
              Brak transakcji w tym miesiącu.
            </p>
            <p className="mt-1 text-xs text-[color:var(--balans-muted)]">
              Kliknij „Dodaj transakcję", by zacząć.
            </p>
          </div>
        )}

        {transactions.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-[color:var(--balans-muted)]">
              Brak wyników dla wybranego filtru.
            </p>
          </div>
        )}

        {filtered.map((t) => {
          const cat = catMap[t.category_id];
          const isIncome = t.type === "income";
          return (
            <div
              key={t.id}
              className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-[color:var(--balans-bg)]"
              data-testid={`transaction-row-${t.id}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase"
                  style={{
                    background: isIncome
                      ? "rgba(224,122,95,0.12)"
                      : `${cat?.color || "#1E3A2F"}22`,
                    color: isIncome ? "#D06A4F" : cat?.color || "#1E3A2F",
                  }}
                >
                  {isIncome ? "+" : cat?.name?.slice(0, 2) || "•"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.description || cat?.name || (isIncome ? "Przychód" : "Wydatek")}
                  </p>
                  <p className="text-xs text-[color:var(--balans-muted)]">
                    {t.date}
                    {cat && ` · ${cat.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`tabular text-sm font-semibold ${
                    isIncome
                      ? "text-[color:var(--balans-secondary)]"
                      : "text-[color:var(--balans-text)]"
                  }`}
                >
                  {isIncome ? "+" : "−"}
                  {fmtPLN(t.amount)}
                </span>
                <button
                  onClick={() => remove(t.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-[color:var(--balans-muted)] hover:text-[color:var(--balans-danger)]"
                  aria-label="Usuń"
                  data-testid={`delete-transaction-${t.id}`}
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
