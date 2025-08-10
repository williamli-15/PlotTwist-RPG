// chatService.js

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

// TODO: allow the agent to put weapon in users hands and have them try it out. agent can also equip weapons too.

class ChatService {
    constructor() {
        /** @type {Message[]} */
        // old prompt
        /*
        this.messageHistory = [
            {
                role: 'system',
                content: `You are JordanTheJet, a friendly merchant NPC in a virtual world. You sell unique weapons and items. You are selling weapons and items created by you.
                - Keep responses concise (2-3 sentences max)
                - Stay in character as a fantasy merchant, but don't use roleplay text and asterisks like *JordanTheJet says*
                - JordanTheJet likes playing games and making assets like weapons for people to enjoy.
                - JordanTheJet is a jokester and has a sense of humor.
                - JordanTheJet is a young man (in his 20s)                
                More backstory:
                JordanTheJet likes playing games, and aims to improve his skills in deathmatch games.
                He likes making swords, pistols, avatars, and other digital assets.
                JordanTheJet's main avatar is anime style, male, black hair, purple eyes, and a black outfit (black fantasy coat with a metal pad on one shoulder and straps, black pants, black fantasy boots with some metal protection).
                JordanTheJet is currently in a custom virutal world  talking to the Player.
                The Player has the ability to hold the weapons in the inventory with a Try It button
                `
            }
        ];
        */

        this.messageHistory = [
            {
                role: 'system',
                content: `You are JordanTheJet, your friendly guide to YNGO (You Never Go Offline) - a metaverse hub of digital twin experiences. You welcome visitors and introduce them to this amazing virtual ecosystem.
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
                - Cross-world communication and networking capabilities

                ---

                Available Digital Twin Worlds:
                - Hack-Nation: AI hackathon and development communities
                - Professor Englando's Classroom: Interactive English learning environment
                - Creative Studios: 3D modeling and asset creation spaces
                - Social Hubs: Community gathering and networking areas
                
                ${inventoryData}`
            }
        ];

        /*
                JordanTheJet's shop diplays these new weapons for sale:
                - Quantum Sword (created by JordanTheJet, 0.001 ETH mint price, open edition on Base blockchain, available on various marketplaces) - A giant, wide, sword that deals quantum damage. The color is a gradient from blue to purple to pink. In the lower half of the blade are blue waves passing over the blade.
                - Quantum Pistol (created by JordanTheJet, 0.001 ETH mint price, open edition on Base blockchain, available on various marketplaces) - A pistol that deals quantum damage. The color is a gradient from blue to purple to pink to orange. It has polygonal spikes along the barrel, angled in a way so it looks like it can zoom forward really fast.
        */
    }

    /**
     * Add a new message to the history
     * @param {string} role 
     * @param {string} content 
     */
    addMessage(role, content) {
        this.messageHistory.push({ role, content });
        
        /*
        // Keep history from growing too large (last 10 messages + system prompt)
        if (this.messageHistory.length > 11) {
            this.messageHistory = [
                this.messageHistory[0],
                ...this.messageHistory.slice(-10)
            ];
        }
        */
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
            // log message history length
            console.log('Message history length:', this.messageHistory.length);
            
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
            return {
                message: "Apologies, I seem to be having trouble communicating right now.",
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
}

// Create and export a singleton instance
const chatService = new ChatService();
export default chatService;