import { useEffect, useRef, useState } from "react";

const USERNAME_KEY = "chat_username";

const COLORS = [
  "#e53935", "#8e24aa", "#1e88e5", "#00897b",
  "#f4511e", "#6d4c41", "#039be5", "#43a047",
];

function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function UsernameModal({ onSubmit }) {
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-icon">💬</div>
        <h2>Welcome to Chat</h2>
        <p>Choose a display name to get started</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            className="modal-input"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />
          <button className="modal-btn" type="submit" disabled={!name.trim()}>
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}

function Message({ msg, onReact }) {
  return (
    <div className={`message ${msg._own ? "own" : "other"}`}>
      {!msg._own && (
        <span className="msg-username" style={{ color: colorForName(msg.username) }}>
          {msg.username}
        </span>
      )}
      <div className={`msg-bubble ${msg._own ? "own" : "other"}`}>
        <span className="msg-content">{msg.content}</span>
        <span className="msg-time">{formatTime(msg.created_at)}</span>
      </div>
      <div className="reactions">
        <button className="reaction-btn" onClick={() => onReact(msg.id, "like")}>
          👍{msg.likes > 0 && <span className="reaction-count">{msg.likes}</span>}
        </button>
        <button className="reaction-btn" onClick={() => onReact(msg.id, "dislike")}>
          👎{msg.dislikes > 0 && <span className="reaction-count">{msg.dislikes}</span>}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY) || "");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    fetch("/api/messages")
      .then((r) => r.json())
      .then((rows) => setMessages(rows.map((m) => ({ ...m, _own: m.username === username }))))
      .catch(console.error);

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "new_message") {
        const { type, ...msg } = event;
        setMessages((prev) => [...prev, { ...msg, _own: msg.username === username }]);
      } else if (event.type === "reaction_update") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.id ? { ...m, likes: event.likes, dislikes: event.dislikes } : m
          )
        );
      }
    };

    return () => ws.close();
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSetUsername(name) {
    localStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
  }

  async function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, content }),
      });
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function handleReact(messageId, type) {
    await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  }

  if (!username) return <UsernameModal onSubmit={handleSetUsername} />;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="header-icon">💬</span>
          <span className="header-title">Chat App</span>
        </div>
        <div className="header-right">
          <span className={`status-dot ${connected ? "online" : "offline"}`} />
          <span className="status-label">{connected ? "Live" : "Connecting…"}</span>
          <span className="header-user" style={{ color: colorForName(username) }}>
            {username}
          </span>
          <button
            className="change-name-btn"
            onClick={() => {
              localStorage.removeItem(USERNAME_KEY);
              setUsername("");
            }}
            title="Change name"
          >
            ✎
          </button>
        </div>
      </header>

      <main className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} onReact={handleReact} />
        ))}
        <div ref={bottomRef} />
      </main>

      <form className="input-bar" onSubmit={handleSend}>
        <input
          ref={inputRef}
          className="input-field"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          disabled={sending}
        />
        <button
          className="send-btn"
          type="submit"
          disabled={!input.trim() || sending}
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
