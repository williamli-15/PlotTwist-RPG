"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NPC from "../components/npc";
import ProfileCreator from "../components/ProfileCreator";
import { useLobbyStore } from "@/lib/lobbyStore";

export default function RoomPage() {
  const { roomCode } = useParams();
  const router = useRouter();
  const {
    currentLobby,
    initializeUser,
    profile,
    joinCustomLobbyByCode
  } = useLobbyStore();

  const [isLoading, setIsLoading] = useState(true);
  const [roomNotFound, setRoomNotFound] = useState(false);

  useEffect(() => {
    const init = async () => {
      console.log('Dynamic route initializing with roomCode:', roomCode);
      await initializeUser();

      if (profile && roomCode && typeof roomCode === 'string') {
        console.log('Attempting to join room:', roomCode.toUpperCase());
        const success = await joinCustomLobbyByCode(roomCode.toUpperCase());
        console.log('Join result:', success);
        if (!success) {
          console.log('Room not found, showing error page');
          setRoomNotFound(true);
        }
      } else {
        console.log('Missing requirements:', { profile: !!profile, roomCode, type: typeof roomCode });
      }

      setIsLoading(false);
    };
    init();
  }, [initializeUser, profile, roomCode, joinCustomLobbyByCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading room {roomCode}...</div>
      </div>
    );
  }

  // FORCE PROFILE CREATION - No guest mode
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <ProfileCreator onComplete={() => {}} />
      </div>
    );
  }

  // Room not found
  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Room Not Found</h1>
          <p className="text-gray-300 mb-6">
            Room "{roomCode}" doesn't exist or is no longer available.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Browse Available Rooms
          </button>
        </div>
      </div>
    );
  }

  // Room view with custom back navigation
  return (
    <div>
      <NPC currentLobby={currentLobby} />
      {/* Custom back button overlay */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-50 bg-gray-800/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-gray-700/80 transition-colors"
      >
        ← Back to Lobby
      </button>
    </div>
  );
}