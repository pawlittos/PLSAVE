import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, fmtPLN } from "@/lib/api";
import { toast } from "sonner";
import { Repeat, Trash, Plus } from "@phosphor-icons/react";

export default function RecurringCard({
  categories,
  recurring,
  onChange,
  month,
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState("1");

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const save = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || amt <= 0) return toast.error("Kwota?");
    try {
      await api.post("/recurring", {
        type,
        amount: amt,
        category_id: categoryId || null,
        description,
        day_of_month: parseInt(day, 10) || 1,
      });
      toast.success("Dodano powtarzający wpis");
      setOpen(false);
      setAmount("");
      setDescription("");
      setCategoryId("");
      onChange?.();
    } catch {
      toast.error("Błąd");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/recurring/${id}`);
      onChange?.();
    } catch {
      toast.error("Nie udało się");
    }
  };

  const applyNow = async () => {
    try {
      const { data } = await api.post(`/recurring/apply?month=${month}`);
      if (data.created > 0) {
        toast.success(`Dodano ${data.created} powtarzających wpisów`);
      } else {
        toast.info("Wszystkie wpisy są już dodane w tym miesiącu");
      }
      onChange?.();
    } catch {
      toast.error("Nie udało się zastosować");
    }
  };

  return (
    <div className="balans-card" data-testid="recurring-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--balans-bg)]">
            <Repeat weight="duotone" size={18} color="#E07A5F" />
          </span>
          <div>
            <h3 className="font-display text-lg tracking-tight">
              Stałe wydatki i przychody
            </h3>
            <p className="text-xs text-[color:var(--balans-muted)]">
              Subskrypcje, czynsz, wypłata
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="balans-btn-secondary"
            onClick={applyNow}
            data-testid="apply-recurring-btn"
          >
            Zastosuj w {month.split("-")[1]}/{month.split("-")[0]}
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--balans-primary)] text-white hover:bg-[color:var(--balans-primary-hover)]"
                aria-label="Dodaj"
                data-testid="open-add-recurring-btn"
              >
                <Plus weight="bold" size={14} />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Nowy stały wpis
                </DialogTitle>
                <DialogDescription>
                  Co miesiąc dodawany automatycznie po kliknięciu „Zastosuj”.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <ToggleGroup
                  type="single"
                  value={type}
                  onValueChange={(v) => v && setType(v)}
                  className="grid grid-cols-2 gap-2"
                >
                  <ToggleGroupItem
                    value="expense"
                    className="rounded-full border data-[state=on]:bg-[color:var(--balans-primary)] data-[state=on]:text-white"
                  >
                    Wydatek
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="income"
                    className="rounded-full border data-[state=on]:bg-[color:var(--balans-secondary)] data-[state=on]:text-white"
                  >
                    Przychód
                  </ToggleGroupItem>
                </ToggleGroup>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="balans-label">Kwota</Label>
                    <Input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="rounded-xl tabular"
                      data-testid="recurring-amount-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="balans-label">Dzień miesiąca</Label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="rounded-xl tabular"
                      data-testid="recurring-day-input"
                    />
                  </div>
                </div>
                {type === "expense" && (
                  <div className="space-y-1.5">
                    <Label className="balans-label">Kategoria</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Wybierz" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="balans-label">Opis</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="np. Netflix, Czynsz"
                    className="rounded-xl"
                    data-testid="recurring-description-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full bg-[color:var(--balans-primary)] hover:bg-[color:var(--balans-primary-hover)]"
                  data-testid="save-recurring-btn"
                >
                  Zapisz
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-5 space-y-2" data-testid="recurring-list">
        {recurring.length === 0 && (
          <p className="text-sm text-[color:var(--balans-muted)] py-3">
            Brak powtarzających wpisów. Dodaj np. czynsz, Netflix, wypłatę.
          </p>
        )}
        {recurring.map((r) => {
          const cat = catMap[r.category_id];
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--balans-border)] bg-white px-4 py-3"
              data-testid={`recurring-row-${r.id}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      r.type === "income" ? "#E07A5F" : cat?.color || "#1E3A2F",
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.description || cat?.name || "Wpis"}
                  </p>
                  <p className="text-xs text-[color:var(--balans-muted)]">
                    co miesiąc, dzień {r.day_of_month}
                    {cat && r.type === "expense" ? ` · ${cat.name}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`tabular text-sm font-semibold ${
                    r.type === "income"
                      ? "text-[color:var(--balans-secondary)]"
                      : ""
                  }`}
                >
                  {r.type === "income" ? "+" : "−"}
                  {fmtPLN(r.amount)}
                </span>
                <button
                  onClick={() => remove(r.id)}
                  className="text-[color:var(--balans-muted)] hover:text-[color:var(--balans-danger)]"
                  data-testid={`delete-recurring-${r.id}`}
                  aria-label="Usuń"
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
