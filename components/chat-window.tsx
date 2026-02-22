"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Inline SVG icon for send button
const SendIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

const MessageBubble = ({ message, isUser }) => {
  return (
    <div
      className={cn(
        "max-w-[75%] px-4 py-2 rounded-lg border border-white/10",
        isUser
          ? "bg-[#1a1a1a] text-white self-end rounded-tr-none"
          : "bg-[#2a2a2a] text-gray-300 self-start rounded-tl-none"
      )}
    >
      <p className="whitespace-pre-wrap break-words">{message}</p>
    </div>
  );
};

export default function ChatWindow() {
  // Personality state
  const [personality, setPersonality] = useState({
    tone: "Helpful",
    language: "English",
    style: "Formal",
  });

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Send messages to /api/chat with personality context
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add user message
    const newUserMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setLoading(true);

    try {
      // Prepare system prompt based on personality
      const personalityPrompt = `You are a virtual assistant. Tone: ${personality.tone}, Language: ${personality.language}, Response Style: ${personality.style}. Respond accordingly.`;

      // Build messages array with system personality prompt as first message
      const apiMessages = [
        { role: "system", content: personalityPrompt },
        ...messages,
        newUserMessage,
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      if (data.message?.content) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message.content }]);
      } else {
        throw new Error("Empty response from assistant");
      }
    } catch (error) {
      // On error, add an assistant message indicating error
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#0a0a0a] text-white w-full max-w-3xl h-[700px] rounded-md border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
      {/* Personality selector above messages */}
      <div className="flex flex-wrap gap-4 p-4 border-b border-white/10 bg-[#1a1a1a]">
        {/* Tone */}
        <label className="flex flex-col text-sm text-gray-300">
          Tone
          <select
            className="mt-1 bg-[#0a0a0a] text-white border border-white/10 rounded-md px-2 py-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] focus:outline-none focus:border-white"
            value={personality.tone}
            onChange={(e) =>
              setPersonality((p) => ({ ...p, tone: e.target.value }))
            }
            aria-label="Select tone"
          >
            <option>Helpful</option>
            <option>Friendly</option>
            <option>Professional</option>
            <option>Casual</option>
          </select>
        </label>

        {/* Language */}
        <label className="flex flex-col text-sm text-gray-300">
          Language
          <select
            className="mt-1 bg-[#0a0a0a] text-white border border-white/10 rounded-md px-2 py-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] focus:outline-none focus:border-white"
            value={personality.language}
            onChange={(e) =>
              setPersonality((p) => ({ ...p, language: e.target.value }))
            }
            aria-label="Select language"
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </label>

        {/* Style */}
        <label className="flex flex-col text-sm text-gray-300">
          Response Style
          <select
            className="mt-1 bg-[#0a0a0a] text-white border border-white/10 rounded-md px-2 py-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] focus:outline-none focus:border-white"
            value={personality.style}
            onChange={(e) =>
              setPersonality((p) => ({ ...p, style: e.target.value }))
            }
            aria-label="Select response style"
          >
            <option>Formal</option>
            <option>Informal</option>
            <option>Concise</option>
            <option>Detailed</option>
          </select>
        </label>
      </div>

      {/* Message list */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg.content} isUser={msg.role === "user"} />
        ))}
      </ScrollArea>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex border-t border-white/10 p-3 bg-[#1a1a1a]"
      >
        <Input
          id="chat-input"
          name="chat"
          placeholder={loading ? "Waiting for response..." : "Type your message..."}
          className="flex-1 bg-[#0a0a0a] text-white border border-white/10 rounded-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] focus:border-white focus:ring-0"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
          suppressHydrationWarning={true}
          aria-label="Chat message input"
          aria-disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading}
          className={cn(
            "ml-3 px-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition ease-out",
            loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-[inset_0_2px_1px_0_rgba(255,255,255,0.15)]"
          )}
          aria-label="Send message"
        >
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}
