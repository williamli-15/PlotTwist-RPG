// DynamicChatService.js - Chat service that adapts to different lobby personalities

/**
 * Configuration for OpenRouter API
 */
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * @typedef {Object} Message
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} message - The NPC's response
 * @property {string} [emotion] - Optional emotion/state for the NPC
 * @property {string} [animation] - Optional animation to play
 */

import inventoryData from '@/public/context/glb_metadata_output.txt';

class DynamicChatService {
    constructor(lobbyConfig = null) {
        this.lobbyConfig = lobbyConfig;
        this.messageHistory = [];
        this.initializePersonality();
    }

    /**
     * Initialize the chat service with the appropriate personality based on lobby
     */
    initializePersonality() {
        let systemPrompt = '';

        if (!this.lobbyConfig) {
            // Default JordanTheJet personality (fallback)
            systemPrompt = this.getDefaultPersonality();
        } else {
            // Use the lobby host's personality
            systemPrompt = this.buildLobbyPersonality();
        }

        this.messageHistory = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];
    }

    /**
     * Build personality prompt based on lobby configuration
     */
    buildLobbyPersonality() {
        const hostAvatar = this.lobbyConfig.hostAvatar;
        let prompt = hostAvatar.personality;

        // Add lobby-specific context
        if (this.lobbyConfig.lobbyId === 'hack-nation') {
            prompt += `\n\nContext: You're hosting the Hack-Nation: Global AI Online-Hackathon event (August 9-10, 2025).
            - 2000+ AI builders from 60+ countries are participating
            - $5k+ in API & Cash prizes sponsored by OpenAI
            - Four competition tracks: Agentic AI & Data Engineering, Model Fine-Tuning, Rapid Prototyping, Small Model Deployment
            - Featured speakers include Rama (MIT), Julian (OpenAI), Gregory (Google), and Hubertus (MyMuesli co-founder)
            - Previous winners: SynthShape (AI 3D modeling), ThermoTrace (thermal drone analysis), AI Scam Shield
            
            You can help participants:
            - Navigate the competition tracks
            - Connect with mentors and speakers
            - Learn about career opportunities
            - Understand the hackathon schedule and prizes`;

            // Add event schedule
            if (hostAvatar.eventSchedule) {
                prompt += `\n\nEvent Schedule:\n${hostAvatar.eventSchedule}`;
            }

            // Add contact info
            if (hostAvatar.contact) {
                prompt += `\n\nContact Information:\n${hostAvatar.contact}`;
            }

            // Add stories
            if (hostAvatar.stories && hostAvatar.stories.length > 0) {
                prompt += `\n\nYour Background Stories:\n${hostAvatar.stories.map(story => `- ${story}`).join('\n')}`;
            }
        } else if (this.lobbyConfig.lobbyId === 'english-professor') {
            prompt += `\n\nContext: You're in your interactive English learning classroom, ready to teach and help students improve their English skills!
            - Actively teach grammar, vocabulary, pronunciation, and conversation
            - Correct mistakes gently and explain the proper usage
            - Give vocabulary lessons and ask students to practice
            - Assign mini English exercises during conversation
            - Use encouraging teaching phrases and praise progress
            - Make learning fun through interactive methods
            
            You help visitors by:
            - Teaching proper English grammar with clear examples
            - Building vocabulary through context and practice
            - Correcting pronunciation and speech patterns
            - Explaining idioms, expressions, and word origins
            - Giving personalized English learning exercises
            - Encouraging students and celebrating their progress`;

            // Add teaching context
            prompt += `\n\nYour Teaching Materials:\nYou have access to grammar guides, vocabulary lists, pronunciation tools, and interactive exercises. Use these to help students learn English effectively.`;

            // Add class schedule
            if (hostAvatar.eventSchedule) {
                prompt += `\n\nClass Schedule:\n${hostAvatar.eventSchedule}`;
            }

            // Add contact info
            if (hostAvatar.contact) {
                prompt += `\n\nContact Information:\n${hostAvatar.contact}`;
            }
        }

        // Add weapon interaction capability
        prompt += `\n\nActions Available:
        - You can allow visitors to try on weapons/items by writing tags like <<try_weapon("player", "[assetName]", "[chain]", "[contractAddress]", "[tokenId]")>> at the end of your message
        - Multiple tags are allowed for multiple items
        - Put tags at the end of your message, the system will handle them
        - Don't mention the tags to visitors, they're for the system only`;

        return prompt;
    }

    /**
     * Get default JordanTheJet personality (fallback)
     */
    getDefaultPersonality() {
        return `You are JordanTheJet, your friendly guide to YNGO (You Never Go Offline) - a metaverse hub of digital twin experiences. You welcome visitors and introduce them to this amazing virtual ecosystem.
                - Keep responses welcoming and informative (2-3 sentences max)
                - Introduce newcomers to YNGO as a metaverse hub where they can explore digital twin experiences
                - Explain that YNGO connects multiple virtual worlds and communities
                - JordanTheJet is enthusiastic about virtual worlds and digital experiences
                - JordanTheJet is a jokester and has a sense of humor, making the metaverse feel welcoming
                - JordanTheJet is a young man (in his 20s) who's passionate about the future of virtual experiences
                - Help visitors understand how to navigate between different worlds and communities in YNGO

                Your Role:
                - Welcome new visitors and explain what YNGO is all about
                - Help users understand the concept of digital twin experiences
                - Guide visitors on how to access different worlds through the portal system
                - Explain the benefits of persistent digital identities across multiple virtual environments
                - Share information about the various communities and experiences available in YNGO
                - Encourage exploration and participation in the metaverse ecosystem
                
                More about YNGO:
                YNGO (You Never Go Offline) is a revolutionary metaverse hub that connects multiple digital twin experiences.
                JordanTheJet helps newcomers understand how YNGO works as a central hub for various virtual worlds.
                Digital twin experiences in YNGO include realistic simulations, educational environments, social spaces, and creative workshops.
                JordanTheJet explains that users can seamlessly move between different worlds and communities within the YNGO ecosystem.
                The platform enables persistent digital identities and experiences that carry across different virtual environments.
                JordanTheJet's main avatar represents the welcoming, tech-savvy guide aesthetic of YNGO.
                JordanTheJet is currently in the YNGO hub world, helping visitors discover the various digital twin experiences available.

                ---

                YNGO Hub Features:
                - Portal system to access different digital twin worlds (Hack-Nation hackathons, English learning environments, and more)
                - Persistent user profiles that carry across all connected worlds
                - Community spaces for collaboration and socializing
                - Creative tools for building and sharing digital experiences
                - Cross-world communication and networking capabilities`;
    }

    /**
     * Update lobby configuration (for when user switches lobbies)
     */
    updateLobbyConfig(newLobbyConfig) {
        this.lobbyConfig = newLobbyConfig;
        this.initializePersonality();
    }

    /**
     * Add a new message to the history
     * @param {string} role 
     * @param {string} content 
     */
    addMessage(role, content) {
        this.messageHistory.push({ role, content });
    }

    /**
     * Get NPC's response to user message
     * @param {string} userMessage 
     * @param {(partialMessage: string) => void} onStream - Callback for streaming updates
     * @returns {Promise<ChatResponse>}
     */
    async getNPCResponse(userMessage, onStream = () => {}) {
        this.addMessage('user', userMessage);

        try {
            console.log('Message history length:', this.messageHistory.length);
            console.log('Current lobby:', this.lobbyConfig?.name || 'Default');
            
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

            if (!response.body) {
                throw new Error('No response body');
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
                        
                        // Safely call the streaming callback
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
                animation: "Talk"
            };

            this.addMessage('assistant', npcResponse.message);
            return npcResponse;

        } catch (error) {
            console.error('Error getting NPC response:', error);
            
            // Provide lobby-specific fallback responses
            let fallbackMessage = "Apologies, I seem to be having trouble communicating right now.";
            
            if (this.lobbyConfig?.lobbyId === 'hack-nation') {
                fallbackMessage = "Sorry, my connection to the hackathon servers is having issues. Try again in a moment!";
            } else if (this.lobbyConfig?.lobbyId === 'english-professor') {
                fallbackMessage = "My apologies, but I seem to be having difficulty with my communication channels at the moment.";
            }

            return {
                message: fallbackMessage,
                emotion: "confused",
                animation: "Idle"
            };
        }
    }

    /**
     * Clear chat history (keeps system prompt)
     */
    clearHistory() {
        this.messageHistory = [this.messageHistory[0]];
    }

    /**
     * Get current chat history
     * @returns {Message[]}
     */
    getHistory() {
        return this.messageHistory;
    }

    /**
     * Get current lobby information
     */
    getCurrentLobby() {
        return this.lobbyConfig;
    }
}

export default DynamicChatService;