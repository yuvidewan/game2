import mediapipe as mp

def safe_landmark(landmarks, index):
    if len(landmarks) > index:
        return landmarks[index]
    return None

def detect_mouth_open(landmarks):
    top_lip = safe_landmark(landmarks, 13)
    bottom_lip = safe_landmark(landmarks, 14)
    if top_lip and bottom_lip:
        dist = abs(top_lip.y - bottom_lip.y)
        print("Mouth distance:", dist)
        return dist > 0.04
    return False

def detect_eyebrow_raise(landmarks):
    left_brow = safe_landmark(landmarks, 65)
    left_eye = safe_landmark(landmarks, 159)
    right_brow = safe_landmark(landmarks, 295)
    right_eye = safe_landmark(landmarks, 386)
    if left_brow and left_eye and right_brow and right_eye:
        left_raised = (left_brow.y - left_eye.y) < -0.04
        right_raised = (right_brow.y - right_eye.y) < -0.04
        print("Eyebrow raise:", left_raised, right_raised)
        return left_raised or right_raised
    return False

def detect_blink(landmarks):
    left_eye_top = safe_landmark(landmarks, 159)
    left_eye_bottom = safe_landmark(landmarks, 145)
    right_eye_top = safe_landmark(landmarks, 386)
    right_eye_bottom = safe_landmark(landmarks, 374)
    if left_eye_top and left_eye_bottom and right_eye_top and right_eye_bottom:
        left_eye_closed = abs(left_eye_top.y - left_eye_bottom.y) < 0.03
        right_eye_closed = abs(right_eye_top.y - right_eye_bottom.y) < 0.03
        print("Blink:", left_eye_closed, right_eye_closed)
        return left_eye_closed or right_eye_closed
    return False

def detect_head_direction(landmarks):
    nose = safe_landmark(landmarks, 1)
    left_cheek = safe_landmark(landmarks, 234)
    right_cheek = safe_landmark(landmarks, 454)
    if nose and left_cheek and right_cheek:
        if nose.x < left_cheek.x:
            print("Head direction: left")
            return 'left'
        elif nose.x > right_cheek.x:
            print("Head direction: right")
            return 'right'
    print("Head direction: center")
    return 'center'
