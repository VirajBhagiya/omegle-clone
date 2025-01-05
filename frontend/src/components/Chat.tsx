import { useState, useRef, useEffect } from 'react';
import { Socket } from "socket.io-client";

interface ChatProps {
    socket: Socket,
    roomId: string
}

export const Chat = ({ socket, roomId }: ChatProps) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat-message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
            socket.off('chat-message');
        };
    }, [socket]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            text: newMessage,
            timestamp: new Date().toISOString(),
            isLocal: true
        };

        socket.emit('send-message', { text: newMessage, roomId });
        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
    };

    return (
        <div className="w-full h-96 bg-black/50 rounded-lg border border-cyan-500/30 backdrop-blur-md flex flex-col">
            <div className="p-4 border-b border-cyan-500/30">
                <h2 className="text-cyan-400 font-semibold">NEURAL·CHAT</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.isLocal ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[80%] px-4 py-2 rounded-lg ${
                                message.isLocal 
                                    ? 'bg-cyan-500/20 border border-cyan-500/30' 
                                    : 'bg-purple-500/20 border border-purple-500/30'
                            }`}
                        >
                            <p className={`text-sm ${message.isLocal ? 'text-cyan-400' : 'text-purple-400'}`}>
                                {message.text}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={sendMessage} className="p-4 border-t border-cyan-500/30">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-4 py-2 text-cyan-400 placeholder-cyan-400/50 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};