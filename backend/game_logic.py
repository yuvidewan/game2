import random

LEVELS = [
    {
        'name': 'Gallery 1',
        'obstacles': ['laser', 'camera'],
        'length': 10
    },
    {
        'name': 'Gallery 2',
        'obstacles': ['laser', 'camera', 'guard'],
        'length': 15
    },
    {
        'name': 'Vault',
        'obstacles': ['laser', 'camera', 'guard', 'trapdoor'],
        'length': 20
    }
]

HIGH_SCORES = []


def get_level(level_num):
    if level_num < len(LEVELS):
        return LEVELS[level_num]
    return LEVELS[-1]


def generate_obstacles(level):
    obs_types = level['obstacles']
    return [random.choice(obs_types) for _ in range(level['length'])]


def check_collision(player_action, obstacle):
    # Map actions to obstacles
    if obstacle == 'laser' and player_action == 'jump':
        return False
    if obstacle == 'camera' and player_action == 'freeze':
        return False
    if obstacle == 'guard' and player_action == 'gadget':
        return False
    if obstacle == 'trapdoor' and player_action == 'move':
        return False
    return True  # Collision if not handled


def update_high_scores(score, name):
    HIGH_SCORES.append({'name': name, 'score': score})
    HIGH_SCORES.sort(key=lambda x: x['score'], reverse=True)
    if len(HIGH_SCORES) > 10:
        HIGH_SCORES.pop()
    return HIGH_SCORES


def get_high_scores():
    return HIGH_SCORES 