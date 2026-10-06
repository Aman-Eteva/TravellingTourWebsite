import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageCircle,
  ArrowUpRight,
  RotateCcw,
  Compass,
  Calendar,
  MapPin,
  Luggage,
  ShieldCheck,
  CheckCircle2,
  Utensils,
} from "lucide-react";
import { api, get, errorMessage } from "../lib/api";
import type { ChatMessage } from "../types";
import { useToast, Loading, ErrorState } from "../components/ui";

const PROMPT_SUGGESTIONS = [
  { text: "When is my upcoming trip?", icon: Calendar, label: "Booking dates" },
  { text: "Show my detailed itinerary", icon: Compass, label: "Daily schedule" },
  { text: "What hotel am I staying at?", icon: MapPin, label: "Accommodations" },
  { text: "What should I pack for my trip?", icon: Luggage, label: "Packing guide" },
];

export function Chat() {
  const client = useQueryClient();
  const toast = useToast();
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainer = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => get<{ id: string; title: string }[]>("/chat/conversations"),
  });

  const messages = useQuery({
    queryKey: ["messages", active],
    queryFn: () => get<ChatMessage[]>(`/chat/conversations/${active}/messages`),
    enabled: !!active,
  });

  useEffect(() => {
    if (messagesContainer.current) {
      messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    }
  }, [messages.data, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setFailed("");
    setInput("");
    try {
      let id = active;
      if (!id) {
        const response = await api.post("/chat/conversations");
        id = response.data.id;
        setActive(id);
      }
      client.setQueryData(["messages", id], (old: ChatMessage[] | undefined) => [
        ...(old || []),
        { id: "temp-" + Date.now(), role: "user", content: text, createdAt: new Date().toISOString() },
      ]);
      await api.post(`/chat/conversations/${id}/messages`, { content: text });
      await client.invalidateQueries({ queryKey: ["messages", id] });
      await conversations.refetch();
    } catch (error) {
      setFailed(text);
      setInput(text);
      toast(errorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  const activeConversation = conversations.data?.find((c) => c.id === active);
  const hasMessages = Boolean(active && messages.data && messages.data.length > 0);

  return (
    <div className="chat-page-wrapper">
      <div className="chat-top-banner">
        <div>
          <span className="chat-pill-badge">
            <span className="chat-pulse-dot" /> Chat With AI
          </span>
          <h1>Meet your travel sidekick</h1>
        </div>
        <p>Instant answers for your bookings, itineraries, packing & local tips.</p>
      </div>

      <div className="chat-shell">
        <aside className="chat-history">
          <button
            className="chat-new-btn"
            onClick={() => {
              setActive(null);
              setFailed("");
              inputRef.current?.focus();
            }}
          >
            <Plus size={16} /> New conversation
          </button>

          {conversations.isError && <ErrorState error={conversations.error} />}

          <div className="chat-history-header">
            <span>Conversations</span>
            {conversations.data && conversations.data.length > 0 && (
              <span className="chat-history-count">{conversations.data.length}</span>
            )}
          </div>

          <div className="chat-history-list">
            {conversations.isLoading ? (
              <div className="chat-history-loading">Loading conversations…</div>
            ) : conversations.data && conversations.data.length > 0 ? (
              conversations.data.map((c) => (
                <button
                  key={c.id}
                  className={`chat-history-item ${active === c.id ? "active" : ""}`}
                  onClick={() => {
                    setActive(c.id);
                    setFailed("");
                  }}
                  title={c.title}
                >
                  <MessageCircle size={15} className="chat-item-icon" />
                  <span className="chat-item-title">{c.title}</span>
                </button>
              ))
            ) : (
              <div className="chat-history-empty">No conversations yet</div>
            )}
          </div>
        </aside>

        <div className="chat-main">
          <header className="chat-header">
            <div className="chat-header-info">
              <span className="chat-header-avatar">
                <Sparkles size={17} />
              </span>
              <div>
                <div className="chat-header-title">
                  Roamly Concierge
                  <span className="chat-status-pill">● Online</span>
                </div>
                <small className="chat-header-subtitle">
                  {activeConversation ? activeConversation.title : "Ready to assist with your trips & travels"}
                </small>
              </div>
            </div>

            {active && (
              <button
                className="chat-clear-btn"
                title="Delete this conversation"
                aria-label="Clear conversation"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api.delete(`/chat/conversations/${active}`);
                    setActive(null);
                    await conversations.refetch();
                  } catch (error) {
                    toast(errorMessage(error), true);
                  }
                }}
              >
                <Trash2 size={15} />
                <span>Delete conversation</span>
              </button>
            )}
          </header>

          <div className="chat-messages" ref={messagesContainer}>
            {!hasMessages ? (
              <div className="chat-welcome">
                <div className="assistant-orb">
                  <Sparkles size={24} />
                </div>
                <h2>How can I help with your journey?</h2>
                <p>
                  Ask anything about your bookings, daily schedules, hotel stays, or packing essentials.
                </p>
                <div className="suggestions-grid">
                  {PROMPT_SUGGESTIONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.text}
                        className="suggestion-chip"
                        onClick={() => send(item.text)}
                      >
                        <Icon size={14} className="suggestion-chip-icon" />
                        <span className="suggestion-chip-text">{item.text}</span>
                        <ArrowUpRight size={13} className="suggestion-arrow" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : messages.isLoading && active ? (
              <Loading />
            ) : messages.error ? (
              <ErrorState
                error={messages.error}
                retry={() => messages.refetch()}
              />
            ) : (
              <div className="chat-message-list">
                {messages.data?.map((m) => (
                  <div className={`chat-message ${m.role}`} key={m.id}>
                    {m.role === "assistant" && (
                      <span className="message-icon">
                        <Sparkles size={15} />
                      </span>
                    )}
                    <div className="chat-message-bubble">
                      <p>{m.content}</p>
                      {m.sources && m.sources.length > 0 && (
                        <div className="chat-sources">
                          <small>Verified Sources</small>
                          {m.sources.map((s, i) =>
                            s.link ? (
                              <Link to={s.link} key={`${s.id}-${i}`} className="chat-source-tag">
                                <Compass size={12} />
                                {s.title} ↗
                              </Link>
                            ) : (
                              <span key={`${s.id}-${i}`} className="chat-source-tag">
                                <Compass size={12} />
                                {s.title}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {busy && (
              <div className="chat-thinking">
                <span className="thinking-sparkle">
                  <Sparkles size={15} />
                </span>
                <span>Checking your trips & travel knowledge…</span>
                <span className="thinking-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}

            {failed && (
              <button className="chat-retry-btn" onClick={() => send(failed)}>
                <RotateCcw size={15} /> Retry your last message
              </button>
            )}
          </div>

          <div className="chat-compose-area">
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                ref={inputRef}
                aria-label="Message your travel assistant"
                placeholder="Ask a question about your trips, hotel, itinerary, packing…"
                maxLength={2000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                aria-label="Send message"
                className="chat-send-btn"
                disabled={busy || !input.trim()}
              >
                <Send size={16} />
              </button>
            </form>
            <div className="chat-disclaimer">
              <ShieldCheck size={13} />
              <span>Your booking information stays private. Answers are sourced from your itinerary & verified knowledge base.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
