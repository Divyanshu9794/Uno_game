from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Game Models
class Card(BaseModel):
    color: Literal["red", "blue", "green", "yellow", "wild"]
    value: str  # "0"-"9", "skip", "reverse", "draw2", "wild", "wild4"

class Player(BaseModel):
    id: str
    name: str
    hand: List[Card]
    card_count: int

class GameState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    game_id: str
    players: List[Player]
    current_player_index: int
    direction: int  # 1 for clockwise, -1 for counter-clockwise
    discard_pile: List[Card]
    top_card: Card
    draw_pile_count: int
    winner: Optional[str] = None
    game_over: bool = False
    last_action: Optional[str] = None

class NewGameRequest(BaseModel):
    player_names: List[str]

class PlayCardRequest(BaseModel):
    player_id: str
    card: Card
    chosen_color: Optional[str] = None  # For wild cards

class DrawCardRequest(BaseModel):
    player_id: str

class UnoCallRequest(BaseModel):
    player_id: str

# Game Logic Functions
def create_deck() -> List[Card]:
    """Create a standard UNO deck"""
    deck = []
    colors = ["red", "blue", "green", "yellow"]
    
    # Number cards (0-9)
    for color in colors:
        deck.append(Card(color=color, value="0"))  # One 0 per color
        for num in range(1, 10):
            deck.append(Card(color=color, value=str(num)))
            deck.append(Card(color=color, value=str(num)))  # Two of each 1-9
    
    # Action cards (Skip, Reverse, Draw Two) - 2 of each per color
    for color in colors:
        for _ in range(2):
            deck.append(Card(color=color, value="skip"))
            deck.append(Card(color=color, value="reverse"))
            deck.append(Card(color=color, value="draw2"))
    
    # Wild cards - 4 of each
    for _ in range(4):
        deck.append(Card(color="wild", value="wild"))
        deck.append(Card(color="wild", value="wild4"))
    
    return deck

def can_play_card(card: Card, top_card: Card) -> bool:
    """Check if a card can be played on top of the current card"""
    if card.color == "wild":
        return True
    if card.color == top_card.color:
        return True
    if card.value == top_card.value:
        return True
    return False

@api_router.post("/game/new", response_model=GameState)
async def create_new_game(request: NewGameRequest):
    """Create a new UNO game"""
    if len(request.player_names) < 2 or len(request.player_names) > 4:
        raise HTTPException(status_code=400, detail="Game requires 2-4 players")
    
    # Create and shuffle deck
    deck = create_deck()
    random.shuffle(deck)
    
    # Deal cards to players (7 cards each)
    players = []
    for name in request.player_names:
        player_hand = [deck.pop() for _ in range(7)]
        players.append(Player(
            id=str(uuid.uuid4()),
            name=name,
            hand=player_hand,
            card_count=len(player_hand)
        ))
    
    # Set initial top card (not an action card)
    top_card = deck.pop()
    while top_card.value in ["wild", "wild4", "skip", "reverse", "draw2"]:
        deck.insert(0, top_card)
        random.shuffle(deck)
        top_card = deck.pop()
    
    game_id = str(uuid.uuid4())
    
    game_state = GameState(
        game_id=game_id,
        players=players,
        current_player_index=0,
        direction=1,
        discard_pile=[top_card],
        top_card=top_card,
        draw_pile_count=len(deck),
        last_action="Game started"
    )
    
    # Store in MongoDB
    game_dict = game_state.model_dump()
    await db.games.insert_one(game_dict)
    
    return game_state

@api_router.get("/game/{game_id}", response_model=GameState)
async def get_game_state(game_id: str):
    """Get current game state"""
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameState(**game)

@api_router.post("/game/{game_id}/play")
async def play_card(game_id: str, request: PlayCardRequest):
    """Play a card"""
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = GameState(**game)
    
    if game_state.game_over:
        raise HTTPException(status_code=400, detail="Game is over")
    
    # Find player
    current_player = game_state.players[game_state.current_player_index]
    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    # Check if card is in player's hand
    card_in_hand = None
    for idx, c in enumerate(current_player.hand):
        if c.color == request.card.color and c.value == request.card.value:
            card_in_hand = idx
            break
    
    if card_in_hand is None:
        raise HTTPException(status_code=400, detail="Card not in hand")
    
    # Check if card can be played
    if not can_play_card(request.card, game_state.top_card):
        raise HTTPException(status_code=400, detail="Invalid card play")
    
    # Remove card from player's hand
    played_card = current_player.hand.pop(card_in_hand)
    current_player.card_count = len(current_player.hand)
    
    # Handle wild card color change
    if played_card.color == "wild" and request.chosen_color:
        played_card = Card(color=request.chosen_color, value=played_card.value)
    
    # Add to discard pile
    game_state.discard_pile.append(played_card)
    game_state.top_card = played_card
    
    # Check win condition
    if len(current_player.hand) == 0:
        game_state.winner = current_player.name
        game_state.game_over = True
        game_state.last_action = f"{current_player.name} wins!"
        await db.games.replace_one({"game_id": game_id}, game_state.model_dump())
        return {"status": "success", "game_state": game_state, "action": "win"}
    
    # Handle action cards
    action = None
    next_player_change = 1
    
    if played_card.value == "skip":
        action = "skip"
        next_player_change = 2
        game_state.last_action = f"{current_player.name} played Skip"
    elif played_card.value == "reverse":
        action = "reverse"
        game_state.direction *= -1
        game_state.last_action = f"{current_player.name} reversed direction"
    elif played_card.value == "draw2":
        action = "draw2"
        # Next player draws 2 cards (we'll handle this in the response)
        game_state.last_action = f"{current_player.name} played Draw Two"
        next_player_change = 2  # Skip next player after they draw
    elif played_card.value == "wild4":
        action = "wild4"
        game_state.last_action = f"{current_player.name} played Wild Draw Four"
        next_player_change = 2  # Skip next player after they draw
    elif played_card.value == "wild":
        action = "wild"
        game_state.last_action = f"{current_player.name} played Wild"
    else:
        game_state.last_action = f"{current_player.name} played {played_card.color} {played_card.value}"
    
    # Move to next player
    game_state.current_player_index = (game_state.current_player_index + next_player_change * game_state.direction) % len(game_state.players)
    
    # Update database
    await db.games.replace_one({"game_id": game_id}, game_state.model_dump())
    
    return {"status": "success", "game_state": game_state, "action": action}

@api_router.post("/game/{game_id}/draw")
async def draw_card(game_id: str, request: DrawCardRequest):
    """Draw a card from the deck"""
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = GameState(**game)
    
    if game_state.game_over:
        raise HTTPException(status_code=400, detail="Game is over")
    
    # Find player
    current_player = game_state.players[game_state.current_player_index]
    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    # Generate a random card (simplified - in production you'd maintain the deck)
    colors = ["red", "blue", "green", "yellow"]
    values = [str(i) for i in range(10)] + ["skip", "reverse", "draw2"]
    
    if random.random() < 0.1:  # 10% chance for wild
        new_card = Card(color="wild", value="wild" if random.random() < 0.5 else "wild4")
    else:
        color = random.choice(colors)
        value = random.choice(values)
        new_card = Card(color=color, value=value)
    
    current_player.hand.append(new_card)
    current_player.card_count = len(current_player.hand)
    game_state.draw_pile_count = max(0, game_state.draw_pile_count - 1)
    game_state.last_action = f"{current_player.name} drew a card"
    
    # Check if the drawn card can be played
    can_play = can_play_card(new_card, game_state.top_card)
    
    # If can't play, move to next player
    if not can_play:
        game_state.current_player_index = (game_state.current_player_index + game_state.direction) % len(game_state.players)
    
    # Update database
    await db.games.replace_one({"game_id": game_id}, game_state.model_dump())
    
    return {"status": "success", "game_state": game_state, "drawn_card": new_card, "can_play": can_play}

@api_router.post("/game/{game_id}/uno")
async def call_uno(game_id: str, request: UnoCallRequest):
    """Call UNO when having one card left"""
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = GameState(**game)
    
    # Find player
    player = next((p for p in game_state.players if p.id == request.player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    if len(player.hand) == 1:
        game_state.last_action = f"{player.name} called UNO!"
        await db.games.replace_one({"game_id": game_id}, game_state.model_dump())
        return {"status": "success", "message": "UNO!"}
    else:
        raise HTTPException(status_code=400, detail="You don't have exactly one card")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()