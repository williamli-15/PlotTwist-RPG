// app/page.tsx - Enhanced with profile detection

"use client";

import { useEffect, useState } from 'react';
import NPC from "./components/npc";
import LobbySelector from "./components/LobbySelector";
import ProfileCreator from "./components/ProfileCreator";
import { useLobbyStore } from "@/lib/lobbyStore";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { 
    showLobbySelector, 
    currentLobby, 
    initializeUser, 
    profile
  } = useLobbyStore();
  
  const [showProfileCreator, setShowProfileCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeUser();
      setIsLoading(false);
    };
    init();
  }, []);

  // Show loading while checking for existing profile
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading YNGO...</div>
      </div>
    );
  }

  // Profile creator screen
  if (showProfileCreator) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <ProfileCreator onComplete={() => setShowProfileCreator(false)} />
      </div>
    );
  }

  // Lobby selector with profile status
  if (showLobbySelector) {
    return (
      <div className="relative">
        <LobbySelector />
        
        {/* Profile Status Badge */}
        <div className="fixed top-4 left-4 z-50">
          {profile ? (
            <div className="bg-green-600 text-white px-4 py-2 rounded-lg">
              <div className="text-sm opacity-75">Digital Twin Active</div>
              <div className="font-bold">{profile.username}</div>
            </div>
          ) : (
            <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg">
              <div className="text-sm">Playing as Guest</div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => setShowProfileCreator(true)}
              >
                Create Profile
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // In-game view
  return (
    <div>
      <NPC currentLobby={currentLobby} />
      
      {/* In-game profile indicator */}
      {!profile && (
        <div className="fixed top-4 left-4 z-40">
          <Button
            onClick={() => setShowProfileCreator(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Save Your Avatar (Create Profile)
          </Button>
        </div>
      )}
    </div>
  );
}