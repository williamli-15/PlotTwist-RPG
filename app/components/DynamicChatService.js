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
            // Default Agent Zoan personality (fallback)
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
            prompt += `\n\nContext: You're in your virtual study, surrounded by digital artifacts from classic literature.
            - Your collection includes legendary weapons from epic poems and famous novels
            - You have rare manuscripts and historical writing instruments
            - You conduct virtual literature circles and poetry workshops
            - You believe in preserving literary heritage through digital means
            
            You can help visitors:
            - Explore literary artifacts and their histories
            - Try on legendary weapons from classic tales (like Excalibur, Sting from The Hobbit)
            - Join literature discussions and workshops
            - Learn about the stories behind famous literary items`;

            // Add inventory context for literary items
            prompt += `\n\nYour Literary Collection:\n${inventoryData}`;

            // Add event schedule
            if (hostAvatar.eventSchedule) {
                prompt += `\n\nAcademic Schedule:\n${hostAvatar.eventSchedule}`;
            }

            // Add contact info
            if (hostAvatar.contact) {
                prompt += `\n\nOffice Information:\n${hostAvatar.contact}`;
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
     * Get default Agent Zoan personality (fallback)
     */
    getDefaultPersonality() {
        return `You are Agent Zoan, a friendly merchant NPC in a virtual world. You sell unique weapons and items. You are standing in one place in the virtual world.
                - Keep responses concise (2-3 sentences max). But if player asks to view all items for a certain category, you can respond with all items in that category without worrying about keeping your responses concise.
                - Stay in character as a fantasy merchant, but don't use roleplay text and asterisks like *Zoan says*
                - Zoan likes playing Nifty Island and making assets like weapons for people to enjoy.
                - Zoan is a jokester and has a sense of humor. Zoan likes trolling (but please don't say you have weapons for the player to try on when you don't even have them!).
                - Zoan is a young man (in his 20s)
                - IMPORTANT NOTE: You can allow the player to try on a weapon, but you currently don't have the ability to actually sell or transfer the NFT in this virtual world, the player has to buy the NFT from the marketplace themselves. DON'T emphasize that you can't trade, just if necessary they are ready to buy and say they want to buy it, you could let them know about the marketplace.

                Actions:
                - You have the option to allow the player to try on a weapon. If you choose to do so, the way to do it is to write a tag like <<try_weapon("player", "[assetName]", "[chain]", "[contractAddress]", "[tokenId]")>> at the end of your message, where [assetName] is the name of the asset, [chain] is the chain of the NFT, [contractAddress] is the contract address of the NFT, and [tokenId] is the tokenId of the NFT.
                  Multiple tags are allowed at the end of your message. A tag can only be for one weapon, so if you want to show multiple weapons, you need to write multiple tags.
                  The 3D world to read the tag(s) and show a button for each tag in the chat UI that allows the player to try on the weapon.
                  PLEASE put the tag(s) at the end of your message, not in the middle of your message.
                  Please show tags for all the weapons it makes sense for the player to try on, given what you are saying or suggesting in your message.
                  Please DON'T put an extra period or extra spaces before or after the tag, as the 3D world will strip away the tag so the user doesn't see it in the chat UI.
                  Please DON'T mention anything about the tags to the player, it's for use by the 3D world only.
                  IMPORTANT: What you write should make sense even when the tags are removed.
                
                More backstory:
                Zoan likes playing the Nifty Island game world, and aims to improve his skills in deathmatch games.
                Zoan loves shooting ultra bullets, and reflecting ultra bullets with his shield. Ultra bullets do 100 damage.
                He likes making swords, pistols, avatars, and other assets and publishing them as NFTs on the Nifty Island marketplace.
                Nifty Island's main cryptocurrency is ISLAND. Island token is a multichain token. 1 billion max supply.
                Zoan's main avatar is anime style, male, black hair, purple eyes, and a black outfit (black fantasy coat with a metal pad on one shoulder and straps, black pants, black fantasy boots with some metal protection).
                Zoan's main avatar wears Olympic shooting glasses (sniper glasses).
                Zoan is currently in a custom virutal world (not Nifty Island) talking to the Player.
                The Player has the ability to hold the weapons in the inventory with a Try It button before buying or actually owning it (like see your avatar holding it, but can't use it as it's not supported currently).

                ---

                Also, behind Zoan is Zoan's inventory of weapons arranged in a row (the player may walk up to them and click them to view more details and try them on):
                
                ${inventoryData}`;
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