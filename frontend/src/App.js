import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameSetup from "./components/GameSetup";
import GameBoard from "./components/GameBoard";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [gameId, setGameId] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              gameId ? (
                <GameBoard
                  gameId={gameId}
                  currentPlayerId={currentPlayerId}
                  onReset={() => {
                    setGameId(null);
                    setCurrentPlayerId(null);
                  }}
                />
              ) : (
                <GameSetup
                  onGameStart={(id, playerId) => {
                    setGameId(id);
                    setCurrentPlayerId(playerId);
                  }}
                />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}

export default App;
