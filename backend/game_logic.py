import random

LEVELS = [
    {"name": "Vault Entry", "obstacles": ["laser", "camera", "guard", "trapdoor"], "length": 20, "guard_speed": 1, "laser_speed": 1},
    {"name": "Gallery Hall", "obstacles": ["laser", "guard", "trapdoor", "camera"], "length": 30, "guard_speed": 1.2, "laser_speed": 1.2},
    {"name": "Security Wing", "obstacles": ["laser", "guard", "trapdoor", "camera"], "length": 40, "guard_speed": 1.5, "laser_speed": 1.5},
    {"name": "Masterpiece Room", "obstacles": ["laser", "guard", "trapdoor", "camera"], "length": 50, "guard_speed": 2, "laser_speed": 2}
]

def get_level(level_num):
    if level_num < len(LEVELS):
        return LEVELS[level_num]
    return LEVELS[-1]

def generate_obstacles(level):
    return [random.choice(level["obstacles"]) for _ in range(level["length"])]