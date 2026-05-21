import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, fmtPLN } from "@/lib/api";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Trash,
  PiggyBank,
  Confetti,
} from "@phosphor-icons/react";

const GOAL_COLORS = [
  "#1E3A2F",
  "#E07A5F",
  "#F2CC8F",
  "#3E5743",
  "#B84A43",
  "#8B5A2B",
];

export default function GoalsCard({ goals, onChange }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(GOAL_COLORS[0]);

  const [contribOpen, setContribOpen] = useState(false);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState("");

  const resetForm = () => {
    setName("");
    setTarget("");
    setCurrent("");
    setDeadline("");
    setColor(GOAL_COLORS[0]);
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    const t = parseFloat(target.replace(",", "."));
    const c = parseFloat((current || "0").replace(",", "."));
    if (!name.trim()) return toast.error("Podaj nazwę celu");
    if (!t || t <= 0) return toast.error("Podaj kwotę docelową");
    try {
      await api.post("/goals", {
        name: name.trim(),
        target_amount: t,
        current_amount: c,
        deadline: deadline || null,
        color,
      });
      toast.success("Cel dodany");
      resetForm();
      setOpen(false);
      onChange?.();
    } catch {
      toast.error("Błąd zapisu");
    }
  };

  const contribute = async (e) => {
    e.preventDefault();
    const a = parseFloat(contribAmount.replace(",", "."));
    if (!a) return toast.error("Podaj kwotę");
    try {
      const { data } = await api.post(`/goals/${contribGoal.id}/contribute`, {
        amount: a,
      });
      if (data.current_amount >= data.target_amount) {
        toast.success("Cel osiągnięty! Brawo!");
      } else {
        toast.success(a > 0 ? "Wpłata dodana" : "Wypłata zarejestrowana");
      }
      setContribOpen(false);
      setContribAmount("");
      setContribGoal(null);
      onChange?.();
    } catch {
      toast.error("Błąd");
    }
  };

  const removeGoal = async (id) => {
    if (!window.confirm("Usunąć ten cel?")) return;
    try {
      await api.delete(`/goals/${id}`);
      onChange?.();
    } catch {
      toast.error("Nie udało się usunąć");
    }
  };

  return (
    <div className="balans-card" data-testid="goals-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--balans-bg)]">
            <PiggyBank weight="duotone" size={18} color="#E07A5F" />
          </span>
          <div>
            <h3 className="font-display text-lg tracking-tight">
              Cele oszczędnościowe
            </h3>
            <p className="text-xs text-[color:var(--balans-muted)]">
              Marzenia z planem — np. wakacje, auto, mieszkanie
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--balans-primary)] text-white hover:bg-[color:var(--balans-primary-hover)]"
              aria-label="Dodaj cel"
              data-testid="open-add-goal-btn"
            >
              <Plus weight="bold" size={14} />
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Nowy cel
              </DialogTitle>
              <DialogDescription>
                Określ ile chcesz odłożyć i na kiedy.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={saveGoal} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="balans-label">Nazwa</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Wakacje w Grecji"
                  className="rounded-xl"
                  data-testid="goal-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="balans-label">Cel (PLN)</Label>
                  <Input
                    inputMode="decimal"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="5000"
                    className="rounded-xl tabular"
                    data-testid="goal-target-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="balans-label">Mam już</Label>
                  <Input
                    inputMode="decimal"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="0"
                    className="rounded-xl tabular"
                    data-testid="goal-current-input"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="balans-label">Termin (opcjonalnie)</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="rounded-xl"
                  data-testid="goal-deadline-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="balans-label">Kolor</Label>
                <div className="flex gap-2">
                  {GOAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-all ${
                        color === c
                          ? "ring-2 ring-offset-2 ring-[color:var(--balans-primary)]"
                          : ""
                      }`}
                      style={{ background: c }}
                      aria-label={`Kolor ${c}`}
                      data-testid={`goal-color-${c}`}
                    />
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-[color:var(--balans-primary)] hover:bg-[color:var(--balans-primary-hover)]"
                data-testid="save-goal-btn"
              >
                Utwórz cel
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="goals-list">
        {goals.length === 0 && (
          <p className="col-span-full py-3 text-sm text-[color:var(--balans-muted)]">
            Brak celów. Dodaj pierwszy — np. „5000 zł na wakacje".
          </p>
        )}
        {goals.map((g) => {
          const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
          const done = g.current_amount >= g.target_amount;
          return (
            <div
              key={g.id}
              className="rounded-xl border border-[color:var(--balans-border)] bg-white p-4"
              data-testid={`goal-row-${g.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: g.color || "#1E3A2F" }}
                  >
                    {done ? (
                      <Confetti weight="fill" size={14} />
                    ) : (
                      <Target weight="duotone" size={14} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{g.name}</p>
                    {g.deadline && (
                      <p className="text-[11px] text-[color:var(--balans-muted)]">
                        do {g.deadline}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeGoal(g.id)}
                  className="text-[color:var(--balans-muted)] hover:text-[color:var(--balans-danger)]"
                  aria-label="Usuń cel"
                  data-testid={`delete-goal-${g.id}`}
                >
                  <Trash size={14} />
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="tabular text-sm font-semibold">
                    {fmtPLN(g.current_amount)}
                  </span>
                  <span className="tabular text-xs text-[color:var(--balans-muted)]">
                    / {fmtPLN(g.target_amount)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--balans-border)]">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: done ? "#3E5743" : g.color || "#1E3A2F",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setContribGoal(g);
                  setContribOpen(true);
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full border border-[color:var(--balans-border)] py-1.5 text-xs font-medium hover:border-[color:var(--balans-primary)]"
                data-testid={`contribute-goal-${g.id}`}
              >
                <Plus size={12} />
                Wpłać
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={contribOpen} onOpenChange={setContribOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Wpłata: {contribGoal?.name}
            </DialogTitle>
            <DialogDescription>
              Dodaj kwotę (lub wpisz ujemną, by zarejestrować wypłatę).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={contribute} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="balans-label">Kwota (PLN)</Label>
              <Input
                inputMode="decimal"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                placeholder="np. 500"
                className="rounded-xl tabular text-lg"
                data-testid="contribute-amount-input"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-full bg-[color:var(--balans-primary)] hover:bg-[color:var(--balans-primary-hover)]"
              data-testid="confirm-contribute-btn"
            >
              Zapisz
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
