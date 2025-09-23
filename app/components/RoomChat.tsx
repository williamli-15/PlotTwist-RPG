"use client";

import { useState, useEffect, useRef } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';

interface ChatMessage {
    id: string;
    lobby_id: string;
    profile_id: string;
    username: string;
    message: string;
    created_at: string;
}

interface RoomChatProps {
    lobbyId: string;
}

const RoomChat = ({ lobbyId }: RoomChatProps) => {
    const { profile } = useLobbyStore();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Resizable state
    const [dimensions, setDimensions] = useState({ width: 320, height: 384 }); // 80*4=320px, 96*4=384px
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string>('');
    const chatRef = useRef<HTMLDivElement>(null);
    const [lastMessageId, setLastMessageId] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load existing messages when opening chat
    const loadMessages = async () => {
        try {
            const { supabase } = await import('@/lib/supabase');

            const { data, error } = await supabase
                .from('room_messages')
                .select('*')
                .eq('lobby_id', lobbyId)
                .order('created_at', { ascending: true })
                .limit(50); // Load last 50 messages

            if (!error && data) {
                setMessages(data);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    // Polling fallback for when real-time doesn't work
    const startPolling = () => {
        console.log('🔄 Starting polling fallback for chat messages');
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(async () => {
            try {
                const { supabase } = await import('@/lib/supabase');

                const { data, error } = await supabase
                    .from('room_messages')
                    .select('*')
                    .eq('lobby_id', lobbyId)
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (!error && data) {
                    setMessages(prevMessages => {
                        // Only update if we have new messages
                        if (data.length !== prevMessages.length) {
                            console.log('🔄 Polling found new messages:', data.length - prevMessages.length);
                            return data;
                        }
                        return prevMessages;
                    });
                }
            } catch (error) {
                console.error('❌ Error polling for messages:', error);
            }
        }, 2000); // Poll every 2 seconds
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            console.log('⏹️ Stopping chat message polling');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // Send a message
    const sendMessage = async () => {
        if (!message.trim() || !profile || isLoading) return;

        setIsLoading(true);
        try {
            const { supabase } = await import('@/lib/supabase');

            const { error } = await supabase
                .from('room_messages')
                .insert({
                    lobby_id: lobbyId,
                    profile_id: profile.id,
                    username: profile.username,
                    message: message.trim()
                });

            if (!error) {
                setMessage('');
                // Immediately reload messages to ensure we see the new message
                setTimeout(loadMessages, 100);
            } else {
                console.error('Error sending message:', error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Set up real-time subscription (always active to receive messages)
    useEffect(() => {

        let subscription: any = null;

        const setupSubscription = async () => {
            try {
                const { supabase } = await import('@/lib/supabase');

                subscription = supabase
                    .channel('room_messages_changes')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'room_messages',
                            filter: `lobby_id=eq.${lobbyId}`
                        },
                        (payload) => {
                            console.log('🔔 New message received via subscription:', payload);
                            const newMessage = payload.new as ChatMessage;
                            console.log('📨 Adding message from:', newMessage.username, '-', newMessage.message);
                            setMessages(prev => {
                                // Avoid duplicates
                                const exists = prev.some(msg => msg.id === newMessage.id);
                                if (exists) {
                                    console.log('⚠️ Duplicate message detected, skipping');
                                    return prev;
                                }
                                console.log('✅ Message added to chat');
                                return [...prev, newMessage];
                            });
                        }
                    )
                    .subscribe((status) => {
                        console.log('💌 Chat subscription status:', status);
                        if (status === 'SUBSCRIBED') {
                            console.log('✅ Successfully subscribed to room chat for lobby:', lobbyId);
                            // Stop polling since subscription is working
                            stopPolling();
                        } else if (status === 'CHANNEL_ERROR') {
                            console.error('❌ Chat subscription failed for lobby:', lobbyId, '- falling back to polling');
                            startPolling();
                        } else if (status === 'CLOSED') {
                            console.log('📡 Chat subscription closed, attempting to reconnect...');
                            setTimeout(setupSubscription, 2000);
                        }
                    });
            } catch (error) {
                console.error('❌ Error setting up subscription:', error);
                startPolling();
            }
        };

        setupSubscription();

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
            stopPolling();
        };
    }, [lobbyId]);

    // Load messages immediately when component mounts
    useEffect(() => {
        loadMessages();
    }, [lobbyId]); // Load messages when component mounts or lobby changes

    // Global keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open chat on Enter (when not already typing)
            if (e.key === 'Enter' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
            // Close chat on Escape
            else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setMessage('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Resize handlers
    const handleMouseDown = (e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        setIsResizing(true);
        setResizeHandle(handle);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !chatRef.current) return;

            const rect = chatRef.current.getBoundingClientRect();
            let newWidth = dimensions.width;
            let newHeight = dimensions.height;

            // Calculate new dimensions based on resize handle
            if (resizeHandle.includes('right')) {
                newWidth = Math.max(250, e.clientX - rect.left); // Min width 250px
            }
            if (resizeHandle.includes('left')) {
                newWidth = Math.max(250, rect.right - e.clientX);
            }
            if (resizeHandle.includes('bottom')) {
                newHeight = Math.max(200, e.clientY - rect.top); // Min height 200px
            }
            if (resizeHandle.includes('top')) {
                newHeight = Math.max(200, rect.bottom - e.clientY);
            }

            // Limit maximum size
            newWidth = Math.min(800, newWidth);
            newHeight = Math.min(600, newHeight);

            setDimensions({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeHandle('');
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeHandle, dimensions]);

    if (!profile) return null;

    return (
        <>
            {/* Chat toggle button when closed */}
            {!isOpen && (
                <div className="fixed bottom-4 left-4 z-40">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="bg-gray-800/90 hover:bg-gray-700/90 text-white px-4 py-2 rounded-lg border border-gray-600 backdrop-blur-sm transition-colors"
                    >
                        💬 Chat (Press Enter)
                    </button>
                </div>
            )}

            {/* Chat window */}
            {isOpen && (
                <div
                    ref={chatRef}
                    className="fixed bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg flex flex-col z-40 select-none"
                    style={{
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                        minWidth: '250px',
                        minHeight: '200px',
                        maxWidth: '800px',
                        maxHeight: '600px'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-600">
                        <h3 className="text-white font-medium">Room Chat</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.map((msg) => (
                            <div key={msg.id} className="text-sm">
                                <span className="text-blue-400 font-medium">{msg.username}:</span>
                                <span className="text-gray-200 ml-2">{msg.message}</span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-gray-600">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Type a message... (Enter to send, Esc to close)"
                                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!message.trim() || isLoading}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
                            >
                                Send
                            </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            Press Escape to close chat
                        </div>
                    </div>

                    {/* Resize Handles */}
                    {/* Right edge */}
                    <div
                        className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'right')}
                    />
                    {/* Bottom edge */}
                    <div
                        className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                    />
                    {/* Bottom-right corner */}
                    <div
                        className="absolute bottom-0 right-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
                    />
                    {/* Top edge */}
                    <div
                        className="absolute top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'top')}
                    />
                    {/* Left edge */}
                    <div
                        className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'left')}
                    />
                    {/* Top-right corner */}
                    <div
                        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'top-right')}
                    />
                    {/* Top-left corner */}
                    <div
                        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'top-left')}
                    />
                    {/* Bottom-left corner */}
                    <div
                        className="absolute bottom-0 left-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
                    />
                </div>
            )}
        </>
    );
};

export default RoomChat;