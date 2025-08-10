// Chat system types
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Avatar system types
export interface Avatar {
    model: string;        // VRM model URL
    personality: string;  // AI personality prompt
    history: Message[];   // Conversation history
    // Host-specific properties (optional)
    eventSchedule?: string;
    contact?: string;
    stories?: string[];
}

// User types
export interface User {
    userId: string;
    username?: string;
    avatar: Avatar;
}

// Lobby types
export interface Lobby {
    lobbyId: string;
    name: string;
    description: string;
    theme: string;
    hostAvatar: Avatar;      // NPC with host privileges
    maxPlayers: number;
    currentPlayers: User[];
    backgroundScene?: string;
    backgroundColor?: string;
    environmentImage?: string;
}

// Lobby state management
export interface LobbyState {
    currentUser: User | null;
    currentLobby: Lobby | null;
    availableLobbies: Lobby[];
    isInLobby: boolean;
    showLobbySelector: boolean;
}

// Chat response type
export interface ChatResponse {
    message: string;
    emotion?: string;
    animation?: string;
}