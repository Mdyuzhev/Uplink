export interface Room {
    id: string;
    name: string;
    type: 'channel' | 'direct';
    encrypted: boolean;
    unreadCount: number;
    lastMessage?: string;
    lastMessageSender?: string;
    lastMessageTs?: number;
    peerPresence?: 'online' | 'offline' | 'unavailable';
    peerId?: string;
    topic?: string;
}

export interface Message {
    id: string;
    roomId: string;
    sender: string;
    senderDisplayName: string;
    body: string;
    timestamp: number;
    type: 'text' | 'code' | 'image' | 'file' | 'encrypted';
    formattedBody?: string;
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
}

export interface GroupedRooms {
    channels: Room[];
    directs: Room[];
}
