import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Play } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function GameSetup({ onGameStart }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  const updatePlayerCount = (count) => {
    setPlayerCount(count);
    const newNames = Array(count).fill("").map((_, i) => 
      playerNames[i] || `Player ${i + 1}`
    );
    setPlayerNames(newNames);
  };

  const updatePlayerName = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const startGame = async () => {
    const finalNames = playerNames.map((name, i) => 
      name.trim() || `Player ${i + 1}`
    );

    setLoading(true);
    try {
      const response = await axios.post(`${API}/game/new`, {
        player_names: finalNames
      });
      
      const gameState = response.data;
      toast.success("Game started!");
      
      // Set the first player as the current player
      onGameStart(gameState.game_id, gameState.players[0].id);
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="font-headings text-5xl md:text-7xl font-black tracking-tighter uppercase mb-4"
            style={{
              background: 'linear-gradient(135deg, #FF0055 0%, #00FFFF 50%, #CCFF00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            data-testid="game-title"
          >
            NEON UNO
          </h1>
          <p className="text-zinc-400 text-lg font-body">Cyber-Casino Card Game</p>
        </motion.div>

        {/* Setup Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl"
          data-testid="setup-card"
        >
          {/* Player Count Selection */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-white font-headings text-xl mb-4">
              <Users className="w-5 h-5" />
              Number of Players
            </label>
            <div className="flex gap-3">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => updatePlayerCount(count)}
                  className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                    playerCount === count
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                  data-testid={`player-count-${count}`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Player Names */}
          <div className="space-y-4 mb-8">
            {playerNames.map((name, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Input
                  type="text"
                  placeholder={`Player ${index + 1} name`}
                  value={name}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-14 text-lg rounded-xl focus:border-white/30 focus:ring-2 focus:ring-white/20"
                  data-testid={`player-name-input-${index}`}
                />
              </motion.div>
            ))}
          </div>

          {/* Start Button */}
          <Button
            onClick={startGame}
            disabled={loading}
            className="w-full h-16 bg-white text-black text-lg font-bold font-headings uppercase tracking-wider rounded-full hover:bg-zinc-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50"
            data-testid="start-game-button"
          >
            {loading ? (
              "Starting..."
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default GameSetup;
