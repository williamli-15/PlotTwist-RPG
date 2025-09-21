/**
 * Edge TTS Service - Framework agnostic text-to-speech using Microsoft Edge's speech synthesis
 * Direct port from working HTML implementation - DO NOT MODIFY SSML GENERATION
 */

class EdgeTTSService {
    constructor() {
        this.textEncoder = new TextEncoder();
        this.binaryHeadEnd = this.textEncoder.encode('Path:audio\r\n').toString();
        this.voiceList = {};
        this.languageList = [];
        this.isInitialized = false;
        this.defaultConfig = {
            language: 'en-US',
            voiceIndex: 0,
            pitch: 0,
            rate: 0,
            volume: 0,
            audioFormat: 'webm-24khz-16bit-mono-opus'
        };
        this.debugMode = false; // Enable/disable debug logs
    }

    /**
     * Enable or disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Debug logger
     */
    _debug(...args) {
        if (this.debugMode) {
            console.log('[TTS Debug]', ...args);
        }
    }

    /**
     * Initialize the service by fetching available voices
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            const response = await fetch(
                'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'
            );
            const data = await response.json();
            
            data.forEach(item => {
                if (!this.voiceList[item.Locale]) {
                    this.languageList.push(item.Locale);
                    this.voiceList[item.Locale] = [];
                }
                this.voiceList[item.Locale].push(item);
            });
            
            this.isInitialized = true;
            this._debug('Initialized with', this.languageList.length, 'languages');
        } catch (error) {
            console.error('Failed to initialize TTS service:', error?.message || error || 'Unknown TTS initialization error');
            throw error;
        }
    }

    /**
     * Generate a GUID - EXACT COPY FROM ORIGINAL
     * @private
     */
    _generateGuid() {
        function gen(count) {
            var out = "";
            for (var i=0; i<count; i++) {
                out += (((1+Math.random())*0x10000)|0).toString(16).substring(1);
            }
            return out;
        }
        return gen(8);
    }

    /**
     * Convert number to signed string - EXACT COPY FROM ORIGINAL
     * @private
     */
    _numToString(num) {
        return num >= 0 ? `+${num}` : `${num}`;
    }

    /**
     * Generate speech config string - EXACT COPY FROM ORIGINAL
     * @private
     */
    _getSpeechConfig(audioFormat = 'webm-24khz-16bit-mono-opus') {
        const config = `X-Timestamp:${new Date()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"${audioFormat}"}}}}`;
        this._debug('Speech config:', config);
        return config;
    }

    /**
     * Generate SSML text - EXACT COPY FROM ORIGINAL
     * @private
     */
    _getSSMLText({requestId, lan, voiceName, pitch, rate, volume, text}) {
        const ssml = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date()}\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='${lan}'><voice name='${voiceName}'><prosody pitch='${pitch}Hz' rate ='${rate}%' volume='${volume}%'>${text}</prosody></voice></speak>`;
        this._debug('SSML:', ssml);
        return ssml;
    }

    /**
     * Get available voices for a specific language
     * @param {string} language - Language code (e.g., 'en-US')
     * @returns {Array} List of available voices
     */
    getVoicesForLanguage(language) {
        if (!this.isInitialized) {
            console.warn('TTS service not initialized. Call initialize() first.');
            return [];
        }
        return this.voiceList[language] || [];
    }

    /**
     * Get all available languages
     * @returns {Array} List of available language codes
     */
    getAvailableLanguages() {
        if (!this.isInitialized) {
            console.warn('TTS service not initialized. Call initialize() first.');
            return [];
        }
        return this.languageList;
    }

    /**
     * Find the best voice for the given preferences
     * @param {Object} preferences - Voice preferences
     * @returns {Object|null} Selected voice object
     */
    findBestVoice(preferences = {}) {
        const { language = 'en-US', gender = 'Female', name = null } = preferences;
        
        const voices = this.getVoicesForLanguage(language);
        if (!voices.length) return null;
        
        // If specific name is requested
        if (name) {
            const voice = voices.find(v => v.ShortName === name || v.Name === name);
            if (voice) return voice;
        }
        
        // Try to find by gender
        if (gender) {
            const genderedVoice = voices.find(v => v.Gender === gender);
            if (genderedVoice) return genderedVoice;
        }
        
        // Return first available voice
        return voices[0];
    }

    /**
     * Generate audio from text - FOLLOWING ORIGINAL PATTERN
     * @param {string} text - Text to convert to speech
     * @param {Object} options - TTS options
     * @returns {Promise<string>} URL of the generated audio blob
     */
    async generateAudio(text, options = {}) {
        if (!this.isInitialized) {
            try {
                await this.initialize();
            } catch (initError) {
                console.warn('TTS initialization failed, cannot generate audio');
                throw new Error('TTS service unavailable');
            }
        }

        // Validate input
        if (!text || text.trim().length === 0) {
            throw new Error('No text provided for speech synthesis');
        }

        if (text.length > 1000) {
            console.warn('Text too long for TTS, truncating...');
            text = text.substring(0, 997) + '...';
        }

        const config = { ...this.defaultConfig, ...options };

        this._debug('Generating audio for text:', text);
        this._debug('With options:', config);
        
        return new Promise((resolve, reject) => {
            if (!text) {
                reject(new Error("Text is required"));
                return;
            }

            const bufferList = [];
            const requestId = this._generateGuid();
            
            // Get voice
            let voice;
            if (config.voiceName) {
                // Find voice by name across all languages
                for (const lang in this.voiceList) {
                    voice = this.voiceList[lang].find(v => 
                        v.ShortName === config.voiceName || v.Name === config.voiceName
                    );
                    if (voice) {
                        config.language = lang;
                        break;
                    }
                }
            } else {
                const voices = this.voiceList[config.language];
                if (voices && voices[config.voiceIndex]) {
                    voice = voices[config.voiceIndex];
                }
            }

            if (!voice) {
                reject(new Error(`Voice not found for language: ${config.language}`));
                return;
            }

            this._debug('Using voice:', voice.Name);

            const ws = new WebSocket(
                "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4"
            );

            ws.addEventListener('open', () => {
                this._debug('WebSocket opened');
                // Send config first
                ws.send(this._getSpeechConfig(config.audioFormat));
                // Then send SSML - FOLLOWING ORIGINAL PATTERN
                ws.send(this._getSSMLText({
                    requestId,
                    text: text, // Send text as-is, like original
                    lan: config.language,
                    voiceName: voice.Name,
                    pitch: this._numToString(config.pitch),
                    rate: this._numToString(config.rate),
                    volume: this._numToString(config.volume)
                }));
            });

            ws.addEventListener('message', async ({ data }) => {
                if (data instanceof Blob) {
                    const view = new Uint8Array(await data.arrayBuffer());
                    bufferList.push(...view.toString().split(this.binaryHeadEnd)[1].split(',').slice(1).map(i => +i));
                    
                    // Check for end marker - EXACT SAME AS ORIGINAL
                    if(view[0] == 0x00 && view[1] == 0x67 && view[2] == 0x58) {
                        ws.close(1000);
                    }
                }
            });

            ws.addEventListener('error', (err) => {
                console.error('WebSocket error:', err?.message || err || 'Unknown WebSocket error');
                reject(err);
            });

            ws.addEventListener('close', (event) => {
                this._debug('WebSocket closed with code:', event.code);
                if (event.code != 1000) {
                    console.error('WebSocket closed with error:', event?.reason || event?.code || 'Connection closed unexpectedly');
                    reject(new Error(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`));
                    return;
                }
                
                const blob = new Blob([new Uint8Array(bufferList)], { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                resolve(url);
            });
        });
    }

    /**
     * Speak text using TTS
     * @param {string} text - Text to speak
     * @param {Object} options - TTS options
     * @returns {Promise<HTMLAudioElement>} Audio element that's playing
     */
    async speak(text, options = {}) {
        const audioUrl = await this.generateAudio(text, options);
        const audio = new Audio(audioUrl);
        
        // Clean up blob URL after audio ends
        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
        });
        
        await audio.play();
        return audio;
    }

    /**
     * Download generated audio
     * @param {string} text - Text to convert to speech
     * @param {Object} options - TTS options
     * @param {string} filename - Download filename (optional)
     * @returns {Promise<void>}
     */
    async download(text, options = {}, filename = null) {
        const audioUrl = await this.generateAudio(text, options);
        
        const link = document.createElement('a');
        link.download = filename || `tts_audio_${Date.now()}.webm`;
        link.href = audioUrl;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(audioUrl), 100);
    }

    /**
     * Stop all currently playing audio
     * @param {HTMLAudioElement} audio - Audio element to stop
     */
    stopAudio(audio) {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    }
}

// Create singleton instance
const ttsService = new EdgeTTSService();

// Export both the class and the singleton instance
export { EdgeTTSService };
export default ttsService;