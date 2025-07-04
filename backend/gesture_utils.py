import mediapipe as mp

def safe_landmark(landmarks, index):
    return landmarks[index] if index < len(landmarks) else None

def detect_mouth_open(landmarks):
    top, bottom = safe_landmark(landmarks, 13), safe_landmark(landmarks, 14)
    return top and bottom and abs(top.y - bottom.y) > 0.04

def detect_eyebrow_raise(landmarks):
    left_brow = safe_landmark(landmarks, 65)
    left_eye = safe_landmark(landmarks, 159)
    right_brow = safe_landmark(landmarks, 295)
    right_eye = safe_landmark(landmarks, 386)
    return (left_brow and left_eye and right_brow and right_eye and
            ((left_brow.y - left_eye.y) < -0.04 or (right_brow.y - right_eye.y) < -0.04))

def detect_blink(landmarks):
    lt, lb = safe_landmark(landmarks, 159), safe_landmark(landmarks, 145)
    rt, rb = safe_landmark(landmarks, 386), safe_landmark(landmarks, 374)
    return (lt and lb and rt and rb and
            (abs(lt.y - lb.y) < 0.03 or abs(rt.y - rb.y) < 0.03))

def detect_head_direction(landmarks):
    nose = safe_landmark(landmarks, 1)
    left, right = safe_landmark(landmarks, 234), safe_landmark(landmarks, 454)
    if nose and left and right:
        if nose.x < left.x:
            return "left"
        elif nose.x > right.x:
            return "right"
    return "center"

def detect_head_pose(landmarks):
    # Use nose tip (1), left cheek (234), right cheek (454), chin (152), forehead (10)
    nose = safe_landmark(landmarks, 1)
    left = safe_landmark(landmarks, 234)
    right = safe_landmark(landmarks, 454)
    chin = safe_landmark(landmarks, 152)
    forehead = safe_landmark(landmarks, 10)
    if not (nose and left and right and chin and forehead):
        return 0.0, 0.0
    # Yaw: left/right, compare nose.x to midpoint of cheeks
    mid_x = (left.x + right.x) / 2
    head_x = (nose.x - mid_x) * 8  # scale to approx [-1, 1]
    head_x = max(-1, min(1, head_x))
    # Pitch: up/down, compare nose.y to midpoint of chin/forehead
    mid_y = (chin.y + forehead.y) / 2
    head_y = (nose.y - mid_y) * -8  # negative so up is positive
    head_y = max(-1, min(1, head_y))
    return head_x, head_y