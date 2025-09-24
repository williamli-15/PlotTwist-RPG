// app/components/DynamicChatService.js - Enhanced to handle BOTH NPCs and Digital Twins

import inventoryData from '@/public/context/glb_metadata_output.txt';

class DynamicChatService {
    /**
     * @param {Object} config - Either lobbyConfig for NPCs or profileConfig for digital twins
     * @param {string} chatType - 'npc' or 'digital-twin'
     */
    constructor(config = null, chatType = 'npc') {
        this.config = config;
        this.chatType = chatType;
        this.messageHistory = [];
        // For digital twins, initialize immediately (synchronous)
        // For NPCs, we'll call initializePersonality() manually to handle async
        if (chatType === 'digital-twin') {
            this.initializePersonality();
        }
    }

    /**
     * Initialize personality based on chat type
     */
    async initializePersonality() {
        let systemPrompt = '';

        if (this.chatType === 'digital-twin') {
            // Handle offline user's digital twin
            systemPrompt = this.buildDigitalTwinPersonality();
        } else if (this.chatType === 'npc') {
            // Handle NPC (lobby host)
            if (!this.config) {
                systemPrompt = this.getDefaultPersonality();
            } else {
                systemPrompt = await this.buildLobbyPersonality();
            }
        }

        this.messageHistory = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];
    }

    /**
     * Build personality for a digital twin (offline user)
     */
    buildDigitalTwinPersonality() {
        const profile = this.config.profile;
        const avatarState = this.config.avatarState;
        
        return `${profile.ai_personality_prompt || `You are ${profile.username}, a digital twin in the metaverse.`}
            
            Context:
            - You are ${profile.username}'s digital twin (they are currently offline)
            - You are in ${avatarState.lobby_id} lobby
            - Your behavior: ${avatarState.ai_behavior} (wandering/idle)
            - Background: ${profile.bio || 'Just exploring the metaverse'}
            - Interests: ${profile.interests?.join(', ') || 'meeting people'}

            Important:
            - You are an AI representation while the real ${profile.username} is offline
            - Keep responses short (1-3 sentences) and true to their personality
            - If asked, mention that the real ${profile.username} is currently offline
            - Be friendly but don't pretend to be the real person
            - Generate natural, contextual greetings based on the situation (time, who you're talking to, etc.)
            - You can share their interests and have conversations based on their personality and Bio
            - You can also refer to other players in the lobby by their usernames and talk about their interests saying I heard that user is interested in [interest] or I heard that user likes [interest]`;
            ;
    }

    /**
     * Build personality for lobby NPC host
     */
    async buildLobbyPersonality() {
        const hostAvatar = this.config.hostAvatar;
        let prompt = hostAvatar.personality || `You are the lobby host here, ${hostAvatar.name}.
            You are friendly and welcoming to all players.
            Your role is to help new players get started and answer any questions they have about the event.
            You can also share interesting facts about the event world and its history.
            Always be polite and encouraging, and try to make everyone feel at home in the lobby.`;

        // Get full lobby data from database, including host knowledge
        const lobbyData = await this.getFullLobbyData();
        if (lobbyData) {
            // Add host's additional knowledge if available
            if (lobbyData.additional_host_knowledge) {
                prompt += `\n\nAdditional Host Knowledge:\n${lobbyData.additional_host_knowledge}\n`;
                prompt += `\nYou have extensive knowledge about the topics above and can discuss them in detail. Use this information to provide helpful, informative responses when relevant to the conversation.`;
            }

            // Add custom host personality if available
            if (lobbyData.custom_host_name && !lobbyData.use_my_profile) {
                prompt = prompt.replace(hostAvatar.name, lobbyData.custom_host_name);
            }

            // If using profile as host, get profile personality
            if (lobbyData.use_my_profile && lobbyData.host_profile_id) {
                const hostProfile = await this.getHostProfile(lobbyData.host_profile_id);
                if (hostProfile) {
                    prompt = `You are ${hostProfile.username}, the host of this room.
                        ${hostProfile.ai_personality_prompt || `You are friendly and welcoming to all players.`}

                        Your Background: ${hostProfile.bio || 'Just exploring the metaverse'}
                        Your Interests: ${hostProfile.interests?.join(', ') || 'meeting people'}

                        ${lobbyData.additional_host_knowledge ? `\nAdditional Room Knowledge:\n${lobbyData.additional_host_knowledge}\n` : ''}

                        You can discuss your background, interests, and any room-specific knowledge you have. Keep responses engaging and true to your personality.`;
                }
            }
        }

        // Get attendee context for this lobby with context management
        const attendees = await this.getLobbyAttendees();
        if (attendees.length > 0) {
            const attendeeContext = this.buildAttendeeContext(attendees, prompt);
            if (attendeeContext) {
                prompt += attendeeContext;
            }
        }

        return prompt;
    }

    /**
     * Get default Agent NPC personality (fallback)
     */
    getDefaultPersonality() {
        // ... existing Agent NPC personality code ...
        return `You are the event world host here.`;
    }

    /**
     * Switch to different personality (for when user comes online/offline)
     */
    switchPersonality(newConfig, newChatType) {
        this.config = newConfig;
        this.chatType = newChatType;
        this.initializePersonality();
    }

    /**
     * Add message to history
     */
    addMessage(role, content) {
        this.messageHistory.push({ role, content });
    }

    /**
     * Get response based on chat type
     */
    async getResponse(userMessage, onStream = () => {}) {
        // For digital twins, track who's talking to them
        if (this.chatType === 'digital-twin') {
            this.addMessage('user', userMessage);
            return this.getDigitalTwinResponse(userMessage, onStream);
        } else {
            // For NPCs, use existing logic
            return this.getNPCResponse(userMessage, onStream);
        }
    }

    /**
     * Get NPC response (existing method)
     */
    async getNPCResponse(userMessage, onStream = () => {}) {
        this.addMessage('user', userMessage);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: this.messageHistory
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            let fullResponse = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() && !line.includes('PROCESSING') && !line.includes('[DONE]'));

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    
                    try {
                        const json = JSON.parse(line.slice(5));
                        const content = json.choices[0].delta.content || '';
                        fullResponse += content;
                        
                        if (typeof onStream === 'function') {
                            onStream(fullResponse);
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                }
            }

            const npcResponse = {
                message: fullResponse,
                emotion: "happy",
                animation: "Talk",
                isNPC: true
            };

            this.addMessage('assistant', npcResponse.message);
            return npcResponse;

        } catch (error) {
            console.error('Error getting NPC response:', error);
            return {
                message: "Apologies, I seem to be having trouble communicating right now.",
                emotion: "confused",
                animation: "Idle",
                isNPC: true
            };
        }
    }

    /**
     * Get digital twin response
     */
    async getDigitalTwinResponse(userMessage, onStream = () => {}) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: this.messageHistory
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            let fullResponse = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    
                    try {
                        const json = JSON.parse(line.slice(5));
                        const content = json.choices[0].delta.content || '';
                        fullResponse += content;
                        
                        if (typeof onStream === 'function') {
                            onStream(fullResponse);
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }

            // Log interaction to Supabase (optional)
            if (this.config?.profile?.id) {
                this.logDigitalTwinInteraction(userMessage, fullResponse);
            }

            const twinResponse = {
                message: fullResponse,
                emotion: "happy",
                animation: "Talk",
                isDigitalTwin: true,
                originalUser: this.config.profile.username
            };

            this.addMessage('assistant', twinResponse.message);
            return twinResponse;

        } catch (error) {
            console.error('Error getting digital twin response:', error);

            // Generate a more dynamic fallback greeting
            const greetings = [
                `Hi there! I'm ${this.config?.profile?.username}'s digital twin.`,
                `Hello! ${this.config?.profile?.username} isn't here right now, but I'm their digital twin.`,
                `Hey! I represent ${this.config?.profile?.username} while they're offline.`,
                `Greetings! I'm the digital version of ${this.config?.profile?.username}.`
            ];
            const fallbackGreeting = greetings[Math.floor(Math.random() * greetings.length)];

            return {
                message: fallbackGreeting,
                emotion: "confused",
                animation: "Idle",
                isDigitalTwin: true,
                originalUser: this.config?.profile?.username
            };
        }
    }

    /**
     * Get full lobby data from database, including host knowledge
     */
    async getFullLobbyData() {
        try {
            if (!this.config?.lobbyId) return null;

            // Import supabase client
            const { supabase } = await import('@/lib/supabase');

            // For custom lobbies, lobbyId is actually the lobby_code, not the database id
            // Try querying by lobby_code first (for custom lobbies)
            let { data: lobbyData, error } = await supabase
                .from('custom_lobbies')
                .select('*')
                .eq('lobby_code', this.config.lobbyId)
                .single();

            // If not found by lobby_code, try by id (fallback for older implementations)
            if (error && error.code === 'PGRST116') {
                ({ data: lobbyData, error } = await supabase
                    .from('custom_lobbies')
                    .select('*')
                    .eq('id', this.config.lobbyId)
                    .single());
            }

            if (error) {
                console.error('Error fetching lobby data:', error);
                return null;
            }

            return lobbyData;
        } catch (error) {
            console.error('Error getting full lobby data:', error);
            return null;
        }
    }

    /**
     * Get host profile data if using profile as host
     */
    async getHostProfile(profileId) {
        try {
            if (!profileId) return null;

            // Import supabase client
            const { supabase } = await import('@/lib/supabase');

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();

            if (error) {
                console.error('Error fetching host profile:', error);
                return null;
            }

            return profile;
        } catch (error) {
            console.error('Error getting host profile:', error);
            return null;
        }
    }

    /**
     * Build attendee context with smart context limit management
     */
    buildAttendeeContext(attendees, currentPrompt) {
        // Estimate current prompt size (rough character count)
        const currentSize = currentPrompt.length;
        const maxTotalSize = 200000; // Modern AI models support much larger contexts (200k chars ≈ 50k tokens)
        const availableSpace = maxTotalSize - currentSize;

        // Reserve space for the context introduction and closing
        const reservedSpace = 1000; // More space for richer context formatting
        const attendeeSpace = availableSpace - reservedSpace;

        if (attendeeSpace < 2000) {
            // Not enough space for meaningful attendee context
            console.log('Insufficient context space for attendee information');
            return null;
        }

        // Sort attendees by recent activity (most recent first)
        const sortedAttendees = [...attendees].sort((a, b) => {
            // If we have last_seen data, use it, otherwise treat as equally recent
            const aTime = a.last_seen ? new Date(a.last_seen) : new Date();
            const bTime = b.last_seen ? new Date(b.last_seen) : new Date();
            return bTime - aTime;
        });

        let context = `\n\nAttendees currently in this lobby:\n`;
        let usedSpace = context.length;
        let includedCount = 0;

        for (const attendee of sortedAttendees) {
            // Build attendee description
            const bio = attendee.bio?.trim() || '';
            const interests = attendee.interests?.length > 0 ? attendee.interests.join(', ') : '';
            const personality = attendee.ai_personality_prompt?.trim() || '';

            // Create a concise but informative description
            let description = `- **${attendee.username}**`;

            // Add the most relevant information in order of priority - now with more generous limits
            if (bio && bio.length < 800) {
                description += `: ${bio}`;
            } else if (personality && personality.length < 600) {
                description += `: ${personality}`;
            } else if (interests) {
                description += `: Interested in ${interests}`;
            } else {
                description += `: A participant in the room`;
            }

            // Add interests if we have space and they're not already included
            if (interests && !description.includes(interests) && description.length < 1000) {
                description += `. Enjoys: ${interests}`;
            }

            description += `\n`;

            // Check if we have space for this attendee
            if (usedSpace + description.length > attendeeSpace) {
                break;
            }

            context += description;
            usedSpace += description.length;
            includedCount++;
        }

        // Add helpful instruction for the host
        const totalAttendees = attendees.length;
        if (includedCount < totalAttendees) {
            context += `\n(And ${totalAttendees - includedCount} other attendees)\n`;
        }

        context += `\nYou can introduce people to each other, mention their interests and backgrounds in conversations, and help create connections between attendees with similar interests. Be welcoming and help facilitate meaningful interactions.`;

        return context;
    }

    /**
     * Get all attendees (profiles) for this lobby
     */
    async getLobbyAttendees() {
        try {
            if (!this.config?.lobbyId) return [];
            
            // Import supabase client
            const { supabase } = await import('@/lib/supabase');
            
            // Use a simpler query - get profile IDs from avatar_states first
            const { data: avatarStates, error: avatarError } = await supabase
                .from('avatar_states')
                .select('profile_id')
                .eq('lobby_id', this.config.lobbyId);

            if (avatarError) {
                console.error('Error fetching avatar states:', avatarError);
                return [];
            }

            if (!avatarStates || avatarStates.length === 0) {
                return [];
            }

            // Get profiles for those profile IDs
            const profileIds = avatarStates.map(state => state.profile_id);
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, ai_personality_prompt, bio, interests, last_seen')
                .in('id', profileIds);

            if (profileError) {
                console.error('Error fetching profiles:', profileError);
                return [];
            }
            
            return profiles || [];
        } catch (error) {
            console.error('Error fetching lobby attendees:', error);
            return [];
        }
    }

    /**
     * Log digital twin interaction to Supabase (disabled for now to avoid errors)
     */
    async logDigitalTwinInteraction(userMessage, twinResponse) {
        // Temporarily disabled to avoid database errors
        // TODO: Create digital_twin_chats table or fix the schema
        return;

        try {
            // Import supabase client
            const { supabase } = await import('@/lib/supabase');

            await supabase
                .from('digital_twin_chats')
                .insert({
                    profile_id: this.config.profile.id,
                    lobby_id: this.config.avatarState.lobby_id,
                    visitor_message: userMessage,
                    twin_response: twinResponse,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error logging digital twin interaction:', error);
        }
    }

    /**
     * Clear chat history
     */
    clearHistory() {
        this.messageHistory = [this.messageHistory[0]];
    }

    /**
     * Get chat history
     */
    getHistory() {
        return this.messageHistory;
    }

    /**
     * Get chat type
     */
    getChatType() {
        return this.chatType;
    }

    /**
     * Check if chatting with digital twin
     */
    isDigitalTwin() {
        return this.chatType === 'digital-twin';
    }

    /**
     * Check if chatting with NPC
     */
    isNPC() {
        return this.chatType === 'npc';
    }
}

export default DynamicChatService;