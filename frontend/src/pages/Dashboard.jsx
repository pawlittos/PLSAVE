import { useEffect, useState, useCallback } from "react";
import { api, fmtPLN, currentMonth, monthLabel, shiftMonth } from "@/lib/api";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import TransactionsCard from "@/components/TransactionsCard";
import BudgetsCard from "@/components/BudgetsCard";
import RecurringCard from "@/components/RecurringCard";
import GoalsCard from "@/components/GoalsCard";
import { CategoryPieCard, TrendCard } from "@/components/Charts";
import AIChat from "@/components/AIChat";
import {
  CaretLeft,
  CaretRight,
  TrendUp,
  TrendDown,
  Wallet,
} from "@phosphor-icons/react";

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 });
  const [trend, setTrend] = useState([]);

  const loadAll = useCallback(async () => {
    try {
      const [cats, txs, buds, recs, gls, sum, tr] = await Promise.all([
        api.get("/categories"),
        api.get(`/transactions?month=${month}`),
        api.get(`/budgets?month=${month}`),
        api.get("/recurring"),
        api.get("/goals"),
        api.get(`/summary?month=${month}`),
        api.get("/trend?months=6"),
      ]);
      setCategories(cats.data);
      setTransactions(txs.data);
      setBudgets(buds.data);
      setRecurring(recs.data);
      setGoals(gls.data);
      setSummary(sum.data);
      setTrend(tr.data);
    } catch (e) {
      // ignore
    }
  }, [month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const isPositive = summary.balance >= 0;

  return (
    <div className="min-h-screen bg-[color:var(--balans-bg)]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-[color:var(--balans-border)] bg-[color:var(--balans-bg)]/85 backdrop-blur-xl"
        data-testid="app-header"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--balans-primary)] text-white">
              <Wallet weight="duotone" size={20} />
            </span>
            <div>
              <h1 className="font-display text-xl tracking-tight">BalansPLN</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--balans-muted)]">
                Twoje finanse, w równowadze
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1 rounded-full border border-[color:var(--balans-border)] bg-white px-1.5 py-1"
            data-testid="month-switcher"
          >
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[color:var(--balans-bg)]"
              aria-label="Poprzedni miesiąc"
              data-testid="prev-month-btn"
            >
              <CaretLeft size={14} />
            </button>
            <span
              className="px-3 text-sm font-medium tracking-wide capitalize"
              data-testid="current-month-label"
            >
              {monthLabel(month)}
            </span>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[color:var(--balans-bg)]"
              aria-label="Następny miesiąc"
              data-testid="next-month-btn"
            >
              <CaretRight size={14} />
            </button>
          </div>

          <AddTransactionDialog
            categories={categories}
            onCreated={loadAll}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Balance hero */}
        <section className="mb-10" data-testid="balance-hero">
          <p className="balans-label mb-3">Saldo miesiąca</p>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2
              className={`font-display text-5xl tracking-tighter sm:text-6xl lg:text-7xl tabular ${
                isPositive
                  ? "text-[color:var(--balans-primary)]"
                  : "text-[color:var(--balans-danger)]"
              }`}
              data-testid="main-balance"
            >
              {fmtPLN(summary.balance)}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:w-[420px]">
              <div className="balans-card !p-5" data-testid="income-summary">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--balans-secondary)]/15 text-[color:var(--balans-secondary)]">
                    <TrendUp weight="bold" size={14} />
                  </span>
                  <span className="balans-label">Przychody</span>
                </div>
                <p className="mt-3 font-display text-2xl tabular text-[color:var(--balans-secondary)]">
                  {fmtPLN(summary.income)}
                </p>
              </div>
              <div className="balans-card !p-5" data-testid="expenses-summary">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--balans-primary)]/10 text-[color:var(--balans-primary)]">
                    <TrendDown weight="bold" size={14} />
                  </span>
                  <span className="balans-label">Wydatki</span>
                </div>
                <p className="mt-3 font-display text-2xl tabular text-[color:var(--balans-primary)]">
                  {fmtPLN(summary.expenses)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento grid */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TransactionsCard
              transactions={transactions}
              categories={categories}
              onChange={loadAll}
            />
          </div>
          <div className="lg:col-span-1">
            <CategoryPieCard
              breakdown={summary.breakdown || []}
              categories={categories}
            />
          </div>

          <div className="lg:col-span-1">
            <BudgetsCard
              month={month}
              categories={categories}
              budgets={budgets}
              expenses={transactions}
              onChange={loadAll}
            />
          </div>
          <div className="lg:col-span-2">
            <TrendCard trend={trend} />
          </div>

          <div className="lg:col-span-3">
            <RecurringCard
              categories={categories}
              recurring={recurring}
              onChange={loadAll}
              month={month}
            />
          </div>

          <div className="lg:col-span-3">
            <GoalsCard goals={goals} onChange={loadAll} />
          </div>
        </section>

        <footer className="mt-12 pb-8 text-center text-xs text-[color:var(--balans-muted)]">
          BalansPLN · zaprojektowane dla spokojnego budżetowania w PLN
        </footer>
      </main>

      <AIChat month={month} />
    </div>
  );
}
