import { fmtPLN } from "@/lib/api";
import { Trash } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransactionsCard({ transactions, categories, onChange }) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg tracking-tight">Transakcje</h3>
          <p className="text-xs text-[color:var(--balans-muted)]">
            Ostatnie operacje w tym miesiącu
          </p>
        </div>
        <span className="balans-label" data-testid="transactions-count">
          {transactions.length} pozycji
        </span>
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

        {transactions.map((t) => {
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
