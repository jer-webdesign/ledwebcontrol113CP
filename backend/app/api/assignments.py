from flask import Blueprint, jsonify, request
from ..utils.file_helpers import load_hierarchy, save_hierarchy, load_available_devices, save_available_devices

assignments_bp = Blueprint("assignments", __name__)

@assignments_bp.route("/api/assign_device", methods=["POST"])
def assign_device():
    data = request.get_json()
    mac_address = data.get('mac_address')
    zone_id = data.get('zone_id')
    group_id = data.get('group_id')
    location_id = data.get('location_id')

    hierarchy = load_hierarchy()
    zone = next((z for z in hierarchy['zones'] if z['id'] == zone_id), None)
    if not zone:
        return jsonify({'status': 'error', 'message': 'Zone not found'})
    group = next((g for g in zone['groups'] if g['id'] == group_id), None)
    if not group:
        return jsonify({'status': 'error', 'message': 'Group not found'})
    location = next((l for l in group['locations'] if l['id'] == location_id), None)
    if not location:
        return jsonify({'status': 'error', 'message': 'Location not found'})

    devices_data = load_available_devices()
    device = next((d for d in devices_data['available_devices'] if d['mac_address'] == mac_address), None)
    if not device:
        return jsonify({'status': 'error', 'message': 'Device not found'})

    location['assigned_device_mac'] = mac_address
    device['assigned_to_location'] = {
        'zone_id': zone_id, 'group_id': group_id, 'location_id': location_id
    }

    save_hierarchy(hierarchy)
    save_available_devices(devices_data)
    return jsonify({'status': 'success', 'message': 'Device assigned successfully'})
