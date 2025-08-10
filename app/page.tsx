"use client";

import { useEffect } from 'react';
import NPC from "./components/npc";
import LobbySelector from "./components/LobbySelector";
import { useLobbyStore } from "@/lib/lobbyStore";

export default function Home() {
  const { showLobbySelector, currentLobby, initializeUser } = useLobbyStore();

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  if (showLobbySelector) {
    return <LobbySelector />;
  }

  return (
    <div>
      <NPC currentLobby={currentLobby} />
    </div>
  );
}
