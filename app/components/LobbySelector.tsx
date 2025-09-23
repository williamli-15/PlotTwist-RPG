"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Lobby } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import LobbyCreator from './LobbyCreator';
import ProfileCreator from './ProfileCreator';

const LobbySelector = () => {
    // Custom scrollbar styles
    const scrollbarStyles = `
        .scrollbar-visible {
            overflow-y: scroll !important;
        }
        .scrollbar-visible::-webkit-scrollbar {
            width: 12px;
            background: #1F2937;
        }
        .scrollbar-visible::-webkit-scrollbar-track {
            background: #1F2937;
            border-radius: 6px;
            border: 1px solid #374151;
        }
        .scrollbar-visible::-webkit-scrollbar-thumb {
            background: #6B7280;
            border-radius: 6px;
            border: 1px solid #4B5563;
        }
        .scrollbar-visible::-webkit-scrollbar-thumb:hover {
            background: #9CA3AF;
        }
        .scrollbar-visible::-webkit-scrollbar-corner {
            background: #1F2937;
        }
    `;
    const {
        availableLobbies,
        profile,
        joinLobby,
        hideLobbySelection,
        loadCustomLobbies,
        loadMyCustomLobbies,
        joinCustomLobbyByCode,
        deleteCustomLobby
    } = useLobbyStore();

    const [showCreator, setShowCreator] = useState(false);
    const [editingLobby, setEditingLobby] = useState<Lobby | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'my-rooms'>('all');
    const [myRooms, setMyRooms] = useState<Lobby[]>([]);
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [lobbyOccupancy, setLobbyOccupancy] = useState<Map<string, {online: number, twins: number}>>(new Map());

    // Load lobbies on mount and tab change
    useEffect(() => {
        if (activeTab === 'all') {
            loadCustomLobbies();
        } else {
            loadMyRooms();
        }
    }, [loadCustomLobbies, activeTab]);

    // Update occupancy data when lobbies change
    useEffect(() => {
        const currentLobbies = getCurrentLobbies();
        if (currentLobbies.length > 0) {
            const lobbyIds = currentLobbies.map(lobby => lobby.lobbyId);
            fetchLobbyOccupancy(lobbyIds);

            // Set up periodic updates every 10 seconds
            const interval = setInterval(() => {
                fetchLobbyOccupancy(lobbyIds);
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [availableLobbies, myRooms, activeTab]);

    const loadMyRooms = async () => {
        const rooms = await loadMyCustomLobbies();
        setMyRooms(rooms);

        // Also add these rooms to availableLobbies so joinLobby can find them
        const currentLobbies = availableLobbies.filter(l => !rooms.some(r => r.lobbyId === l.lobbyId));
        const updatedLobbies = [...currentLobbies, ...rooms];
        // We need to manually update the store
        const { setCurrentLobby } = useLobbyStore.getState();
        useLobbyStore.setState({ availableLobbies: updatedLobbies });
    };

    // Fetch real-time lobby occupancy data
    const fetchLobbyOccupancy = async (lobbyIds: string[]) => {
        try {
            const { supabase } = await import('@/lib/supabase');

            const { data, error } = await supabase
                .from('avatar_states')
                .select('lobby_id, is_online')
                .in('lobby_id', lobbyIds);

            if (!error && data) {
                const occupancyMap = new Map<string, {online: number, twins: number}>();

                // Initialize all lobbies with 0 counts
                lobbyIds.forEach(id => {
                    occupancyMap.set(id, { online: 0, twins: 0 });
                });

                // Count online users and digital twins
                data.forEach(avatar => {
                    const current = occupancyMap.get(avatar.lobby_id) || { online: 0, twins: 0 };
                    if (avatar.is_online) {
                        current.online++;
                    } else {
                        current.twins++;
                    }
                    occupancyMap.set(avatar.lobby_id, current);
                });

                setLobbyOccupancy(occupancyMap);
            }
        } catch (error) {
            console.error('Error fetching lobby occupancy:', error);
        }
    };

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !showCreator) {
                hideLobbySelection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hideLobbySelection, showCreator]);

    // Search functionality
    const handleSearch = useCallback(async (query: string) => {
        setIsLoading(true);
        setHasMore(true);
        await loadCustomLobbies(query, 0, 20);
        setIsLoading(false);
    }, [loadCustomLobbies]);

    // Infinite scroll
    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);

        const currentCount = availableLobbies.length;
        await loadCustomLobbies(searchQuery, currentCount, 20);

        // If no new lobbies were loaded, we've reached the end
        if (availableLobbies.length === currentCount) {
            setHasMore(false);
        }

        setIsLoading(false);
    }, [isLoading, hasMore, availableLobbies.length, loadCustomLobbies, searchQuery]);

    // Join by code
    const handleJoinByCode = async () => {
        if (!joinCode.trim()) return;

        setIsLoading(true);
        const success = await joinCustomLobbyByCode(joinCode.toUpperCase());
        setIsLoading(false);

        if (success) {
            hideLobbySelection();
        } else {
            alert('Room not found. Please check the code and try again.');
        }
    };

    // Handle successful room creation/update
    const handleRoomCreated = (lobbyCode: string) => {
        setShowCreator(false);
        setEditingLobby(null);
        if (editingLobby) {
            alert('Room updated successfully!');
        } else {
            // Show the new room URL
            const url = `${window.location.origin}/${lobbyCode}`;
            alert(`Room created! Share this URL: ${url}`);
        }
        // Refresh lobbies to show changes
        if (activeTab === 'all') {
            loadCustomLobbies();
        } else {
            loadMyRooms();
        }
    };

    // Handle room editing
    const handleEditRoom = (lobby: Lobby) => {
        setEditingLobby(lobby);
        setShowCreator(true);
    };

    // Handle room deletion
    const handleDeleteRoom = async (lobbyCode: string, roomName: string) => {
        if (!confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone.`)) {
            return;
        }

        const success = await deleteCustomLobby(lobbyCode);
        if (success) {
            alert('Room deleted successfully!');
            loadMyRooms(); // Refresh my rooms
        } else {
            alert('Failed to delete room. Please try again.');
        }
    };

    // Get current lobby list based on active tab
    const getCurrentLobbies = () => {
        return activeTab === 'all' ? availableLobbies : myRooms;
    };

    // Safety check - should never happen but satisfies TypeScript
    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">No profile found. Redirecting...</div>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl max-w-5xl w-full h-[90vh] max-h-[90vh] overflow-hidden border border-gray-700 relative flex flex-col">
                    {/* Close button */}
                    <button
                        onClick={hideLobbySelection}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="p-8 flex-1 flex flex-col">
                        {/* Header with Profile Status */}
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-white mb-4">
                                🌐 YNGO - You Never Go Offline
                            </h1>

                            {/* Show logged in user - Now safe to access profile */}
                            <div className="bg-green-600/20 border border-green-600 rounded-lg p-3 max-w-md mx-auto mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-300">
                                            Playing as <span className="font-bold text-white">{profile.username}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Your digital twin is active • {profile.selected_avatar_model?.split('/').pop()?.replace('.vrm', '') || 'No avatar selected'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowProfileEditor(true)}
                                        className="text-green-300 hover:text-white transition-colors p-1"
                                        title="Edit Profile"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            {/* Search */}
                            <div className="flex-1">
                                <Input
                                    type="text"
                                    placeholder="Search rooms..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    className="bg-gray-800 border-gray-600 text-white"
                                />
                            </div>

                            {/* Join by Code */}
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Enter room code..."
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="bg-gray-800 border-gray-600 text-white w-32"
                                    maxLength={6}
                                />
                                <Button
                                    onClick={handleJoinByCode}
                                    disabled={isLoading || !joinCode.trim()}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Join
                                </Button>
                            </div>

                            {/* Create Room */}
                            <Button
                                onClick={() => {
                                    if (!profile) {
                                        alert('You need to complete your profile first before creating rooms!');
                                        return;
                                    }
                                    setShowCreator(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                ➕ Create Room
                            </Button>
                        </div>

                        {/* Tabs with Refresh Button */}
                        <div className="flex gap-1 mb-6 items-center">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    activeTab === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                🌍 All Rooms
                            </button>
                            <button
                                onClick={() => setActiveTab('my-rooms')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    activeTab === 'my-rooms'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                🏠 My Rooms
                            </button>

                            {/* Refresh Button */}
                            <button
                                onClick={async () => {
                                    setIsLoading(true);
                                    if (activeTab === 'all') {
                                        await loadCustomLobbies();
                                    } else {
                                        await loadMyRooms();
                                    }
                                    setIsLoading(false);
                                }}
                                disabled={isLoading}
                                className="ml-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white transition-colors"
                                title="Refresh rooms"
                            >
                                {isLoading ? '⏳' : '🔄'}
                            </button>
                        </div>

                        {/* Room List */}
                        <div
                            ref={scrollRef}
                            className="scrollbar-visible"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#6B7280 #1F2937',
                                overflowY: 'scroll',
                                height: '400px',
                                maxHeight: '400px'
                            }}
                            onScroll={(e) => {
                                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                                if (scrollHeight - scrollTop === clientHeight && hasMore && !isLoading) {
                                    loadMore();
                                }
                            }}
                        >
                            <div className="grid md:grid-cols-2 gap-6 pr-2">
                                {getCurrentLobbies().map((lobby) => (
                        <Card
                            key={lobby.lobbyId}
                            className={`bg-gray-800 transition-all ${
                                lobby.isPublic === false
                                    ? 'border-amber-600/50 hover:border-amber-500'
                                    : 'border-gray-700 hover:border-blue-500'
                            }`}
                        >
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className={`text-2xl ${
                                                lobby.lobbyId === 'hack-nation'
                                                    ? 'text-green-400'
                                                    : lobby.isPublic === false
                                                        ? 'text-amber-400'
                                                        : 'text-blue-400'
                                            }`}>
                                                {lobby.name}
                                            </CardTitle>
                                            {lobby.isPublic === false && (
                                                <Badge variant="outline" className="border-amber-600 text-amber-400">
                                                    🔒 Private
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="text-gray-300 mt-2">
                                            {lobby.description}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        {(() => {
                                            const occupancy = lobbyOccupancy.get(lobby.lobbyId);
                                            const online = occupancy?.online || 0;
                                            const twins = occupancy?.twins || 0;
                                            const total = online + twins;

                                            return (
                                                <div className="flex flex-col gap-1 items-end">
                                                    <Badge variant="secondary" className="text-xs">
                                                        👥 {total}/{lobby.maxPlayers}
                                                    </Badge>
                                                    {total > 0 && (
                                                        <div className="flex gap-1">
                                                            {online > 0 && (
                                                                <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                                                                    🟢 {online}
                                                                </Badge>
                                                            )}
                                                            {twins > 0 && (
                                                                <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                                                                    📖 {twins}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
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

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        {/* Enter Button */}
                                        <Button
                                            className={`flex-1 ${
                                                lobby.lobbyId === 'hack-nation'
                                                    ? 'bg-green-600 hover:bg-green-700'
                                                    : lobby.isPublic === false
                                                        ? 'bg-amber-600 hover:bg-amber-700'
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                            onClick={async () => await joinLobby(lobby.lobbyId)}
                                            disabled={
                                                lobby.currentPlayers.length >= lobby.maxPlayers ||
                                                (lobby.isPublic === false && activeTab !== 'my-rooms' && lobby.createdBy !== profile?.id)
                                            }
                                        >
                                            {lobby.currentPlayers.length >= lobby.maxPlayers
                                                ? 'Lobby Full'
                                                : lobby.isPublic === false && activeTab !== 'my-rooms' && lobby.createdBy !== profile?.id
                                                    ? '🔒 Private Room'
                                                    : lobby.isPublic === false
                                                        ? 'Enter Private Room →'
                                                        : 'Enter World →'}
                                        </Button>

                                        {/* Management Controls for My Rooms */}
                                        {activeTab === 'my-rooms' && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="px-3"
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/${lobby.lobbyId}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('Room URL copied to clipboard!');
                                                    }}
                                                    title="Copy room URL"
                                                >
                                                    📋
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="px-3 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                    onClick={() => handleEditRoom(lobby)}
                                                    title="Edit room"
                                                >
                                                    ✏️
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="px-3 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                    onClick={() => handleDeleteRoom(lobby.lobbyId, lobby.name)}
                                                    title="Delete room"
                                                >
                                                    🗑️
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Loading indicator */}
                                {isLoading && (
                                    <div className="text-center py-4">
                                        <div className="text-gray-400">Loading rooms...</div>
                                    </div>
                                )}

                                {/* No more rooms indicator */}
                                {!hasMore && !isLoading && availableLobbies.length > 0 && (
                                    <div className="text-center py-4">
                                        <div className="text-gray-500 text-sm">No more rooms to load</div>
                                    </div>
                                )}

                                {/* Empty state */}
                                {getCurrentLobbies().length === 0 && !isLoading && (
                                    <div className="text-center py-12 col-span-2">
                                        <div className="text-gray-400">
                                            {activeTab === 'my-rooms'
                                                ? 'You haven\'t created any rooms yet'
                                                : searchQuery
                                                    ? 'No rooms found matching your search'
                                                    : 'No rooms available'
                                            }
                                        </div>
                                        <Button
                                            onClick={() => setShowCreator(true)}
                                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                                        >
                                            {activeTab === 'my-rooms' ? 'Create your first room' : 'Create the first room'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lobby Creator Modal */}
                {showCreator && (
                    <LobbyCreator
                        onClose={() => {
                            setShowCreator(false);
                            setEditingLobby(null);
                        }}
                        onSuccess={handleRoomCreated}
                        editingLobby={editingLobby}
                    />
                )}

                {/* Profile Editor Modal */}
                {showProfileEditor && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
                        <div className="max-w-2xl w-full relative">
                            {/* Close button */}
                            <button
                                onClick={() => setShowProfileEditor(false)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-white z-10 bg-gray-800/80 rounded-full p-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <ProfileCreator
                                onComplete={() => {
                                    setShowProfileEditor(false);
                                    // Optionally refresh to show updated profile
                                    window.location.reload();
                                }}
                                editingProfile={profile}
                                isEditing={true}
                            />
                        </div>
                    </div>
                )}
            </>
        );
};

export default LobbySelector;