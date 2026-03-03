/**
 * ChatContext — активная комната, сообщения, UI-состояние чата.
 * Заменяет props drilling из ChatLayout.
 */

import React, { createContext, useContext } from 'react';
import { useChatState } from '../hooks/useChatState';

type ChatStateValue = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatStateValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const chat = useChatState();
    return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatStateValue {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChat must be used within ChatProvider');
    return ctx;
}
