# Face Heist: The Museum Escape

Welcome to **Face Heist: The Museum Escape**! This is a next-generation, highly interactive, and realistic browser game where you control a 3D character escaping a high-security museum using only your face gestures, detected via your webcam.

## Game Concept

You are a master thief escaping a high-security museum at night. Dodge laser grids, security cameras, guards, and trapdoors using your head movements, facial expressions, and blinks. Each level is a new room with unique challenges, realistic visuals, and immersive sound.

## Features
- **Real-time face gesture detection** (head movement, mouth open, eyebrow raise, blink)
- **3D animated character and obstacles** for a human-like, cinematic experience
- **Level-based gameplay** with unique rooms and increasing difficulty
- **Sound effects and music** for immersion
- **FastAPI backend** for gesture processing, level logic, and high scores
- **Tutorial overlay and control list**

## Controls
| Gesture           | Action                        |
|-------------------|-------------------------------|
| Head Left/Right   | Move left/right               |
| Mouth Open        | Jump over lasers              |
| Eyebrow Raise     | Freeze to avoid cameras       |
| Blink             | Use EMP gadget (disable guard)|

## How to Play
1. Start the backend server (see below).
2. Open the frontend in your browser.
3. Allow webcam access when prompted.
4. Read the tutorial overlay for controls and tips.
5. Use your face to escape the museum!

## Setup Instructions

### 1. Clone the repository
```bash
git clone <repo-url>
cd cursor_game
```

### 2. Set up the Python environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start the backend server
```bash
uvicorn backend.main:app --reload
```

### 4. Start the frontend
Open `frontend/index.html` in your browser.

## Project Structure
- `backend/` - FastAPI backend for gesture processing and game logic
- `frontend/` - HTML/JS frontend for the game (3D, animated, realistic)
- `requirements.txt` - Python dependencies

## License
MIT 