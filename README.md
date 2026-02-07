# Jungle Adventure Runner

A first-person endless runner game set in a vibrant jungle! Move through a lush, sunlit forest, dodging boulders and logs, and collecting magical jungle berries that slow you down for 5 seconds. Control your character by moving your head left/right/up/down (translation, not rotation) in front of your webcam—no keyboard needed!

## Features
- Bright, continuous jungle environment with a blue sky, grassy ground, and dirt path
- Obstacles: Mossy boulders and fallen logs (with leafy accents)
- Powerups: Collect magical berries to temporarily slow down the runner
- Head movement controls: Move your head left/right/up/down (while facing the camera) to steer the player
- Responsive UI and smooth performance

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yuvidewan/game2.git
cd game2
```

### 2. Set up the Python environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start the backend server
```bash
cd backend/
uvicorn main:app --reload
```
### 4. Start the frontend server
```bash
cd frontend/
python -m http.server 8080
```

### 5. Start the frontend
Open `localhost:8080` in your browser.

## Project Structure
- `backend/` - FastAPI backend for gesture processing and game logic
- `frontend/` - HTML/JS frontend for the game (3D, animated, realistic)
- `requirements.txt` - Python dependencies

## License
YUVI & ADITYA

## How to Play
1. Start the backend server (see setup).
2. Open the frontend in your browser.
3. Allow webcam access when prompted.
4. Move your head left/right/up/down to dodge obstacles and collect berries!

Enjoy your jungle adventure!