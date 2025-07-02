from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import mediapipe as mp
from backend.gesture_utils import detect_mouth_open, detect_head_direction, detect_eyebrow_raise, detect_blink
from backend.game_logic import get_level, generate_obstacles, check_collision, update_high_scores, get_high_scores

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Face Gesture Game Backend is running!"}

@app.get("/tutorial")
def tutorial():
    return {
        "controls": [
            {"gesture": "Head Left/Right", "action": "Move left/right"},
            {"gesture": "Mouth Open", "action": "Jump over lasers"},
            {"gesture": "Eyebrow Raise", "action": "Freeze to avoid cameras"},
            {"gesture": "Blink", "action": "Use gadget (EMP)"}
        ],
        "tips": [
            "Each level has unique obstacles.",
            "React quickly to avoid detection!",
            "Use gadgets wisely, they have cooldowns."
        ]
    }

@app.get("/level/{level_num}")
def get_level_data(level_num: int):
    level = get_level(level_num)
    obstacles = generate_obstacles(level)
    return {"level": level, "obstacles": obstacles}

@app.post("/progress/")
def update_progress(data: dict):
    # data: {"level": int, "score": int, "name": str}
    scores = update_high_scores(data.get("score", 0), data.get("name", "Player"))
    return {"highscores": scores}

@app.get("/highscores")
def highscores():
    return {"highscores": get_high_scores()}

@app.post("/detect-gesture/")
async def detect_gesture(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if results.multi_face_landmarks is not None:
            landmarks = results.multi_face_landmarks[0].landmark
            gestures = {
                "mouth_open": detect_mouth_open(landmarks),
                "eyebrow_raise": detect_eyebrow_raise(landmarks),
                "blink": detect_blink(landmarks),
                "head_direction": detect_head_direction(landmarks)
            }
            return JSONResponse({"gestures": gestures})
        else:
            return JSONResponse({"gestures": {}})
