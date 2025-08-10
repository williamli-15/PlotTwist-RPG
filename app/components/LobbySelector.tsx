"use client";

import { useState } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { hackNationSpeakers, hackNationTracks, previousWinners } from '@/lib/lobbyConfig';

const LobbySelector = () => {
    const { 
        availableLobbies, 
        currentUser, 
        joinLobby, 
        updateUsername 
    } = useLobbyStore();
    
    const [username, setUsername] = useState(currentUser?.username || '');
    const [directLobbyId, setDirectLobbyId] = useState('');
    const [showDirectJoin, setShowDirectJoin] = useState(false);

    const handleUsernameUpdate = () => {
        if (username.trim()) {
            updateUsername(username.trim());
        }
    };

    const handleJoinLobby = (lobbyId: string) => {
        const success = joinLobby(lobbyId);
        if (!success) {
            alert('Unable to join lobby. It may be full or unavailable.');
        }
    };

    const handleDirectJoin = () => {
        if (directLobbyId.trim()) {
            const success = joinLobby(directLobbyId.trim());
            if (!success) {
                alert('Lobby not found or unable to join.');
            }
        }
    };

    const renderHackNationDetails = () => (
        <div className="mt-4 space-y-4">
            <div>
                <h4 className="font-semibold text-green-400 mb-2">🎯 Competition Tracks</h4>
                <div className="space-y-2">
                    {hackNationTracks.map((track, index) => (
                        <div key={index} className="text-sm">
                            <span className="font-medium text-blue-300">{track.name}:</span>
                            <span className="text-gray-300 ml-1">{track.description}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div>
                <h4 className="font-semibold text-purple-400 mb-2">🎤 Featured Speakers</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {hackNationSpeakers.map((speaker, index) => (
                        <div key={index} className="bg-gray-800 rounded p-2">
                            <div className="font-medium text-yellow-300">{speaker.name}</div>
                            <div className="text-gray-400">{speaker.title}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-orange-400 mb-2">🏆 Previous Winners</h4>
                <div className="space-y-1 text-xs">
                    {previousWinners.map((winner, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <span>{winner.place}</span>
                            <div>
                                <span className="font-medium text-cyan-300">{winner.name}:</span>
                                <span className="text-gray-300 ml-1">{winner.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const { currentLobby, isInLobby } = useLobbyStore();

    // Use transparent background if in a lobby, otherwise use gradient
    const backgroundStyle = isInLobby && currentLobby
        ? "min-h-screen bg-black/60 backdrop-blur-sm p-8"
        : "min-h-screen bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-8";

    return (
        <div className={backgroundStyle}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className={`text-4xl font-bold mb-2 ${
                        isInLobby && currentLobby ? 'text-white' : 'text-gray-900'
                    }`}>
                        🌐 YNGO - You Never Go Offline
                    </h1>
                    <p className={`mb-4 ${
                        isInLobby && currentLobby ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                        Choose your virtual world adventure
                    </p>
                    
                    {/* Username Input */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-64 bg-gray-800 border-gray-600 text-white"
                        />
                        <Button 
                            onClick={handleUsernameUpdate}
                            variant="outline"
                            className="bg-blue-600 hover:bg-blue-700 border-blue-500"
                        >
                            Save
                        </Button>
                    </div>
                    
                    {currentUser?.username && (
                        <p className={`${
                            isInLobby && currentLobby ? 'text-green-300' : 'text-green-600'
                        }`}>
                            Welcome, <span className="font-semibold">{currentUser.username}</span>! 
                            <span className={`text-xs ml-2 ${
                                isInLobby && currentLobby ? 'text-gray-300' : 'text-gray-500'
                            }`}>ID: {currentUser.userId}</span>
                        </p>
                    )}
                </div>

                {/* Lobby Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {availableLobbies.map((lobby) => (
                        <Card key={lobby.lobbyId} className="bg-gray-800 border-gray-600 hover:border-blue-500 transition-all duration-300">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className={`text-2xl ${lobby.lobbyId === 'hack-nation' ? 'text-green-400' : 'text-blue-400'}`}>
                                            {lobby.name}
                                        </CardTitle>
                                        <CardDescription className="text-gray-300 mt-2">
                                            {lobby.description}
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="secondary" className="mb-2">
                                            {lobby.currentPlayers.length}/{lobby.maxPlayers}
                                        </Badge>
                                        <div className="text-xs text-gray-400">
                                            {lobby.theme}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-white mb-2">
                                            🎭 Host: {lobby.hostAvatar.personality.split(',')[0].replace('You are ', '')}
                                        </h4>
                                        <p className="text-sm text-gray-400">
                                            {lobby.hostAvatar.personality.split('.')[0]}
                                        </p>
                                    </div>

                                    {/* Hack-Nation specific details */}
                                    {lobby.lobbyId === 'hack-nation' && renderHackNationDetails()}

                                    {/* English Professor details */}
                                    {lobby.lobbyId === 'english-professor' && (
                                        <div className="mt-4">
                                            <div className="text-sm text-gray-300">
                                                <p className="mb-2">📚 Explore legendary weapons from classic literature</p>
                                                <p className="mb-2">🖋️ Discover rare manuscripts and writing instruments</p>
                                                <p>🎓 Weekly literature circles and poetry workshops</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Players */}
                                    {lobby.currentPlayers.length > 0 && (
                                        <div>
                                            <h5 className="text-sm font-medium text-gray-400 mb-1">Current Players:</h5>
                                            <div className="flex flex-wrap gap-1">
                                                {lobby.currentPlayers.map((player) => (
                                                    <Badge key={player.userId} variant="outline" className="text-xs">
                                                        {player.username || player.userId.substring(0, 8)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Button 
                                        className={`w-full ${
                                            lobby.lobbyId === 'hack-nation' 
                                                ? 'bg-green-600 hover:bg-green-700' 
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                        onClick={() => handleJoinLobby(lobby.lobbyId)}
                                        disabled={lobby.currentPlayers.length >= lobby.maxPlayers}
                                    >
                                        {lobby.currentPlayers.length >= lobby.maxPlayers ? 'Lobby Full' : 'Enter World'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Direct Join Section */}
                <div className="text-center">
                    <Button 
                        variant="ghost" 
                        onClick={() => setShowDirectJoin(!showDirectJoin)}
                        className="text-gray-400 hover:text-white mb-4"
                    >
                        {showDirectJoin ? '🔼 Hide' : '🔽 Join with Lobby ID'}
                    </Button>
                    
                    {showDirectJoin && (
                        <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                            <p className="text-gray-300 mb-2 text-sm">
                                Have a specific lobby ID? Enter it here:
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="lobby-id"
                                    value={directLobbyId}
                                    onChange={(e) => setDirectLobbyId(e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                                <Button 
                                    onClick={handleDirectJoin}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    Join
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LobbySelector;