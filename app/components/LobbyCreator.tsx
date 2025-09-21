"use client";

import { useState } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface LobbyCreatorProps {
    onClose: () => void;
    onSuccess: (lobbyCode: string) => void;
}

const LobbyCreator = ({ onClose, onSuccess }: LobbyCreatorProps) => {
    const { createCustomLobby, profile } = useLobbyStore();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        theme: 'general',
        maxPlayers: 50,
        isPublic: true,
        tags: [] as string[]
    });

    // Host customization state
    const [hostData, setHostData] = useState({
        useMyProfile: true,
        customHostName: '',
        customHostAvatar: '/avatars/raiden.vrm',
        additionalKnowledge: ''
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


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        if (!profile) {
            alert('You need to create a profile first before creating a room!');
            return;
        }

        console.log('Creating lobby with profile:', profile);

        setIsCreating(true);
        try {
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
        } catch (error) {
            console.error('Error creating lobby:', error);
            alert('Failed to create room. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-700 w-full max-w-2xl">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl text-white">
                            🏗️ Create Your Room
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

                <CardContent>
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
                                    onChange={(e) => setHostData({ ...hostData, useMyProfile: e.target.checked })}
                                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="useMyProfile" className="text-sm text-gray-300">
                                    Use my profile as room host (recommended)
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
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Additional Host Knowledge (Optional)
                                </label>

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
                                {isCreating ? 'Creating...' : 'Create Room'}
                            </Button>
                        </div>
                    </form>

                    {/* Info */}
                    <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <p className="text-blue-300 text-sm">
                            💡 Your room will get a unique URL like <strong>YNGO.vercel.app/ABC123</strong> that you can share with others!
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LobbyCreator;