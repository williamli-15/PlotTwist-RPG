// app/components/ProfileCreator.tsx - Enhanced version with personality

"use client";

import { useState } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const ProfileCreator = ({ onComplete }: { onComplete: () => void }) => {
    const { createProfile, profile } = useLobbyStore();
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    
    // Profile data
    const [username, setUsername] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('/avatars/raiden.vrm');
    const [personality, setPersonality] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [preferredGreeting, setPreferredGreeting] = useState('');

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

    const personalityTemplates = [
        { label: "Friendly Explorer", value: "friendly and curious, loves meeting new people and exploring virtual worlds" },
        { label: "Tech Enthusiast", value: "passionate about technology, AI, and the future of the metaverse" },
        { label: "Creative Artist", value: "artistic soul who enjoys creating and sharing creative experiences" },
        { label: "Chill Gamer", value: "laid-back gamer who enjoys hanging out and having fun conversations" },
        { label: "Knowledge Seeker", value: "always learning, asking questions, and sharing interesting facts" },
        { label: "Custom", value: "" }
    ];

    const interestOptions = [
        "🎮 Gaming", "🤖 AI/Tech", "🎨 Art", "🎵 Music", 
        "📚 Learning", "💬 Chatting", "🌍 Exploring", "⚔️ Combat",
        "🏗️ Building", "📖 Stories", "🎬 Movies", "🏃 Sports"
    ];

    const handleCreateProfile = async () => {
        if (!username.trim()) {
            alert('Please enter a username');
            return;
        }

        setIsCreating(true);
        
        // Build the full profile with personality
        const profileData = {
            username: username.trim(),
            selected_avatar_model: selectedAvatar,
            personality: personality || personalityTemplates[0].value,
            bio: bio.trim(),
            interests: interests,
            preferred_greeting: preferredGreeting || `Hey! I'm ${username.trim()}!`,
            // This will be used when the digital twin is offline and someone chats with it
            ai_personality_prompt: `You are ${username.trim()}, a metaverse resident. 
                Personality: ${personality || personalityTemplates[0].value}. 
                Bio: ${bio || 'Just exploring the metaverse!'}
                Interests: ${interests.join(', ') || 'meeting people'}.
                When greeting others, you say: "${preferredGreeting || `Hey! I'm ${username.trim()}!`}"
                Keep responses friendly and brief, staying true to this personality.`
        };

        const success = await createProfile(
            profileData.username,
            profileData.selected_avatar_model,
            profileData.ai_personality_prompt,
            profileData.bio,
            profileData.interests
        );
        
        if (success) {
            onComplete();
        } else {
            alert('Failed to create profile. Try a different username.');
        }
        setIsCreating(false);
    };

    // If profile exists, show welcome back
    if (profile) {
        return (
            <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-600">
                <CardContent className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Welcome back, {profile.username}!
                    </h2>
                    <p className="text-gray-300 mb-4">
                        Your digital twin is ready to explore the metaverse.
                    </p>
                    <Button onClick={onComplete} className="w-full">
                        Enter YNGO
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto bg-gray-800 border-gray-600">
            <CardHeader>
                <CardTitle className="text-2xl text-center text-white">
                    Create Your Digital Twin
                </CardTitle>
                <p className="text-center text-gray-300">
                    Your avatar will persist in the metaverse even when you're offline!
                </p>
                <div className="flex justify-center gap-2 mt-4">
                    <Badge variant={step === 1 ? "default" : "outline"}>1. Identity</Badge>
                    <Badge variant={step === 2 ? "default" : "outline"}>2. Avatar</Badge>
                    <Badge variant={step === 3 ? "default" : "outline"}>3. Personality</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {/* Step 1: Username */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-white mb-2 block">Choose Your Username</label>
                            <Input
                                type="text"
                                placeholder="Enter username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                                maxLength={20}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                This is how others will know you in the metaverse
                            </p>
                        </div>

                        <div>
                            <label className="text-white mb-2 block">Your Greeting (optional)</label>
                            <Input
                                type="text"
                                placeholder={`Hey! I'm ${username || 'your name'}!`}
                                value={preferredGreeting}
                                onChange={(e) => setPreferredGreeting(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                                maxLength={100}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                What your digital twin says when meeting someone
                            </p>
                        </div>

                        <Button
                            onClick={() => username.trim() && setStep(2)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={!username.trim()}
                        >
                            Next: Choose Avatar
                        </Button>
                    </div>
                )}

                {/* Step 2: Avatar Selection */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-white mb-2 block">Select Your Avatar</label>
                            <div className="grid grid-cols-4 gap-4">
                                {avatarOptions.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.model)}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            selectedAvatar === avatar.model
                                                ? 'border-blue-500 bg-blue-500/20'
                                                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        <img 
                                            src={avatar.preview} 
                                            alt={avatar.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="text-xs text-gray-300">{avatar.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                Next: Personality
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Personality */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-white mb-2 block">Your Personality</label>
                            <div className="space-y-2 mb-3">
                                {personalityTemplates.map((template) => (
                                    <button
                                        key={template.label}
                                        onClick={() => setPersonality(template.value)}
                                        className={`w-full text-left p-2 rounded border ${
                                            personality === template.value
                                                ? 'border-blue-500 bg-blue-500/20'
                                                : 'border-gray-600 bg-gray-700'
                                        }`}
                                    >
                                        <div className="text-white text-sm">{template.label}</div>
                                        {template.value && (
                                            <div className="text-xs text-gray-400">{template.value}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {personalityTemplates[5].value === personality && (
                                <Textarea
                                    placeholder="Describe your personality..."
                                    value={personality}
                                    onChange={(e) => setPersonality(e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white"
                                    rows={3}
                                />
                            )}
                        </div>

                        <div>
                            <label className="text-white mb-2 block">Interests (select up to 5)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {interestOptions.map((interest) => (
                                    <button
                                        key={interest}
                                        onClick={() => {
                                            if (interests.includes(interest)) {
                                                setInterests(interests.filter(i => i !== interest));
                                            } else if (interests.length < 5) {
                                                setInterests([...interests, interest]);
                                            }
                                        }}
                                        className={`p-2 text-xs rounded border ${
                                            interests.includes(interest)
                                                ? 'border-blue-500 bg-blue-500/20 text-white'
                                                : 'border-gray-600 bg-gray-700 text-gray-300'
                                        }`}
                                        disabled={!interests.includes(interest) && interests.length >= 5}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-white mb-2 block">Bio (optional)</label>
                            <Textarea
                                placeholder="Tell others about yourself... (feel free to copy and paste your resume)"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                                rows={6}
                                maxLength={100000}
                            />
                            <p className="text-xs text-gray-400 mt-1">{bio.length}/100000</p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => setStep(2)}
                                variant="outline"
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCreateProfile}
                                disabled={isCreating}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {isCreating ? 'Creating...' : 'Create Digital Twin'}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProfileCreator;