"use client";

import { useState, useEffect } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Lobby } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface LobbyCreatorProps {
    onClose: () => void;
    onSuccess: (lobbyCode: string) => void;
    editingLobby?: Lobby | null;  // Optional lobby to edit
}

const LobbyCreator = ({ onClose, onSuccess, editingLobby }: LobbyCreatorProps) => {
    const { createCustomLobby, updateCustomLobby, profile } = useLobbyStore();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        theme: 'general',
        maxPlayers: 10,
        isPublic: true,
        tags: [] as string[]
    });

    // Host customization state
    const [hostData, setHostData] = useState({
        useMyProfile: false,
        customHostName: '',
        customHostAvatar: '/avatars/raiden.vrm',
        additionalKnowledge: ''
    });

    // Initialize form data when editing
    useEffect(() => {
        if (editingLobby) {
            // Extract lobby data from the editing lobby
            setFormData({
                name: editingLobby.name,
                description: editingLobby.description,
                theme: editingLobby.theme,
                maxPlayers: editingLobby.maxPlayers,
                isPublic: editingLobby.isPublic ?? true,
                tags: [] // TODO: extract tags if stored
            });

            // For editing mode, we'll use the current host setup
            setHostData({
                useMyProfile: false, // Default to custom host
                customHostName: editingLobby.hostAvatar?.name || '',
                customHostAvatar: editingLobby.hostAvatar?.model || '/avatars/raiden.vrm',
                additionalKnowledge: editingLobby.additionalKnowledge || ''
            });
        }
    }, [editingLobby]);

    // Google search state
    const [googleSearch, setGoogleSearch] = useState<{
        query: string;
        isSearching: boolean;
        results: Array<{
            title: string;
            link: string;
            snippet: string;
            source: string;
        }>;
        showResults: boolean;
        knowledgeGraph: {
            title?: string;
            type?: string;
            description?: string;
            source?: string;
        } | null;
        answerBox: {
            type?: string;
            title?: string;
            snippet?: string;
            source?: string;
        } | null;
    }>({
        query: '',
        isSearching: false,
        results: [],
        showResults: false,
        knowledgeGraph: null,
        answerBox: null
    });


    const themes = [
        { value: 'general', label: '🌐 General Chat' },
        { value: 'ai-hackathon', label: '🤖 AI Hackathon' },
        { value: 'gaming', label: '🎮 Gaming' },
        { value: 'tech', label: '💻 Tech Discussion' },
        { value: 'art', label: '🎨 Art & Design' },
        { value: 'music', label: '🎵 Music' },
        { value: 'business', label: '💼 Business' },
        { value: 'education', label: '📚 Education' }
    ];

    const avatarOptions = [
        {
            id: '1',
            model: '/avatars/raiden.vrm',
            name: 'Raiden',
            preview: '/avatar-previews/raiden.webp',
        },
        {
            id: '2',
            model: '/avatars/ayato.vrm',
            name: 'Ayato',
            preview: '/avatar-previews/ayato.webp',
        },
        {
            id: '3',
            model: '/avatars/kazuha.vrm',
            name: 'Kazuha',
            preview: '/avatar-previews/kazuha.webp',
        },
        {
            id: '4',
            model: '/avatars/eula.vrm',
            name: 'Eula',
            preview: '/avatar-previews/eula.webp',
        }
    ];

    // Google search function
    const handleGoogleSearch = async () => {
        if (!googleSearch.query.trim()) {
            alert('Please enter a search query');
            return;
        }

        setGoogleSearch(prev => ({ ...prev, isSearching: true }));

        try {
            const response = await fetch('/api/google-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: googleSearch.query.trim(),
                    num: 8
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setGoogleSearch(prev => ({
                    ...prev,
                    results: data.results || [],
                    knowledgeGraph: data.knowledgeGraph || null,
                    answerBox: data.answerBox || null,
                    showResults: true,
                    isSearching: false
                }));
            } else {
                alert(`Search failed: ${data.error || 'Unknown error'}`);
                setGoogleSearch(prev => ({ ...prev, isSearching: false }));
            }
        } catch (error) {
            console.error('Google search error:', error);
            alert('Search failed. Please try again.');
            setGoogleSearch(prev => ({ ...prev, isSearching: false }));
        }
    };

    // Function to add search results to knowledge
    const addSearchResultsToKnowledge = () => {
        let knowledgeText = `Search Results for "${googleSearch.query}":\n\n`;

        // Add knowledge graph info if available
        if (googleSearch.knowledgeGraph) {
            const kg = googleSearch.knowledgeGraph;
            knowledgeText += `${kg.title || 'Unknown'}${kg.type ? ` (${kg.type})` : ''}:\n`;
            if (kg.description) knowledgeText += `${kg.description}\n`;
            if (kg.source) knowledgeText += `Source: ${kg.source}\n\n`;
        }

        // Add answer box if available
        if (googleSearch.answerBox) {
            const ab = googleSearch.answerBox;
            knowledgeText += `Quick Answer:\n`;
            if (ab.title) knowledgeText += `${ab.title}\n`;
            if (ab.snippet) knowledgeText += `${ab.snippet}\n`;
            if (ab.source) knowledgeText += `Source: ${ab.source}\n\n`;
        }

        // Add search results
        if (googleSearch.results.length > 0) {
            knowledgeText += `Additional Information:\n`;
            googleSearch.results.forEach((result, index) => {
                knowledgeText += `${index + 1}. ${result.title}\n`;
                if (result.snippet) knowledgeText += `   ${result.snippet}\n`;
                knowledgeText += `   Source: ${result.source}\n\n`;
            });
        }

        knowledgeText += `Note: This information was gathered from Google search and can be used to provide context about "${googleSearch.query}".`;

        setHostData(prev => ({
            ...prev,
            additionalKnowledge: prev.additionalKnowledge
                ? prev.additionalKnowledge + '\n\n' + knowledgeText
                : knowledgeText
        }));

        setGoogleSearch(prev => ({ ...prev, showResults: false, query: '' }));
        alert('Search results added to host knowledge!');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (!profile) {
            alert('You need to create a profile first before creating a room!');
            return;
        }

        console.log(editingLobby ? 'Updating lobby' : 'Creating lobby', 'with profile:', profile);

        setIsCreating(true);
        try {
            if (editingLobby) {
                // Update existing lobby
                const success = await updateCustomLobby(
                    editingLobby.lobbyId, // Use existing lobby code
                    formData.name.trim(),
                    formData.description.trim(),
                    formData.theme,
                    formData.maxPlayers,
                    formData.isPublic,
                    formData.tags,
                    hostData
                );

                if (success) {
                    onSuccess(editingLobby.lobbyId); // Return same lobby code
                } else {
                    alert('Failed to update room. Please try again.');
                }
            } else {
                // Create new lobby
                const lobbyCode = await createCustomLobby(
                    formData.name.trim(),
                    formData.description.trim(),
                    formData.theme,
                    formData.maxPlayers,
                    formData.isPublic,
                    formData.tags,
                    hostData
                );

                if (lobbyCode) {
                    onSuccess(lobbyCode);
                } else {
                    alert('Failed to create room. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error with lobby:', error);
            alert(editingLobby ? 'Failed to update room. Please try again.' : 'Failed to create room. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl text-white">
                            {editingLobby ? '✏️ Edit Your Room' : '🏗️ Create Your Room'}
                        </CardTitle>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Room Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Room Name *
                            </label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter room name..."
                                className="bg-gray-800 border-gray-600 text-white"
                                maxLength={50}
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe your room..."
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                rows={3}
                                maxLength={200}
                            />
                        </div>

                        {/* Theme */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Theme
                            </label>
                            <select
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                {themes.map(theme => (
                                    <option key={theme.value} value={theme.value}>
                                        {theme.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Max Players */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Max Players
                            </label>
                            <Input
                                type="number"
                                value={formData.maxPlayers}
                                onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) || 10 })}
                                min={2}
                                max={1000}
                                className="bg-gray-800 border-gray-600 text-white"
                            />
                        </div>

                        {/* Privacy */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={formData.isPublic}
                                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="isPublic" className="text-sm text-gray-300">
                                Make room discoverable in public listings
                            </label>
                        </div>

                        {/* Host Configuration */}
                        <div className="border-t border-gray-700 pt-6">
                            <h3 className="text-lg font-medium text-white mb-4">🤖 Room Host Configuration</h3>

                            {/* Use My Profile Checkbox */}
                            <div className="flex items-center space-x-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="useMyProfile"
                                    checked={hostData.useMyProfile}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        if (checked && profile?.bio) {
                                            // Adding profile - prepend profile background if not already there
                                            const profileBackground = `Profile Background:\n${profile.bio}`;
                                            if (!hostData.additionalKnowledge.includes('Profile Background:')) {
                                                setHostData(prev => ({
                                                    ...prev,
                                                    useMyProfile: checked,
                                                    additionalKnowledge: profileBackground + (prev.additionalKnowledge ? '\n\n' + prev.additionalKnowledge : '')
                                                }));
                                            } else {
                                                setHostData(prev => ({ ...prev, useMyProfile: checked }));
                                            }
                                        } else if (!checked) {
                                            // Removing profile - remove profile background section
                                            const cleanedKnowledge = hostData.additionalKnowledge
                                                .replace(/Profile Background:\n[\s\S]*?\n\n/, '')  // Remove profile background section
                                                .replace(/^Profile Background:\n[\s\S]*$/, '')     // Remove if it's the only content
                                                .trim();

                                            setHostData(prev => ({
                                                ...prev,
                                                useMyProfile: checked,
                                                additionalKnowledge: cleanedKnowledge
                                            }));
                                        } else {
                                            setHostData(prev => ({ ...prev, useMyProfile: checked }));
                                        }
                                    }}
                                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="useMyProfile" className="text-sm text-gray-300">
                                    Use my profile as room host
                                </label>
                            </div>

                            {/* Custom Host Options */}
                            {!hostData.useMyProfile && (
                                <div className="space-y-4 ml-6 border-l-2 border-gray-600 pl-4">
                                    {/* Custom Host Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Host Name *
                                        </label>
                                        <Input
                                            type="text"
                                            value={hostData.customHostName}
                                            onChange={(e) => setHostData({ ...hostData, customHostName: e.target.value })}
                                            placeholder="Enter host name..."
                                            className="bg-gray-800 border-gray-600 text-white"
                                            maxLength={30}
                                            required={!hostData.useMyProfile}
                                        />
                                    </div>

                                    {/* Custom Host Avatar */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Host Avatar
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {avatarOptions.map(avatar => (
                                                <button
                                                    key={avatar.id}
                                                    type="button"
                                                    onClick={() => setHostData({ ...hostData, customHostAvatar: avatar.model })}
                                                    className={`p-2 rounded-lg border-2 transition-all ${
                                                        hostData.customHostAvatar === avatar.model
                                                            ? 'border-blue-500 bg-blue-500/20'
                                                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                                                    }`}
                                                >
                                                    <img
                                                        src={avatar.preview}
                                                        alt={avatar.name}
                                                        className="w-12 h-12 object-cover rounded"
                                                    />
                                                    <div className="text-xs text-gray-300 mt-1">{avatar.name}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Additional Knowledge */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Additional Host Knowledge (Optional)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setGoogleSearch(prev => ({ ...prev, showResults: !prev.showResults }))}
                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                        🔍 Search Google
                                    </button>
                                </div>

                                {/* Google Search Panel */}
                                {googleSearch.showResults && (
                                    <div className="mb-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                                        <h4 className="text-white font-medium mb-3">Google Knowledge Search</h4>

                                        <div className="flex gap-3 mb-3">
                                            <Input
                                                type="text"
                                                placeholder="Search for information (e.g., 'artificial intelligence', 'React programming')"
                                                value={googleSearch.query}
                                                onChange={(e) => setGoogleSearch(prev => ({ ...prev, query: e.target.value }))}
                                                className="bg-gray-800 border-gray-600 text-white flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleGoogleSearch}
                                                disabled={googleSearch.isSearching || !googleSearch.query.trim()}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                {googleSearch.isSearching ? '🔍 Searching...' : 'Search'}
                                            </Button>
                                        </div>

                                        {/* Search Results */}
                                        {(googleSearch.results.length > 0 || googleSearch.knowledgeGraph || googleSearch.answerBox) && (
                                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-gray-300">
                                                        Search results for "{googleSearch.query}":
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={addSearchResultsToKnowledge}
                                                        className="bg-green-600 hover:bg-green-700 text-xs"
                                                    >
                                                        Add All to Knowledge
                                                    </Button>
                                                </div>

                                                {/* Knowledge Graph */}
                                                {googleSearch.knowledgeGraph && (
                                                    <div className="p-3 bg-blue-900/20 border border-blue-700 rounded">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-blue-300 text-xs font-medium">KNOWLEDGE GRAPH</span>
                                                        </div>
                                                        <h5 className="text-white font-medium text-sm">
                                                            {googleSearch.knowledgeGraph.title}
                                                            {googleSearch.knowledgeGraph.type && (
                                                                <span className="text-gray-400 text-xs ml-2">({googleSearch.knowledgeGraph.type})</span>
                                                            )}
                                                        </h5>
                                                        {googleSearch.knowledgeGraph.description && (
                                                            <p className="text-gray-300 text-xs mt-1">{googleSearch.knowledgeGraph.description}</p>
                                                        )}
                                                        <p className="text-blue-400 text-xs mt-1">Source: {googleSearch.knowledgeGraph.source}</p>
                                                    </div>
                                                )}

                                                {/* Answer Box */}
                                                {googleSearch.answerBox && (
                                                    <div className="p-3 bg-green-900/20 border border-green-700 rounded">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-green-300 text-xs font-medium">QUICK ANSWER</span>
                                                        </div>
                                                        {googleSearch.answerBox.title && (
                                                            <h5 className="text-white font-medium text-sm">{googleSearch.answerBox.title}</h5>
                                                        )}
                                                        {googleSearch.answerBox.snippet && (
                                                            <p className="text-gray-300 text-xs mt-1">{googleSearch.answerBox.snippet}</p>
                                                        )}
                                                        {googleSearch.answerBox.source && (
                                                            <p className="text-green-400 text-xs mt-1">Source: {googleSearch.answerBox.source}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Organic Results */}
                                                {googleSearch.results.map((result, index) => (
                                                    <div key={index} className="p-3 bg-gray-800 rounded border border-gray-600">
                                                        <h5 className="text-white font-medium text-sm">{result.title}</h5>
                                                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{result.snippet}</p>
                                                        <div className="flex justify-between items-center mt-2">
                                                            <a
                                                                href={result.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 hover:text-blue-300 text-xs"
                                                            >
                                                                {result.source} →
                                                            </a>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const resultText = `${result.title}\n${result.snippet}\nSource: ${result.source}`;
                                                                    setHostData(prev => ({
                                                                        ...prev,
                                                                        additionalKnowledge: prev.additionalKnowledge
                                                                            ? prev.additionalKnowledge + '\n\n' + resultText
                                                                            : resultText
                                                                    }));
                                                                    alert('Result added to knowledge!');
                                                                }}
                                                                className="bg-green-600 hover:bg-green-700 text-xs"
                                                            >
                                                                Add This
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {googleSearch.results.length === 0 && !googleSearch.knowledgeGraph && !googleSearch.answerBox && !googleSearch.isSearching && googleSearch.query && (
                                            <p className="text-gray-400 text-sm">No search results found. Try different search terms.</p>
                                        )}
                                    </div>
                                )}

                                <textarea
                                    value={hostData.additionalKnowledge}
                                    onChange={(e) => setHostData({ ...hostData, additionalKnowledge: e.target.value })}
                                    placeholder={hostData.useMyProfile
                                        ? "Add extra context about this room or special instructions for your digital twin..."
                                        : "Describe the host's personality, background, or special knowledge for this room..."
                                    }
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    rows={8}
                                    maxLength={50000}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {hostData.additionalKnowledge.length}/50,000 characters
                                    (~{Math.round(hostData.additionalKnowledge.length / 6)} words)
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    isCreating ||
                                    !formData.name.trim() ||
                                    (!hostData.useMyProfile && !hostData.customHostName.trim())
                                }
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {isCreating ? (editingLobby ? 'Updating...' : 'Creating...') : (editingLobby ? 'Update Room' : 'Create Room')}
                            </Button>
                        </div>
                    </form>

                    {/* Info */}
                    <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <p className="text-blue-300 text-sm">
                            💡 Your room will get a unique URL like <strong>YNGO.vercel.app/ABC123</strong>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LobbyCreator;