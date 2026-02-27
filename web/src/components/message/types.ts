export interface ReactionInfo {
    emoji: string;
    count: number;
    users: string[];
    myReactionEventId?: string;
}

export interface ThreadSummaryInfo {
    replyCount: number;
    lastReply?: { sender: string; body: string; ts: number };
}
