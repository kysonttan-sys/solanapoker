
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';

interface ChatMessage {
    id: string;
    text: string;
    sender: string;
    time: string;
}

interface ChatBoxProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isOpen, onToggle }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={onToggle}
                className="fixed bottom-24 right-4 z-50 bg-sol-dark border border-white/10 p-3 rounded-full shadow-lg hover:border-sol-green/50 text-white transition-all group"
            >
                <MessageSquare size={24} className="group-hover:text-sol-green" />
                {messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                        !
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-4 z-50 w-72 md:w-80 h-96 bg-[#13131F]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-right-10 fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-white/10 bg-white/5 rounded-t-xl">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <MessageSquare size={16} className="text-sol-green"/> Table Chat
                </h3>
                <button onClick={onToggle} className="text-gray-400 hover:text-white">
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs mt-10">
                        No messages yet.<br/>Say hello!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-bold text-sol-blue">{msg.sender}</span>
                                <span className="text-[10px] text-gray-600">{msg.time}</span>
                            </div>
                            <p className="text-sm text-gray-300 break-words leading-tight">{msg.text}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-sol-green focus:outline-none"
                />
                <button type="submit" className="bg-sol-green text-black p-2 rounded-lg hover:bg-sol-green/90 transition-colors">
                    <Send size={14} />
                </button>
            </form>
        </div>
    );
};
