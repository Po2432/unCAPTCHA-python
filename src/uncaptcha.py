import time
import math
import random
import uuid
from flask import Blueprint, request, jsonify, session

# Define the Blueprint
# The user will import this: "from uncaptcha_server import uncaptcha_bp"
uncaptcha_bp = Blueprint('uncaptcha', __name__)

# --- IMAGE DATABASE ---
def get_image_db():
    return {
        "dog": [f"https://placedog.net/100/100?id={random.randint(1, 200)}" for _ in range(20)],
        "cat": [f"https://cataas.com/cat?width=100&height=100&v={random.randint(1, 100000)}" for _ in range(20)],
        "other": [f"https://picsum.photos/100?random={random.randint(1, 100000)}" for _ in range(20)]
    }

# --- BOT DETECTION LOGIC ---
def calculate_bot_score(telemetry):
    mouse_path = telemetry.get('mousePath', [])
    if not mouse_path or len(mouse_path) < 5: return 1.0
    
    total_dist = 0
    for i in range(1, len(mouse_path)):
        p1, p2 = mouse_path[i-1], mouse_path[i]
        total_dist += math.sqrt((p2['x']-p1['x'])**2 + (p2['y']-p1['y'])**2)
        
    start, end = mouse_path[0], mouse_path[-1]
    displacement = math.sqrt((end['x']-start['x'])**2 + (end['y']-start['y'])**2)
    
    if displacement < 10: return 0.5
    linearity = total_dist / displacement if displacement > 0 else 1
    if linearity < 1.05: return 1.0 
    return 0.0

# --- ROUTES ---

@uncaptcha_bp.route('/api/request_check', methods=['POST'])
def request_check():
    data = request.json
    mode = data.get('mode', 'auto')
    telemetry = data.get('telemetry', {})
    
    if mode == 'auto' and calculate_bot_score(telemetry) < 0.5:
        return jsonify({"status": "pass", "message": "Human verification successful"})

    challenge_id = str(uuid.uuid4())
    target = random.choice(["dog", "cat"])
    db = get_image_db()
    
    try:
        correct = random.sample(db[target], 3)
        wrong = []
        keys = [k for k in db.keys() if k != target]
        attempts = 0
        while len(wrong) < 6 and attempts < 50:
            k = random.choice(keys)
            img = random.choice(db[k])
            if img not in wrong: wrong.append(img)
            attempts += 1
                
        all_imgs = correct + wrong
        random.shuffle(all_imgs)
        
        # Store solution in user's session
        session[f'challenge_{challenge_id}'] = {
            "target": target,
            "solution": [i for i, u in enumerate(all_imgs) if u in correct],
            "start_time": time.time()
        }
        
        return jsonify({
            "status": "challenge",
            "challenge_id": challenge_id,
            "instruction": f"Select all {target}s",
            "images": [{"id": i, "src": u} for i, u in enumerate(all_imgs)]
        })
    except:
        return jsonify({"status": "error"}), 500

@uncaptcha_bp.route('/api/verify', methods=['POST'])
def verify_challenge():
    data = request.json
    if data.get('honeypot'): return jsonify({"success": False, "reason": "Bot detected"}), 403

    c_id = data.get('challenge_id')
    stored = session.get(f'challenge_{c_id}')
    
    if not stored: return jsonify({"success": False, "reason": "Expired"}), 400
    
    if sorted(data.get('selected', [])) != sorted(stored['solution']):
        return jsonify({"success": False, "reason": "Incorrect selection"}), 200

    time_taken = time.time() - stored['start_time']
    
    # Speed Trap Logic
    if time_taken < 1.0: return jsonify({"success": False, "reason": "Verification failed"}), 200
    if time_taken < 4.0:
        t_pos = random.randint(20, 80)
        session[f'slider_{c_id}'] = t_pos
        return jsonify({"success": False, "status": "secondary_required", "target_position": t_pos})

    # Success
    session.pop(f'challenge_{c_id}', None)
    session['captcha_verified'] = True 
    return jsonify({"success": True, "status": "verified"})

@uncaptcha_bp.route('/api/verify_slider', methods=['POST'])
def verify_slider():
    data = request.json
    c_id = data.get('challenge_id')
    t_pos = session.get(f'slider_{c_id}')
    
    if t_pos and abs(data.get('position') - t_pos) < 5:
        session.pop(f'challenge_{c_id}', None)
        session.pop(f'slider_{c_id}', None)
        session['captcha_verified'] = True
        return jsonify({"success": True})
        
    return jsonify({"success": False, "reason": "Slider alignment failed"}), 200