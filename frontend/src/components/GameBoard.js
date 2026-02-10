import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { RotateCcw, Trophy, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import UnoCard from "./UnoCard";
import ColorPicker from "./ColorPicker";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function GameBoard({ gameId, currentPlayerId, onReset }) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchGameState = async () => {
    try {
      const response = await axios.get(`${API}/game/${gameId}`);
      setGameState(response.data);
      setLoading(false);
      
      if (response.data.game_over && !showWinner) {
        setShowWinner(true);
      }
    } catch (error) {
      console.error("Error fetching game state:", error);
      toast.error("Failed to fetch game state");
    }
  };

  const playCard = async (card, chosenColor = null) => {
    try {
      const response = await axios.post(`${API}/game/${gameId}/play`, {
        player_id: currentPlayerId,
        card: card,
        chosen_color: chosenColor
      });
      
      const { action } = response.data;
      
      if (action === "skip") {
        toast.info("Player skipped!");
      } else if (action === "reverse") {
        toast.info("Direction reversed!");
      } else if (action === "draw2") {
        toast.warning("Next player draws 2 cards!");
      } else if (action === "wild4") {
        toast.warning("Next player draws 4 cards!");
      }
      
      await fetchGameState();
      setSelectedCard(null);
    } catch (error) {
      console.error("Error playing card:", error);
      toast.error(error.response?.data?.detail || "Cannot play this card");
    }
  };

  const handleCardClick = (card) => {
    if (gameState.game_over) return;
    
    const currentPlayer = gameState.players[gameState.current_player_index];
    if (currentPlayer.id !== currentPlayerId) {
      toast.error("Not your turn!");
      return;
    }

    // If it's a wild card, show color picker
    if (card.color === "wild") {
      setSelectedCard(card);
      setShowColorPicker(true);
    } else {
      playCard(card);
    }
  };

  const handleColorChoice = (color) => {
    setShowColorPicker(false);
    if (selectedCard) {
      playCard(selectedCard, color);
    }
  };

  const drawCard = async () => {
    try {
      const response = await axios.post(`${API}/game/${gameId}/draw`, {
        player_id: currentPlayerId
      });
      
      toast.success("Card drawn");
      await fetchGameState();
    } catch (error) {
      console.error("Error drawing card:", error);
      toast.error(error.response?.data?.detail || "Cannot draw card");
    }
  };

  const callUno = async () => {
    try {
      await axios.post(`${API}/game/${gameId}/uno`, {
        player_id: currentPlayerId
      });
      
      toast.success("UNO! 🎉", {
        style: {
          background: '#FF0055',
          color: 'white'
        }
      });
    } catch (error) {
      console.error("Error calling UNO:", error);
      toast.error(error.response?.data?.detail || "Cannot call UNO");
    }
  };

  if (loading || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-headings text-white">Loading game...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.current_player_index];
  const currentPlayerData = gameState.players.find(p => p.id === currentPlayerId);
  const isMyTurn = currentPlayer.id === currentPlayerId;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col" data-testid="game-board">
      {/* Winner Modal */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            data-testid="winner-modal"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-3xl p-12 text-center max-w-md"
            >
              <Trophy className="w-24 h-24 mx-auto mb-6 text-yellow-400" />
              <h2 className="font-headings text-4xl md:text-5xl font-black uppercase mb-4 text-white">
                {gameState.winner} Wins!
              </h2>
              <p className="text-zinc-300 text-lg mb-8">Congratulations on the victory!</p>
              <Button
                onClick={onReset}
                className="w-full h-14 bg-white text-black text-lg font-bold font-headings uppercase tracking-wider rounded-full hover:bg-zinc-200 hover:scale-105 transition-all"
                data-testid="new-game-button"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                New Game
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Picker Modal */}
      <AnimatePresence>
        {showColorPicker && (
          <ColorPicker
            onSelectColor={handleColorChoice}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="font-headings text-2xl md:text-3xl font-bold text-white" data-testid="game-title-board">
            NEON UNO
          </h2>
        </div>
        <Button
          onClick={onReset}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
          data-testid="reset-game-button"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>

      {/* Game Status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 mb-6"
        data-testid="game-status"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-zinc-400 text-sm mb-1">Current Turn</p>
            <p className="text-white font-bold text-lg flex items-center gap-2">
              {currentPlayer.name}
              {isMyTurn && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Your Turn</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-zinc-400 text-sm mb-1">Direction</p>
            <p className="text-white font-bold text-lg">
              {gameState.direction === 1 ? "Clockwise →" : "← Counter-clockwise"}
            </p>
          </div>
          <div>
            <p className="text-zinc-400 text-sm mb-1">Last Action</p>
            <p className="text-white font-bold text-sm md:text-base">{gameState.last_action}</p>
          </div>
        </div>
      </motion.div>

      {/* Players Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {gameState.players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`backdrop-blur-md bg-black/40 border rounded-xl p-3 transition-all ${
              player.id === currentPlayer.id
                ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-black shadow-[0_0_15px_white]'
                : 'border-white/10'
            }`}
            data-testid={`player-info-${index}`}
          >
            <p className="text-white font-bold text-sm mb-1 truncate">{player.name}</p>
            <p className="text-zinc-400 text-xs">
              {player.card_count} {player.card_count === 1 ? 'card' : 'cards'}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Center Play Area */}
      <div className="flex-1 flex items-center justify-center mb-6" data-testid="center-play-area">
        <div className="flex items-center gap-8 md:gap-12">
          {/* Draw Pile */}
          <motion.div
            whileHover={{ scale: isMyTurn ? 1.05 : 1 }}
            whileTap={{ scale: isMyTurn ? 0.95 : 1 }}
            onClick={isMyTurn && !gameState.game_over ? drawCard : undefined}
            className={`relative ${
              isMyTurn && !gameState.game_over ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
            data-testid="draw-pile"
          >
            <div className="w-32 h-48 md:w-40 md:h-60 rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black shadow-2xl flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-numbers font-bold text-white/20 mb-2">
                  {gameState.draw_pile_count}
                </div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Draw</div>
              </div>
            </div>
          </motion.div>

          {/* Arrow */}
          <ArrowRight className="w-8 h-8 text-white/20" />

          {/* Top Card */}
          <div data-testid="top-card">
            <UnoCard card={gameState.top_card} size="large" />
          </div>
        </div>
      </div>

      {/* Current Player Hand */}
      {currentPlayerData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6"
          data-testid={`player-hand-${currentPlayerId}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headings text-lg md:text-xl font-bold text-white">
              Your Hand ({currentPlayerData.card_count} cards)
            </h3>
            {currentPlayerData.card_count === 1 && (
              <Button
                onClick={callUno}
                className="animate-pulse bg-[#FF0055] text-white shadow-[0_0_30px_#FF0055] hover:bg-[#FF0055]/90 font-headings font-bold uppercase"
                data-testid="uno-button"
              >
                UNO!
              </Button>
            )}
          </div>
          
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 -ml-4 md:-ml-8">
            {currentPlayerData.hand.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -20, scale: 1.05 }}
                onClick={() => handleCardClick(card)}
                className="cursor-pointer flex-shrink-0 first:ml-4 md:first:ml-8"
                data-testid={`card-${card.color}-${card.value}`}
              >
                <UnoCard card={card} size="medium" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default GameBoard;
