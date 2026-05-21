import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api, fmtPLN } from "@/lib/api";
import { toast } from "sonner";
import { Target, Trash } from "@phosphor-icons/react";

export default function BudgetsCard({
  month,
  categories,
  budgets,
  expenses,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  // map: category_id -> spent this month
  const spentByCat = {};
  expenses.forEach((t) => {
    if (t.type === "expense" && t.category_id) {
      spentByCat[t.category_id] = (spentByCat[t.category_id] || 0) + t.amount;
    }
  });

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const save = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    if (!categoryId) return toast.error("Wybierz kategorię");
    if (!amt || amt <= 0) return toast.error("Podaj poprawną kwotę");
    try {
      await api.post("/budgets", { category_id: categoryId, month, amount: amt });
      toast.success("Budżet zapisany");
      setOpen(false);
      setCategoryId("");
      setAmount("");
      onChange?.();
    } catch {
      toast.error("Błąd zapisu");
    }
  };

  const removeBudget = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      onChange?.();
    } catch {
      toast.error("Nie udało się usunąć");
    }
  };

  return (
    <div className="balans-card" data-testid="budgets-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--balans-bg)]">
            <Target weight="duotone" size={18} color="#1E3A2F" />
          </span>
          <div>
            <h3 className="font-display text-lg tracking-tight">Budżety miesięczne</h3>
            <p className="text-xs text-[color:var(--balans-muted)]">
              Limity wydatków per kategoria
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="balans-btn-secondary" data-testid="open-budget-dialog-btn">
              Ustaw limit
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Ustaw budżet
              </DialogTitle>
              <DialogDescription>
                Limit miesięczny dla wybranej kategorii.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="balans-label">Kategoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger
                    className="rounded-xl"
                    data-testid="budget-category-select"
                  >
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="balans-label">Limit (PLN)</Label>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="np. 1500"
                  className="rounded-xl tabular text-lg"
                  data-testid="budget-amount-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-[color:var(--balans-primary)] hover:bg-[color:var(--balans-primary-hover)]"
                data-testid="save-budget-btn"
              >
                Zapisz
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 space-y-4" data-testid="budgets-list">
        {budgets.length === 0 && (
          <p className="text-sm text-[color:var(--balans-muted)] py-4">
            Brak budżetów na ten miesiąc. Ustaw pierwszy limit, by śledzić wydatki.
          </p>
        )}
        {budgets.map((b) => {
          const cat = catMap[b.category_id];
          const spent = spentByCat[b.category_id] || 0;
          const pct = Math.min((spent / b.amount) * 100, 100);
          const over = spent > b.amount;
          return (
            <div key={b.id} data-testid={`budget-row-${b.id}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: cat?.color || "#999" }}
                  />
                  <span className="text-sm font-medium">
                    {cat?.name || "Nieznana"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm tabular ${
                      over ? "text-[color:var(--balans-danger)] font-semibold" : ""
                    }`}
                  >
                    {fmtPLN(spent)} / {fmtPLN(b.amount)}
                  </span>
                  <button
                    onClick={() => removeBudget(b.id)}
                    className="text-[color:var(--balans-muted)] hover:text-[color:var(--balans-danger)]"
                    aria-label="Usuń budżet"
                    data-testid={`delete-budget-${b.id}`}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--balans-border)]">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: over ? "#B84A43" : "#1E3A2F",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
