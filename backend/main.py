from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import mediapipe as mp
from gesture_utils import *
from game_logic import get_level, generate_obstacles

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/tutorial")
def tutorial():
    return {
        "controls": [
            {"gesture": "Mouth Open", "action": "Jump"},
            {"gesture": "Eyebrow Raise", "action": "Freeze"},
            {"gesture": "Blink", "action": "EMP Gadget"},
            {"gesture": "Head Left/Right", "action": "Dodge left/right"},
        ],
        "tips": ["Stay alert!", "React quickly!", "Use EMP wisely!"]
    }

@app.get("/level/{level_num}")
def level(level_num: int):
    level = get_level(level_num)
    return {"level": level, "obstacles": generate_obstacles(level)}

@app.post("/detect-gesture/")
async def detect_gesture(file: UploadFile = File(...)):
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    mesh = mp.solutions.face_mesh.FaceMesh(static_image_mode=True)
    results = mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    if results.multi_face_landmarks:
        lm = results.multi_face_landmarks[0].landmark
        head_x, head_y = detect_head_pose(lm)
        return JSONResponse({"gestures": {
            "mouth_open": detect_mouth_open(lm),
            "eyebrow_raise": detect_eyebrow_raise(lm),
            "blink": detect_blink(lm),
            "head_direction": detect_head_direction(lm),
            "head_x": head_x,
            "head_y": head_y
        }})
    return JSONResponse({"gestures": {
        "mouth_open": False,
        "eyebrow_raise": False,
        "blink": False,
        "head_direction": "center",
        "head_x": 0.0,
        "head_y": 0.0
    }})