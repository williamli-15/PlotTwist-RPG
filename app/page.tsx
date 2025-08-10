"use client";

import { useEffect, useState } from 'react';
import NPC from "./components/npc";
import LobbyModal from "./components/LobbyModal";
import { useLobbyStore } from "@/lib/lobbyStore";

export default function Home() {
  const { currentLobby, initializeUser } = useLobbyStore();
  const [showLobbyModal, setShowLobbyModal] = useState(true); // Show modal initially

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Close modal automatically when a lobby is joined
  useEffect(() => {
    if (currentLobby) {
      setShowLobbyModal(false);
    }
  }, [currentLobby]);

  return (
    <div>
      {/* Always render the 3D world */}
      <NPC 
        currentLobby={currentLobby} 
        onShowLobbyModal={() => setShowLobbyModal(true)}
      />
      
      {/* Lobby modal overlay */}
      <LobbyModal 
        isOpen={showLobbyModal}
        onClose={() => setShowLobbyModal(false)}
      />
    </div>
  );
}
