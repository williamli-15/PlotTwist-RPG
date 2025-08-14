"use client";

import { useEffect, useState } from 'react';
import NPC from "./components/npc";
import LobbySelector from "./components/LobbySelector";
import ProfileCreator from "./components/ProfileCreator";
import { useLobbyStore } from "@/lib/lobbyStore";

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
      {showLobbySelector && <LobbySelector />}
    </>
  );
}