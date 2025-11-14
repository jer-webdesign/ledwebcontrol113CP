from flask import Blueprint, request, jsonify
import requests

wled_bp = Blueprint('wled', __name__)
# Provide common blueprint attribute names so automatic registration picks it up
api = wled_bp
bp = wled_bp

WLED_IP = "10.0.0.140"

@wled_bp.route('/api/wled/on', methods=['POST'])
def turn_on_wled():
    url = f"http://{WLED_IP}/json/state"
    payload = {"on": True}
    resp = requests.post(url, json=payload)
    return jsonify(resp.json()), resp.status_code

@wled_bp.route('/api/wled/off', methods=['POST'])
def turn_off_wled():
    url = f"http://{WLED_IP}/json/state"
    payload = {"on": False}
    resp = requests.post(url, json=payload)
    return jsonify(resp.json()), resp.status_code

@wled_bp.route('/api/wled/color', methods=['POST'])
def set_wled_color():
    color = request.json.get('color', [255, 255, 255])
    url = f"http://{WLED_IP}/json/state"
    payload = {"on": True, "seg": [{"col": [color]}]}
    resp = requests.post(url, json=payload)
    return jsonify(resp.json()), resp.status_code


@wled_bp.route('/api/wled/ip', methods=['GET'])
def get_wled_ip():
    """
    Return configured WLED_IP value for frontend convenience
    """
    return jsonify({'status': 'success', 'wled_ip': WLED_IP}), 200
