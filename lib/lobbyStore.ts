import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LobbyState, User, Lobby } from './types';
import { getAvailableLobbies } from './lobbyConfig';

// Generate a unique user ID
function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create user ID from localStorage
function getOrCreateUserId(): string {
    if (typeof window === 'undefined') return generateUserId();
    
    const existingId = localStorage.getItem('plottwist_user_id');
    if (existingId) return existingId;
    
    const newId = generateUserId();
    localStorage.setItem('plottwist_user_id', newId);
    return newId;
}

interface LobbyStore extends LobbyState {
    // Actions
    initializeUser: () => void;
    setCurrentLobby: (lobby: Lobby | null) => void;
    joinLobby: (lobbyId: string) => boolean;
    leaveLobby: () => void;
    showLobbySelection: () => void;
    hideLobbySelection: () => void;
    updateUsername: (username: string) => void;
    refreshLobbies: () => void;
}

export const useLobbyStore = create<LobbyStore>()(
    persist(
        (set, get) => ({
            // Initial state
            currentUser: null,
            currentLobby: null,
            availableLobbies: getAvailableLobbies(),
            isInLobby: false,
            showLobbySelector: true,

            // Actions
            initializeUser: () => {
                const userId = getOrCreateUserId();
                const user: User = {
                    userId,
                    username: undefined,
                    avatar: {
                        model: 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/avatars/VRoid_Sample_B-D0UeF1RrEd5ItEeCiUZ3o8DxtxvFIK.vrm',
                        personality: 'You are a curious explorer visiting virtual worlds.',
                        history: []
                    }
                };
                set({ currentUser: user });
            },

            setCurrentLobby: (lobby: Lobby | null) => {
                set({ 
                    currentLobby: lobby,
                    isInLobby: lobby !== null,
                    showLobbySelector: lobby === null
                });
            },

            joinLobby: (lobbyId: string) => {
                const { currentUser, availableLobbies } = get();
                if (!currentUser) return false;

                const lobby = availableLobbies.find(l => l.lobbyId === lobbyId);
                if (!lobby) return false;

                // Check if user is already in the lobby
                const alreadyJoined = lobby.currentPlayers.some(p => p.userId === currentUser.userId);
                if (alreadyJoined) {
                    set({ 
                        currentLobby: lobby,
                        isInLobby: true,
                        showLobbySelector: false 
                    });
                    return true;
                }

                // Check if lobby is full
                if (lobby.currentPlayers.length >= lobby.maxPlayers) {
                    return false;
                }

                // Add user to lobby
                const updatedLobby = {
                    ...lobby,
                    currentPlayers: [...lobby.currentPlayers, currentUser]
                };

                // Update the lobby in availableLobbies
                const updatedLobbies = availableLobbies.map(l => 
                    l.lobbyId === lobbyId ? updatedLobby : l
                );

                set({ 
                    currentLobby: updatedLobby,
                    availableLobbies: updatedLobbies,
                    isInLobby: true,
                    showLobbySelector: false 
                });
                return true;
            },

            leaveLobby: () => {
                const { currentUser, currentLobby, availableLobbies } = get();
                if (!currentUser || !currentLobby) return;

                // Remove user from current lobby
                const updatedLobby = {
                    ...currentLobby,
                    currentPlayers: currentLobby.currentPlayers.filter(p => p.userId !== currentUser.userId)
                };

                // Update the lobby in availableLobbies
                const updatedLobbies = availableLobbies.map(l => 
                    l.lobbyId === currentLobby.lobbyId ? updatedLobby : l
                );

                set({ 
                    currentLobby: null,
                    availableLobbies: updatedLobbies,
                    isInLobby: false,
                    showLobbySelector: true 
                });
            },

            showLobbySelection: () => {
                set({ showLobbySelector: true });
            },

            hideLobbySelection: () => {
                set({ showLobbySelector: false });
            },

            updateUsername: (username: string) => {
                const { currentUser } = get();
                if (!currentUser) return;

                const updatedUser = { ...currentUser, username };
                set({ currentUser: updatedUser });
            },

            refreshLobbies: () => {
                set({ availableLobbies: getAvailableLobbies() });
            }
        }),
        {
            name: 'plottwist-lobby-store',
            partialize: (state) => ({
                currentUser: state.currentUser,
                // Don't persist lobby state as it should be fresh on each session
            }),
        }
    )
);

// Initialize user on store creation
if (typeof window !== 'undefined') {
    useLobbyStore.getState().initializeUser();
}