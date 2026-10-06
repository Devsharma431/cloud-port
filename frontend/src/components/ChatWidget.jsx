import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowUp } from "lucide-react";
import { streamChat, SUGGESTIONS } from "../lib/chatbot";
import { ChatMessage } from "./ChatMessage";

const SESSION_KEY = "cloud-chat-session";

const getSession = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open || sessionRef.current) return;
    sessionRef.current = getSession();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "", streaming: true }]);

    const update = (content, extra = {}) =>
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content, ...extra };
        return next;
      });

    try {
      const full = await streamChat(message, (_, acc) => update(acc, { streaming: true }), { aborted: false });
      update(full);
    } catch (err) {
      update(err.message || "Something went wrong. Please try the contact form.");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            data-testid="chat-panel"
            className="fixed bottom-24 right-4 md:right-8 z-[90] flex w-[calc(100vw-2rem)] max-w-[400px] h-[min(600px,calc(100vh-8rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b]/95 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="font-heading text-lg font-semibold leading-none">Ask Cloud</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a1a1aa] mt-1.5">Replies instantly · Powered locally</div>
              </div>
              <button onClick={() => setOpen(false)} data-testid="chat-close" aria-label="Close chat" className="text-[#a1a1aa] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="pt-2">
                  <p className="text-sm text-[#a1a1aa] leading-relaxed px-1">
                    Hey, I&apos;m Cloud&apos;s assistant. Ask about timelines, pricing, availability or how we work.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        data-testid="chat-suggestion"
                        className="text-left rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#d4d4d8] hover:border-[#2997FF] hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} streaming={m.streaming} />
              ))}
              <div ref={endRef} />
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="flex items-end gap-2 rounded-2xl bg-[#141414] border border-white/10 px-3 py-2 focus-within:border-[#2997FF]/60 transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={1}
                  maxLength={2000}
                  placeholder="Ask anything about working with Cloud…"
                  data-testid="chat-input"
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-[#71717a] outline-none max-h-28 py-1.5"
                />
                <button
                  onClick={() => send()}
                  disabled={busy || !input.trim()}
                  data-testid="chat-send"
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black disabled:opacity-40 hover:bg-[#2997FF] hover:text-white transition-colors"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        onClick={() => setOpen((o) => !o)}
        data-testid="chat-toggle"
        data-cursor
        aria-label="Open chat assistant"
        className="fixed bottom-6 right-4 md:right-8 z-[90] group inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0b0b0b]/90 backdrop-blur-xl pl-4 pr-5 py-3 text-sm font-medium shadow-[0_20px_50px_-15px_rgba(41,151,255,0.35)] hover:border-[#2997FF] transition-colors"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#2997FF] opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2997FF]" />
        </span>
        <Sparkles size={16} className="text-[#2997FF]" />
        {open ? "Close" : "Ask Cloud"}
      </motion.button>
    </>
  );
};