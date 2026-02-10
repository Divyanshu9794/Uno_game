import requests
import sys
import json
from datetime import datetime

class UnoGameTester:
    def __init__(self, base_url="https://uno-challenge-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.game_id = None
        self.players = []

    def run_test(self, name, method, endpoint, expected_status, data=None, expected_keys=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            
            print(f"Response Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Parse response and check expected keys
                try:
                    response_json = response.json()
                    if expected_keys:
                        for key in expected_keys:
                            if key not in response_json:
                                print(f"⚠️ Warning: Expected key '{key}' not found in response")
                    return True, response_json
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"Error details: {error_detail}")
                except:
                    print(f"Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_create_new_game(self, player_names):
        """Test creating a new game with specified players"""
        success, response = self.run_test(
            "Create New Game",
            "POST",
            "game/new",
            200,
            data={"player_names": player_names},
            expected_keys=["game_id", "players", "current_player_index", "top_card", "draw_pile_count"]
        )
        
        if success and response:
            self.game_id = response.get('game_id')
            self.players = response.get('players', [])
            print(f"Game created successfully! Game ID: {self.game_id}")
            print(f"Players: {[p['name'] for p in self.players]}")
            print(f"Top card: {response.get('top_card')}")
        
        return success

    def test_get_game_state(self):
        """Test getting current game state"""
        if not self.game_id:
            print("❌ No game ID available for testing")
            return False
        
        success, response = self.run_test(
            "Get Game State",
            "GET",
            f"game/{self.game_id}",
            200,
            expected_keys=["game_id", "players", "current_player_index", "top_card"]
        )
        
        if success and response:
            print(f"Current turn: {response.get('players', [{}])[response.get('current_player_index', 0)].get('name', 'Unknown')}")
            print(f"Direction: {'Clockwise' if response.get('direction') == 1 else 'Counter-clockwise'}")
        
        return success

    def test_invalid_game_id(self):
        """Test accessing non-existent game"""
        success, response = self.run_test(
            "Invalid Game ID",
            "GET",
            "game/invalid-game-id-12345",
            404
        )
        return success

    def test_play_card(self):
        """Test playing a card"""
        if not self.game_id or not self.players:
            print("❌ No game or players available for testing")
            return False
        
        # Get current game state first
        game_response = requests.get(f"{self.api_url}/game/{self.game_id}")
        if game_response.status_code != 200:
            print("❌ Cannot get game state for card play test")
            return False
        
        game_data = game_response.json()
        current_player = game_data['players'][game_data['current_player_index']]
        
        if not current_player.get('hand'):
            print("❌ Current player has no cards in hand")
            return False
        
        # Try to play the first card that can be played
        top_card = game_data['top_card']
        playable_card = None
        
        for card in current_player['hand']:
            # Check if card can be played (same color, value, or wild)
            if (card['color'] == 'wild' or 
                card['color'] == top_card['color'] or 
                card['value'] == top_card['value']):
                playable_card = card
                break
        
        if not playable_card:
            print("❌ No playable cards found in current player's hand")
            return False
        
        # Prepare play card request
        play_data = {
            "player_id": current_player['id'],
            "card": playable_card
        }
        
        # If it's a wild card, add a color choice
        if playable_card['color'] == 'wild':
            play_data['chosen_color'] = 'red'
        
        success, response = self.run_test(
            f"Play Card ({playable_card['color']} {playable_card['value']})",
            "POST",
            f"game/{self.game_id}/play",
            200,
            data=play_data,
            expected_keys=["status", "game_state"]
        )
        
        return success

    def test_draw_card(self):
        """Test drawing a card"""
        if not self.game_id or not self.players:
            print("❌ No game or players available for testing")
            return False
        
        # Get current player
        game_response = requests.get(f"{self.api_url}/game/{self.game_id}")
        if game_response.status_code != 200:
            return False
        
        game_data = game_response.json()
        current_player = game_data['players'][game_data['current_player_index']]
        
        success, response = self.run_test(
            "Draw Card",
            "POST",
            f"game/{self.game_id}/draw",
            200,
            data={"player_id": current_player['id']},
            expected_keys=["status", "game_state", "drawn_card"]
        )
        
        return success

    def test_call_uno_invalid(self):
        """Test calling UNO when player doesn't have exactly one card"""
        if not self.game_id or not self.players:
            print("❌ No game or players available for testing")
            return False
        
        # Test with first player (should have more than 1 card)
        success, response = self.run_test(
            "Call UNO (Invalid - multiple cards)",
            "POST",
            f"game/{self.game_id}/uno",
            400,
            data={"player_id": self.players[0]['id']}
        )
        
        return success

    def test_invalid_player_turn(self):
        """Test playing card when it's not player's turn"""
        if not self.game_id or len(self.players) < 2:
            print("❌ No game or insufficient players for testing")
            return False
        
        # Get current game state
        game_response = requests.get(f"{self.api_url}/game/{self.game_id}")
        if game_response.status_code != 200:
            return False
        
        game_data = game_response.json()
        current_player_index = game_data['current_player_index']
        
        # Get a different player (not current turn)
        other_player = None
        for i, player in enumerate(self.players):
            if i != current_player_index:
                other_player = player
                break
        
        if not other_player or not other_player.get('hand'):
            print("❌ Cannot find other player for invalid turn test")
            return False
        
        # Try to play with wrong player
        card = other_player['hand'][0] if other_player['hand'] else {"color": "red", "value": "1"}
        
        success, response = self.run_test(
            "Play Card (Wrong Turn)",
            "POST",
            f"game/{self.game_id}/play",
            400,
            data={
                "player_id": other_player['id'],
                "card": card
            }
        )
        
        return success

    def test_create_game_invalid_players(self):
        """Test creating game with invalid number of players"""
        # Test with 1 player (too few)
        success1, _ = self.run_test(
            "Create Game (Too Few Players)",
            "POST",
            "game/new",
            400,
            data={"player_names": ["Player1"]}
        )
        
        # Test with 5 players (too many)
        success2, _ = self.run_test(
            "Create Game (Too Many Players)",
            "POST",
            "game/new",
            400,
            data={"player_names": ["Player1", "Player2", "Player3", "Player4", "Player5"]}
        )
        
        return success1 and success2

def main():
    print("🎮 Starting UNO Game API Tests")
    print("=" * 50)
    
    # Initialize tester
    tester = UnoGameTester()
    
    # Test game creation with invalid players first
    print("\n📋 Testing Game Creation Validation...")
    tester.test_create_game_invalid_players()
    
    # Create a valid game
    print("\n📋 Testing Valid Game Creation...")
    if not tester.test_create_new_game(["Alice", "Bob", "Charlie"]):
        print("❌ Cannot continue tests without a valid game")
        return 1
    
    # Test game state retrieval
    print("\n📋 Testing Game State Retrieval...")
    tester.test_get_game_state()
    
    # Test invalid game ID
    print("\n📋 Testing Invalid Game Access...")
    tester.test_invalid_game_id()
    
    # Test card playing
    print("\n📋 Testing Card Playing...")
    tester.test_play_card()
    
    # Test card drawing
    print("\n📋 Testing Card Drawing...")
    tester.test_draw_card()
    
    # Test invalid UNO call
    print("\n📋 Testing UNO Call Validation...")
    tester.test_call_uno_invalid()
    
    # Test invalid player turn
    print("\n📋 Testing Turn Validation...")
    tester.test_invalid_player_turn()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend API tests passed!")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())