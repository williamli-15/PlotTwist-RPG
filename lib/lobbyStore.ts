// lib/lobbyStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LobbyState, User, Lobby, Profile, AvatarState, CustomLobby } from './types';
import { getAvailableLobbies } from './lobbyConfig';
import DynamicChatService from '@/app/components/DynamicChatService';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Generate a unique user ID
function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a unique 6-character lobby code
function generateLobbyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    // Chat management - unified for both NPCs and Digital Twins
    activeChatService: DynamicChatService | null;  // Currently active chat service
    activeChatTarget: {                            // Who we're chatting with
        type: 'npc' | 'digital-twin';
        name: string;
        id?: string;  // profile ID for digital twins
    } | null;
    
    // Digital twin properties
    profile: Profile | null;
    otherAvatars: Map<string, AvatarState>;
    realtimeChannel: RealtimeChannel | null;
    profilesCache: Map<string, Profile>;
    
    // Core actions
    initializeUser: () => void;
    setCurrentLobby: (lobby: Lobby | null) => void;
    joinLobby: (lobbyId: string) => Promise<boolean>;
    leaveLobby: () => void;
    showLobbySelection: () => void;
    hideLobbySelection: () => void;
    updateUsername: (username: string) => void;
    refreshLobbies: () => void;
    
    // Chat actions - unified
    startChat: (target: {
        type: 'npc' | 'digital-twin';
        lobby?: Lobby;
        profile?: Profile;
        avatarState?: AvatarState;
    }) => void;
    endChat: () => void;
    
    // Digital twin actions
    createProfile: (
        username: string,
        avatarModel: string,
        aiPersonalityPrompt?: string,
        bio?: string,
        interests?: string[],
        preferredGreeting?: string
    ) => Promise<boolean>;
    loadProfile: () => Promise<boolean>;
    updateAvatarState: (updates: Partial<AvatarState>) => Promise<void>;
    subscribeToLobby: (lobbyId: string) => void;
    unsubscribeFromLobby: () => void;
    loadDigitalTwins: (lobbyId: string) => Promise<void>;
    loadProfileInfo: (profileId: string) => Promise<Profile | null>;
    markOnline: (lobbyId: string) => Promise<void>;
    markOffline: (lobbyId: string) => Promise<void>;

    // Custom lobby management
    createCustomLobby: (
        name: string,
        description: string,
        theme: string,
        maxPlayers: number,
        isPublic: boolean,
        tags?: string[],
        hostData?: {
            useMyProfile: boolean;
            customHostName?: string;
            customHostAvatar?: string;
            additionalKnowledge?: string;
        }
    ) => Promise<string | null>;  // Returns lobby code or null if failed
    loadCustomLobbies: (searchQuery?: string, offset?: number, limit?: number) => Promise<void>;
    loadMyCustomLobbies: () => Promise<Lobby[]>;
    joinCustomLobbyByCode: (lobbyCode: string) => Promise<boolean>;
    deleteCustomLobby: (lobbyCode: string) => Promise<boolean>;
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
            
            // Chat state - unified
            activeChatService: null,
            activeChatTarget: null,
            
            // Digital twin state
            profile: null,
            otherAvatars: new Map(),
            realtimeChannel: null,
            profilesCache: new Map(),

            // Initialize user
            initializeUser: async () => {
                const userId = getOrCreateUserId();
                
                const user: User = {
                    userId,
                    username: undefined,
                    avatar: {
                        model: '/avatars/raiden.vrm',
                        personality: 'You are a curious explorer visiting virtual worlds.',
                        history: []
                    }
                };
                set({ currentUser: user });
                
                // Try to load existing profile from Supabase
                const hasProfile = await get().loadProfile();
                if (hasProfile) {
                    const { profile } = get();
                    if (profile) {
                        set({
                            currentUser: {
                                ...user,
                                username: profile.username,
                                avatar: {
                                    ...user.avatar,
                                    model: profile.selected_avatar_model
                                }
                            }
                        });
                    }
                }
            },

            // Unified chat management
            startChat: async (target) => {
                const { activeChatService } = get();
                
                // Clean up any existing chat
                if (activeChatService) {
                    activeChatService.clearHistory();
                }
                
                let newService: DynamicChatService;
                let chatTarget: any;
                
                if (target.type === 'npc' && target.lobby) {
                    // Create NPC chat service
                    newService = new DynamicChatService(target.lobby, 'npc');
                    // Initialize personality asynchronously for NPC hosts
                    await newService.initializePersonality();
                    chatTarget = {
                        type: 'npc',
                        name: target.lobby.hostAvatar.name || 'Host'
                    };
                } else if (target.type === 'digital-twin' && target.profile && target.avatarState) {
                    // Create Digital Twin chat service
                    newService = new DynamicChatService(
                        { profile: target.profile, avatarState: target.avatarState },
                        'digital-twin'
                    );
                    chatTarget = {
                        type: 'digital-twin',
                        name: target.profile.username,
                        id: target.profile.id
                    };
                } else {
                    console.error('Invalid chat target');
                    return;
                }
                
                set({
                    activeChatService: newService,
                    activeChatTarget: chatTarget
                });
            },

            endChat: () => {
                const { activeChatService } = get();
                if (activeChatService) {
                    activeChatService.clearHistory();
                }
                set({
                    activeChatService: null,
                    activeChatTarget: null
                });
            },

            // Create new profile in Supabase
            createProfile: async (
                username: string,
                avatarModel: string,
                aiPersonalityPrompt?: string,
                bio?: string,
                interests?: string[],
                preferredGreeting?: string
            ) => {
                try {
                    const userId = getOrCreateUserId();
                    
                    // First, try to get existing profile
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('user_id', userId)
                        .single();

                    const profileData = {
                        user_id: userId,
                        username,
                        selected_avatar_model: avatarModel,
                        ai_personality_prompt: aiPersonalityPrompt || `A friendly metaverse resident named ${username}`,
                        bio: bio || '',
                        interests: interests || [],
                        preferred_greeting: preferredGreeting || `Hey! I'm ${username}!`,
                        last_seen: new Date().toISOString()
                    };

                    let data, error;

                    if (existingProfile) {
                        // Update existing profile
                        const updateResult = await supabase
                            .from('profiles')
                            .update(profileData)
                            .eq('user_id', userId)
                            .select()
                            .single();
                        data = updateResult.data;
                        error = updateResult.error;
                    } else {
                        // Insert new profile
                        const insertResult = await supabase
                            .from('profiles')
                            .insert(profileData)
                            .select()
                            .single();
                        data = insertResult.data;
                        error = insertResult.error;
                    }

                    if (!error && data) {
                        set({
                            profile: data,
                            currentUser: {
                                ...get().currentUser!,
                                username,
                                avatar: {
                                    ...get().currentUser!.avatar,
                                    model: avatarModel,
                                    personality: aiPersonalityPrompt || `A friendly metaverse resident named ${username}`
                                }
                            }
                        });
                        return true;
                    }
                    console.error('Error creating/updating profile:', error);
                    console.error('Profile data attempted:', profileData);
                    console.error('Existing profile found:', !!existingProfile);
                    console.error('Operation type:', existingProfile ? 'UPDATE' : 'INSERT');
                    return false;
                } catch (error) {
                    console.error('Error creating profile:', error);
                    return false;
                }
            },
            
            // Load existing profile from Supabase
            loadProfile: async () => {
                try {
                    const userId = getOrCreateUserId();
                    
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('user_id', userId)
                        .single();

                    if (!error && data) {
                        set({ profile: data });
                        
                        // Update last seen
                        await supabase
                            .from('profiles')
                            .update({ last_seen: new Date().toISOString() })
                            .eq('id', data.id);
                        
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Error loading profile:', error);
                    return false;
                }
            },

            // Update avatar state in database
            updateAvatarState: async (updates: Partial<AvatarState>) => {
                const { profile, currentLobby } = get();
                if (!profile || !currentLobby) return;

                try {
                    await supabase
                        .from('avatar_states')
                        .upsert({
                            profile_id: profile.id,
                            lobby_id: currentLobby.lobbyId,
                            ...updates,
                            last_activity: new Date().toISOString()
                        }, {
                            onConflict: 'profile_id,lobby_id'  // <-- ADD THIS
                        });
                } catch (error) {
                    console.error('Error updating avatar state:', error);
                }
            },

            // Subscribe to real-time updates for a lobby
            subscribeToLobby: (lobbyId: string) => {
                const { realtimeChannel, profile } = get();
                
                // Clean up existing subscription
                if (realtimeChannel) {
                    supabase.removeChannel(realtimeChannel);
                }

                // Create new subscription for avatar states
                const channel = supabase
                    .channel(`lobby:${lobbyId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'avatar_states',
                            filter: `lobby_id=eq.${lobbyId}`
                        },
                        async (payload) => {
                            const { otherAvatars, profile: currentProfile } = get();
                            
                            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                                const avatarState = payload.new as AvatarState;
                                
                                // Skip our own avatar updates
                                if (currentProfile?.id === avatarState.profile_id) return;
                                
                                const newAvatars = new Map(otherAvatars);
                                newAvatars.set(avatarState.profile_id, avatarState);
                                set({ otherAvatars: newAvatars });
                                
                                // Load profile info if we don't have it cached
                                if (!get().profilesCache.has(avatarState.profile_id)) {
                                    await get().loadProfileInfo(avatarState.profile_id);
                                }
                            } else if (payload.eventType === 'DELETE') {
                                const avatarState = payload.old as AvatarState;
                                const newAvatars = new Map(otherAvatars);
                                newAvatars.delete(avatarState.profile_id);
                                set({ otherAvatars: newAvatars });
                            }
                        }
                    )
                    .subscribe();

                set({ realtimeChannel: channel });
            },

            // Unsubscribe from real-time updates
            unsubscribeFromLobby: () => {
                const { realtimeChannel } = get();
                if (realtimeChannel) {
                    supabase.removeChannel(realtimeChannel);
                    set({ realtimeChannel: null });
                }
            },

            // Load all digital twins in a lobby
            loadDigitalTwins: async (lobbyId: string) => {
                try {
                    const { data, error } = await supabase
                        .from('avatar_states')
                        .select('*')
                        .eq('lobby_id', lobbyId);

                    if (!error && data) {
                        const avatarsMap = new Map();
                        const { profile } = get();
                        
                        for (const avatar of data) {
                            // Skip our own avatar
                            if (profile?.id === avatar.profile_id) continue;
                            
                            avatarsMap.set(avatar.profile_id, avatar);
                            
                            // Load profile info for each avatar
                            if (!get().profilesCache.has(avatar.profile_id)) {
                                await get().loadProfileInfo(avatar.profile_id);
                            }
                        }
                        
                        set({ otherAvatars: avatarsMap });
                    }
                } catch (error) {
                    console.error('Error loading digital twins:', error);
                }
            },

            // Load profile information for other users
            loadProfileInfo: async (profileId: string) => {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', profileId)
                        .single();

                    if (!error && data) {
                        const cache = new Map(get().profilesCache);
                        cache.set(profileId, data);
                        set({ profilesCache: cache });
                        return data;
                    }
                    return null;
                } catch (error) {
                    console.error('Error loading profile info:', error);
                    return null;
                }
            },

            // Mark user as online in lobby
            markOnline: async (lobbyId: string) => {
                const { profile } = get();
                if (!profile) return;

                await get().updateAvatarState({
                    is_online: true,
                    lobby_id: lobbyId,
                    ai_behavior: 'idle'
                });
            },

            // Mark user as offline (activate digital twin)
            markOffline: async (lobbyId: string) => {
                const { profile } = get();
                if (!profile) return;

                await get().updateAvatarState({
                    is_online: false,
                    lobby_id: lobbyId,
                    ai_behavior: 'wander'
                });
            },

            // Set current lobby (simplified - no chat service creation)
            setCurrentLobby: (lobby: Lobby | null) => {
                set({ 
                    currentLobby: lobby,
                    isInLobby: lobby !== null,
                    showLobbySelector: lobby === null
                });
            },

            // Join lobby (simplified - no chat service creation)
            joinLobby: async (lobbyId: string) => {
                const { currentUser, availableLobbies, profile } = get();
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
                    
                    // Handle digital twin features if profile exists
                    if (profile) {
                        await get().markOnline(lobbyId);
                        get().subscribeToLobby(lobbyId);
                        await get().loadDigitalTwins(lobbyId);
                    }
                    
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
                
                // Handle digital twin features if profile exists
                if (profile) {
                    await get().markOnline(lobbyId);
                    get().subscribeToLobby(lobbyId);
                    await get().loadDigitalTwins(lobbyId);
                }
                
                return true;
            },

            // Leave lobby (uses endChat for cleanup)
            leaveLobby: () => {
                const { currentUser, currentLobby, availableLobbies, profile } = get();
                if (!currentUser || !currentLobby) return;

                // End any active chat
                get().endChat();

                // Mark as offline (activate digital twin) if profile exists
                if (profile) {
                    get().markOffline(currentLobby.lobbyId);
                }

                // Unsubscribe from real-time updates
                get().unsubscribeFromLobby();

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
                    showLobbySelector: true,
                    otherAvatars: new Map()
                });
            },

            // UI actions
            showLobbySelection: () => {
                set({ showLobbySelector: true });
            },

            hideLobbySelection: () => {
                set({ showLobbySelector: false });
            },

            updateUsername: (username: string) => {
                const { currentUser, profile } = get();
                if (!currentUser) return;

                const updatedUser = { ...currentUser, username };
                set({ currentUser: updatedUser });
                
                // Also update profile if it exists
                if (profile) {
                    get().createProfile(username, currentUser.avatar.model);
                }
            },

            refreshLobbies: () => {
                set({ availableLobbies: getAvailableLobbies() });
            },

            // Create a custom lobby
            createCustomLobby: async (
                name: string,
                description: string,
                theme: string,
                maxPlayers: number,
                isPublic: boolean,
                tags?: string[],
                hostData?: {
                    useMyProfile: boolean;
                    customHostName?: string;
                    customHostAvatar?: string;
                    additionalKnowledge?: string;
                }
            ) => {
                try {
                    const { profile } = get();
                    if (!profile) {
                        console.error('No profile found');
                        return null;
                    }

                    const lobbyCode = generateLobbyCode();

                    console.log('Creating lobby with profile:', profile);

                    const { data, error } = await supabase
                        .from('custom_lobbies')
                        .insert({
                            lobby_code: lobbyCode,
                            name,
                            description,
                            theme,
                            max_players: maxPlayers,
                            created_by: profile.id,
                            is_public: isPublic,
                            tags: tags || [],
                            // Host configuration
                            host_uses_creator_profile: hostData?.useMyProfile ?? true,
                            custom_host_name: hostData?.customHostName || null,
                            custom_host_avatar: hostData?.customHostAvatar || null,
                            additional_host_knowledge: hostData?.additionalKnowledge || null
                        })
                        .select()
                        .single();

                    if (error) {
                        console.error('Error creating custom lobby:', error);
                        console.error('Profile being used:', profile);
                        return null;
                    }

                    return lobbyCode;
                } catch (error) {
                    console.error('Error creating custom lobby:', error);
                    return null;
                }
            },

            // Load custom lobbies with search and pagination
            loadCustomLobbies: async (searchQuery?: string, offset = 0, limit = 20) => {
                try {
                    let query = supabase
                        .from('custom_lobbies')
                        .select('*')
                        .eq('is_public', true)
                        .range(offset, offset + limit - 1)
                        .order('created_at', { ascending: false });

                    if (searchQuery) {
                        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
                    }

                    const { data, error } = await query;

                    if (!error && data) {
                        // Convert custom lobbies to Lobby format and merge with static lobbies
                        const customLobbies: Lobby[] = await Promise.all(
                            data.map(async (customLobby) => {
                                // Fetch creator profile by profile ID (created_by field)
                                let creatorProfile = null;
                                try {
                                    const { data: profileData, error: profileError } = await supabase
                                        .from('profiles')
                                        .select('*')
                                        .eq('id', customLobby.created_by)
                                        .single();

                                    if (!profileError && profileData) {
                                        creatorProfile = profileData;
                                    }
                                } catch (err) {
                                    console.error('Error fetching creator profile:', err);
                                }

                                const creatorName = creatorProfile?.username || 'Unknown Host';

                                return {
                                    lobbyId: customLobby.lobby_code,
                                    name: customLobby.name,
                                    description: customLobby.description,
                                    theme: customLobby.theme,
                                    hostAvatar: {
                                        name: creatorName,
                                        model: creatorProfile?.selected_avatar_model || '/avatars/raiden.vrm',
                                        personality: `You are ${creatorName}, the host of ${customLobby.name}. ${customLobby.description}`,
                                        history: []
                                    },
                                    maxPlayers: customLobby.max_players,
                                    currentPlayers: [], // TODO: load actual players
                                    backgroundColor: customLobby.background_color || '#1a1a2e',
                                    environmentImage: customLobby.environment_image || 'neutral'
                                };
                            })
                        );

                        if (offset === 0) {
                            // First load - combine with static lobbies
                            const staticLobbies = getAvailableLobbies();
                            set({ availableLobbies: [...staticLobbies, ...customLobbies] });
                        } else {
                            // Pagination - append to existing
                            const current = get().availableLobbies;
                            set({ availableLobbies: [...current, ...customLobbies] });
                        }
                    }
                } catch (error) {
                    console.error('Error loading custom lobbies:', error);
                }
            },

            // Join custom lobby by code
            joinCustomLobbyByCode: async (lobbyCode: string) => {
                try {
                    console.log('Searching for lobby with code:', lobbyCode.toUpperCase());
                    const { data, error } = await supabase
                        .from('custom_lobbies')
                        .select('*')
                        .eq('lobby_code', lobbyCode.toUpperCase())
                        .single();

                    console.log('Database query result:', { data, error });

                    if (error || !data) {
                        console.log('No lobby found with code:', lobbyCode.toUpperCase());
                        return false;
                    }

                    // Fetch creator profile by profile ID
                    let creatorProfile = null;
                    try {
                        const { data: profileData, error: profileError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', data.created_by)
                            .single();

                        if (!profileError && profileData) {
                            creatorProfile = profileData;
                        }
                    } catch (err) {
                        console.error('Error fetching creator profile:', err);
                    }

                    const creatorName = creatorProfile?.username || 'Unknown Host';

                    // Create Lobby object from CustomLobby
                    const lobby: Lobby = {
                        lobbyId: data.lobby_code,
                        name: data.name,
                        description: data.description,
                        theme: data.theme,
                        hostAvatar: {
                            name: creatorName,
                            model: creatorProfile?.selected_avatar_model || '/avatars/raiden.vrm',
                            personality: `You are ${creatorName}, the host of ${data.name}. ${data.description}`,
                            history: []
                        },
                        maxPlayers: data.max_players,
                        currentPlayers: [],
                        backgroundColor: data.background_color || '#1a1a2e',
                        environmentImage: data.environment_image || 'neutral'
                    };

                    // Add this lobby to available lobbies so it can be found
                    const currentLobbies = get().availableLobbies;
                    const updatedLobbies = currentLobbies.filter(l => l.lobbyId !== lobby.lobbyId);
                    updatedLobbies.push(lobby);
                    set({ availableLobbies: updatedLobbies });

                    return await get().joinLobby(lobby.lobbyId);
                } catch (error) {
                    console.error('Error joining custom lobby by code:', error);
                    return false;
                }
            },

            // Load user's own custom lobbies
            loadMyCustomLobbies: async () => {
                try {
                    const { profile } = get();
                    if (!profile) return [];

                    const { data, error } = await supabase
                        .from('custom_lobbies')
                        .select('*')
                        .eq('created_by', profile.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        // Convert to Lobby format
                        const myLobbies: Lobby[] = data.map(customLobby => ({
                            lobbyId: customLobby.lobby_code,
                            name: customLobby.name,
                            description: customLobby.description,
                            theme: customLobby.theme,
                            hostAvatar: {
                                name: profile.username,
                                model: profile.selected_avatar_model || '/avatars/raiden.vrm',
                                personality: `You are ${profile.username}, the host of ${customLobby.name}. ${customLobby.description}`,
                                history: []
                            },
                            maxPlayers: customLobby.max_players,
                            currentPlayers: [],
                            backgroundColor: customLobby.background_color || '#1a1a2e',
                            environmentImage: customLobby.environment_image || 'neutral'
                        }));

                        return myLobbies;
                    }
                    return [];
                } catch (error) {
                    console.error('Error loading my custom lobbies:', error);
                    return [];
                }
            },

            // Delete custom lobby (only by creator)
            deleteCustomLobby: async (lobbyCode: string) => {
                try {
                    const { profile } = get();
                    if (!profile) return false;

                    const { error } = await supabase
                        .from('custom_lobbies')
                        .delete()
                        .eq('lobby_code', lobbyCode.toUpperCase())
                        .eq('created_by', profile.id);

                    return !error;
                } catch (error) {
                    console.error('Error deleting custom lobby:', error);
                    return false;
                }
            }
        }),
        {
            name: 'plottwist-lobby-store',
            partialize: (state) => ({
                currentUser: state.currentUser,
                // Profile ID to reconnect on refresh
                profile: state.profile ? { id: state.profile.id } : null
            }),
        }
    )
);

// Initialize user on store creation
if (typeof window !== 'undefined') {
    useLobbyStore.getState().initializeUser();
    
    // Handle window close/refresh to mark user offline
    window.addEventListener('beforeunload', () => {
        const { currentLobby, profile } = useLobbyStore.getState();
        if (currentLobby && profile) {
            // Create a Blob with proper content type
            const data = JSON.stringify({
                profileId: profile.id,
                lobbyId: currentLobby.lobbyId
            });
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/mark-offline', blob);
        }
    });
}