'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatWidget() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory }),
      });

      const data = (await res.json()) as { reply?: string };

      if (data.reply) {
        setMessages([...nextHistory, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...nextHistory, { role: 'assistant', content: 'No reply received.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages([...nextHistory, { role: 'assistant', content: 'Network error contacting agent.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] w-full max-w-md border border-neutral-200 rounded-2xl bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
        <span className="font-semibold text-sm text-neutral-800">Tựa AI Assistant</span>
        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-neutral-400 text-xs text-center mt-12">
            Ask Agnes anything about Tựa Website.
          </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-neutral-900 text-white rounded-br-none'
                  : 'bg-neutral-100 text-neutral-800 rounded-bl-none'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-neutral-400 italic">Agnes is thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-neutral-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-neutral-800"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}