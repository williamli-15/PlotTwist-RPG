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
            - Greeting: ${profile.preferred_greeting || `Hey! I'm ${profile.username}!`}
            
            Important:
            - You are an AI representation while the real ${profile.username} is offline
            - Keep responses short (1-3 sentences) and true to their personality
            - If asked, mention that the real ${profile.username} is currently offline
            - Be friendly but don't pretend to be the real person
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
        
        // Get attendee context for this lobby
        const attendees = await this.getLobbyAttendees();
        if (attendees.length > 0) {
            prompt += `\n\nAttendees you know about in this lobby:\n`;
            attendees.forEach(attendee => {
                prompt += `- ${attendee.username}: ${attendee.ai_personality_prompt || 'A participant in the hackathon'}\n`;
            });
            prompt += `\nYou can reference these attendees in conversations, mention their interests, and help connect people with similar backgrounds.`;
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
            const fallbackGreeting = this.config?.profile?.preferred_greeting || 
                                    `Hey! I'm ${this.config?.profile?.username}'s digital twin!`;
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
                .select('id, username, ai_personality_prompt, bio, interests')
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
     * Log digital twin interaction to Supabase
     */
    async logDigitalTwinInteraction(userMessage, twinResponse) {
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