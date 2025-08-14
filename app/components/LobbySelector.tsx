"use client";

import { useState } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LobbySelector = () => {
    const { 
        availableLobbies, 
        profile,
        joinLobby 
    } = useLobbyStore();

    // Safety check - should never happen but satisfies TypeScript
    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">No profile found. Redirecting...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header with Profile Status */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        🌐 YNGO - You Never Go Offline
                    </h1>
                    
                    {/* Show logged in user - Now safe to access profile */}
                    <div className="bg-green-600/20 border border-green-600 rounded-lg p-4 max-w-md mx-auto mb-8">
                        <p className="text-green-300">
                            Playing as <span className="font-bold text-white">{profile.username}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Your digital twin is active • {profile.selected_avatar_model?.split('/').pop() || 'No avatar selected'}
                        </p>
                    </div>

                    <p className="text-xl text-gray-300">
                        Choose your world to explore
                    </p>
                </div>

                {/* World Selection Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                    {availableLobbies.map((lobby) => (
                        <Card 
                            key={lobby.lobbyId} 
                            className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-all"
                        >
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className={`text-2xl ${
                                            lobby.lobbyId === 'hack-nation' 
                                                ? 'text-green-400' 
                                                : 'text-blue-400'
                                        }`}>
                                            {lobby.name}
                                        </CardTitle>
                                        <CardDescription className="text-gray-300 mt-2">
                                            {lobby.description}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary">
                                        {lobby.currentPlayers.length}/{lobby.maxPlayers}
                                    </Badge>
                                </div>
                            </CardHeader>
                            
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Host Info */}
                                    <div className="text-sm text-gray-400">
                                        <span className="text-white">Host:</span> {lobby.hostAvatar.name}
                                    </div>

                                    {/* Current Players */}
                                    {lobby.currentPlayers.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">
                                                Active Players:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {lobby.currentPlayers.slice(0, 5).map((player) => (
                                                    <Badge 
                                                        key={player.userId} 
                                                        variant="outline" 
                                                        className="text-xs"
                                                    >
                                                        {player.username}
                                                    </Badge>
                                                ))}
                                                {lobby.currentPlayers.length > 5 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{lobby.currentPlayers.length - 5} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Enter Button */}
                                    <Button 
                                        className={`w-full ${
                                            lobby.lobbyId === 'hack-nation' 
                                                ? 'bg-green-600 hover:bg-green-700' 
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                        onClick={() => joinLobby(lobby.lobbyId)}
                                        disabled={lobby.currentPlayers.length >= lobby.maxPlayers}
                                    >
                                        {lobby.currentPlayers.length >= lobby.maxPlayers 
                                            ? 'Lobby Full' 
                                            : 'Enter World →'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Profile Management */}
                {/* <div className="text-center mt-12">
                    <button 
                        className="text-gray-400 hover:text-white text-sm"
                        onClick={() => {
                            // Could add profile editing here later
                            console.log('Profile management - TODO');
                        }}
                    >
                        Edit Profile Settings
                    </button>
                </div> */}
            </div>
        </div>
    );
};

export default LobbySelector;