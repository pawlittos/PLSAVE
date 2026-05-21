import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChatCircleText, PaperPlaneTilt, Sparkle, Trash } from "@phosphor-icons/react";

export default function AIChat({ month }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/ai/messages");
      setMessages(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    // optimistic
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: "user", content: text, created_at: "" },
    ]);
    setLoading(true);
    try {
      await api.post("/ai/chat", { message: text, month });
      await load();
    } catch (e) {
      toast.error("AI niedostępne. Sprawdź klucz EMERGENT_LLM_KEY.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await api.delete("/ai/messages");
      setMessages([]);
      toast.success("Wyczyszczono historię");
    } catch {
      toast.error("Błąd");
    }
  };

  const suggestions = [
    "Gdzie wydaję najwięcej?",
    "Jak mogę zaoszczędzić w tym miesiącu?",
    "Czy moje subskrypcje są opłacalne?",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-[color:var(--balans-primary)] px-5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--balans-primary-hover)]"
          data-testid="open-ai-chat-btn"
        >
          <Sparkle weight="fill" size={18} />
          Asystent AI
        </button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[80vh] max-h-[700px] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[540px]"
        data-testid="ai-chat-dialog"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[color:var(--balans-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--balans-primary)] text-white">
              <Sparkle weight="duotone" size={20} />
            </span>
            <div>
              <DialogTitle className="font-display text-lg">
                Doradca finansowy
              </DialogTitle>
              <p className="text-xs text-[color:var(--balans-muted)]">
                Analizuje Twoje dane • {month}
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="rounded-full p-2 text-[color:var(--balans-muted)] hover:bg-[color:var(--balans-bg)] hover:text-[color:var(--balans-danger)]"
            aria-label="Wyczyść"
            data-testid="clear-ai-chat-btn"
          >
            <Trash size={16} />
          </button>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto bg-[color:var(--balans-bg)] px-5 py-5"
          data-testid="ai-messages-container"
        >
          {messages.length === 0 && (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <ChatCircleText weight="duotone" size={28} color="#1E3A2F" />
              </div>
              <div>
                <p className="font-display text-lg">
                  Cześć! Pomogę Ci zarządzać finansami.
                </p>
                <p className="mt-1 text-sm text-[color:var(--balans-muted)]">
                  Zapytaj o swoje wydatki w bieżącym miesiącu.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-[color:var(--balans-border)] bg-white px-3 py-1.5 text-xs hover:border-[color:var(--balans-primary)]"
                    data-testid={`suggestion-${s.slice(0, 10)}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${m.role}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[color:var(--balans-ochre)] text-[color:var(--balans-text)]"
                    : "bg-[color:var(--balans-primary)] text-white"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start" data-testid="ai-loading">
              <div className="rounded-2xl bg-[color:var(--balans-primary)] px-4 py-2.5 text-white">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-[color:var(--balans-border)] bg-white px-4 py-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zapytaj o swoje finanse..."
            className="rounded-full border-[color:var(--balans-border)]"
            data-testid="ai-chat-input"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--balans-primary)] text-white disabled:opacity-50"
            aria-label="Wyślij"
            data-testid="ai-chat-send-btn"
          >
            <PaperPlaneTilt weight="fill" size={16} />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
