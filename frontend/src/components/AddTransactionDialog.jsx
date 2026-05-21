import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";

export default function AddTransactionDialog({ categories, onCreated }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("expense");
    setAmount("");
    setCategoryId("");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || amt <= 0) {
      toast.error("Podaj poprawną kwotę");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/transactions", {
        type,
        amount: amt,
        category_id: categoryId || null,
        description,
        date,
      });
      toast.success(type === "expense" ? "Wydatek dodany" : "Przychód dodany");
      reset();
      setOpen(false);
      onCreated?.();
    } catch (e) {
      toast.error("Błąd zapisu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="balans-btn-primary"
          data-testid="open-add-transaction-btn"
        >
          <Plus weight="bold" size={16} />
          Dodaj transakcję
        </button>
      </DialogTrigger>
      <DialogContent
        className="rounded-2xl border-[color:var(--balans-border)] sm:max-w-[480px]"
        data-testid="add-transaction-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            Nowa transakcja
          </DialogTitle>
          <DialogDescription>
            Zapisz pojedynczy wydatek lub przychód.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v)}
            className="grid grid-cols-2 gap-2"
          >
            <ToggleGroupItem
              value="expense"
              className="rounded-full border border-[color:var(--balans-border)] data-[state=on]:bg-[color:var(--balans-primary)] data-[state=on]:text-white"
              data-testid="type-expense-toggle"
            >
              Wydatek
            </ToggleGroupItem>
            <ToggleGroupItem
              value="income"
              className="rounded-full border border-[color:var(--balans-border)] data-[state=on]:bg-[color:var(--balans-secondary)] data-[state=on]:text-white"
              data-testid="type-income-toggle"
            >
              Przychód
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="balans-label">
                Kwota (PLN)
              </Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border-[color:var(--balans-border)] text-lg tabular"
                data-testid="amount-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="balans-label">
                Data
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border-[color:var(--balans-border)]"
                data-testid="date-input"
              />
            </div>
          </div>

          {type === "expense" && (
            <div className="space-y-1.5">
              <Label className="balans-label">Kategoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger
                  className="rounded-xl border-[color:var(--balans-border)]"
                  data-testid="category-select"
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
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description" className="balans-label">
              Opis (opcjonalnie)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Czynsz za luty, Biedronka..."
              className="rounded-xl border-[color:var(--balans-border)]"
              rows={2}
              data-testid="description-input"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[color:var(--balans-primary)] hover:bg-[color:var(--balans-primary-hover)]"
            data-testid="submit-transaction-btn"
          >
            {submitting ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
