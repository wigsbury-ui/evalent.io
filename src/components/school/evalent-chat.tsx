"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function EvalentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/school/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.message }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I couldn\u0027t process that. Please try again." },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50 flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
          style={{ width: 380, height: 520 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ backgroundColor: "#1a2b6b" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <span className="text-sm font-bold text-white">E</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Evalent Assistant</p>
                <p className="text-[10px] text-white/60">AI-powered admissions support</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full mb-3"
                  style={{ backgroundColor: "#1a2b6b" }}
                >
                  <span className="text-lg font-bold text-white">E</span>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Hi! I\u0027m your Evalent assistant.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Ask me about your admissions data, student progress, or how to use the platform.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    "How many students are awaiting decisions?",
                    "Which grades have the highest scores?",
                    "How do I change pass thresholds?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => {
                          const userMsg: Message = { role: "user", content: q };
                          setMessages([userMsg]);
                          setLoading(true);
                          fetch("/api/school/chat", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ messages: [userMsg] }),
                          })
                            .then((r) => r.json())
                            .then((data) => {
                              setMessages([userMsg, { role: "assistant", content: data.message }]);
                              setLoading(false);
                            })
                            .catch(() => setLoading(false));
                        }, 0);
                      }}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-600 hover:border-evalent-300 hover:text-evalent-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-evalent-600 text-white rounded-br-md"
                      : "bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-evalent-400 focus:outline-none focus:ring-1 focus:ring-evalent-400"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-evalent-600 text-white hover:bg-evalent-500 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[9px] text-gray-300 mt-1.5">Powered by Evalent AI</p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: "#1a2b6b" }}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>
    </>
  );
}
