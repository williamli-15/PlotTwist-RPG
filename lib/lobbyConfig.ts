import { Lobby, Avatar } from './types';

// Predefined lobby configurations (empty - users create their own)
export const defaultLobbies: Lobby[] = [];


// Helper function to get lobby by ID
export function getLobbyById(lobbyId: string): Lobby | undefined {
    return defaultLobbies.find(lobby => lobby.lobbyId === lobbyId);
}

// Helper function to get available lobbies
export function getAvailableLobbies(): Lobby[] {
    return [...defaultLobbies];
}