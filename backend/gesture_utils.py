import mediapipe as mp

def detect_mouth_open(landmarks):
    top_lip = landmarks[13]
    bottom_lip = landmarks[14]
    return abs(top_lip.y - bottom_lip.y) > 0.04

def detect_eyebrow_raise(landmarks):
    # Compare distance between eyebrow and eye
    left_brow = landmarks[65]
    left_eye = landmarks[159]
    right_brow = landmarks[295]
    right_eye = landmarks[386]
    left_raised = (left_brow.y - left_eye.y) < -0.04
    right_raised = (right_brow.y - right_eye.y) < -0.04
    return left_raised or right_raised

def detect_blink(landmarks):
    # Eye aspect ratio: if small, eye is closed
    left_eye_top = landmarks[159]
    left_eye_bottom = landmarks[145]
    right_eye_top = landmarks[386]
    right_eye_bottom = landmarks[374]
    left_eye_closed = abs(left_eye_top.y - left_eye_bottom.y) < 0.015
    right_eye_closed = abs(right_eye_top.y - right_eye_bottom.y) < 0.015
    return left_eye_closed or right_eye_closed

def detect_head_direction(landmarks):
    # Use nose and cheeks to estimate head direction
    nose = landmarks[1]
    left_cheek = landmarks[234]
    right_cheek = landmarks[454]
    if nose.x < left_cheek.x:
        return 'left'
    elif nose.x > right_cheek.x:
        return 'right'
    else:
        return 'center' 