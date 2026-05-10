// =============================================
// AI Chat Assistant Component
// Floating AI copilot for wallet intelligence.
// =============================================

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Trash2, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  walletAddress: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function AIChat({ walletAddress }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !walletAddress || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          message: userMessage.content,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!walletAddress) return;

    try {
      await fetch(`${API_BASE}/api/v1/ai/chat/${walletAddress}`, {
        method: "DELETE",
      });
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  if (!walletAddress) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 w-80 h-[500px] bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="font-semibold text-white text-sm">Sodash AI</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearHistory}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-6">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Ask me anything about your wallet!</p>
                  <div className="mt-3 space-y-1.5 text-[10px]">
                    <p className="text-gray-600">Try asking:</p>
                    <p className="text-gray-500">"What's my biggest loss?"</p>
                    <p className="text-gray-500">"Analyze my portfolio risk"</p>
                    <p className="text-gray-500">"What is staking?"</p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-1.5 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-gray-800 text-gray-100"
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-xl px-3 py-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-700">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask about your wallet..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                  maxLength={500}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
