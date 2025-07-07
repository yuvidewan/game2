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
    # Use nose tip (1) for translation
    nose = safe_landmark(landmarks, 1)
    if not nose:
        return 0.0, 0.0
    # X translation: left/right in frame
    head_x = (nose.x - 0.5) * 2  # -1 (left edge), 0 (center), 1 (right edge)
    head_x = max(-1, min(1, head_x))
    # Y translation: up/down in frame
    head_y = (0.5 - nose.y) * 2  # 1 (top), 0 (center), -1 (bottom)
    head_y = max(-1, min(1, head_y))
    return head_x, head_y