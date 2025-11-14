from flask import Blueprint, jsonify, request
from ..utils.file_helpers import load_network_devices, save_network_devices

zones_bp = Blueprint("zones", __name__)

@zones_bp.route("/api/zones", methods=["POST"])
def create_zone():
    data = request.get_json()
    hierarchy = load_network_devices()
    zone_id = len(hierarchy.get('zones', [])) + 1
    # create a default device
    default_device = {
        'device_id': 1,
        'device_name': data.get('default_device_name', 'Device 1'),
        'device_mac': data.get('default_device_mac', None),
        'device_description': data.get('default_device_description', ''),
        'device_hostname': data.get('default_device_hostname', ''),
        'device_current_color': data.get('default_device_current_color', None),
        'device_segment_colors': data.get('default_device_segment_colors', [])
    }

    # create a default location containing the default device
    default_location = {
        'location_id': 1,
        'location_name': data.get('default_location_name', 'Location 1'),
        'location_description': data.get('default_location_description', ''),
        'device_id': [default_device]
    }

    # create a default group containing the location
    default_group = {
        'group_id': 1,
        'group_name': data.get('default_group_name', 'Group 1'),
        'group_description': data.get('default_group_description', ''),
        'locations': [default_location]
    }

    new_zone = {
        'zone_id': zone_id,
        'zone_name': data.get('name'),
        'zone_description': data.get('description', ''),
        'groups': [default_group]
    }
    hierarchy['zones'].append(new_zone)
    save_network_devices(hierarchy)
    return jsonify({'status': 'success', 'zone': new_zone})
