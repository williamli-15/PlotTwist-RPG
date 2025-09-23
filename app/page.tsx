"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LobbySelector from "./components/LobbySelector";
import ProfileCreator from "./components/ProfileCreator";
import RoomChat from "./components/RoomChat";
import { useLobbyStore } from "@/lib/lobbyStore";

// Dynamically import NPC component with no SSR to avoid "window is not defined" errors
const NPC = dynamic(() => import("./components/npc"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading 3D environment...</div>
    </div>
  )
});

// Import PeerJS voice chat
const PeerJSVoiceChat = dynamic(() => import("./components/PeerJSVoiceChat"), {
  ssr: false
});

export default function Home() {
  const { 
    showLobbySelector, 
    currentLobby, 
    initializeUser, 
    profile
  } = useLobbyStore();
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeUser();
      setIsLoading(false);
    };
    init();
  }, [initializeUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading YNGO...</div>
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

  // In-game view with optional lobby selector overlay
  return (
    <>
      <NPC currentLobby={currentLobby} />
      {currentLobby && <RoomChat lobbyId={currentLobby.lobbyId} />}
      {showLobbySelector && <LobbySelector />}
      <PeerJSVoiceChat />
    </>
  );
}