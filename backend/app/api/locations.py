from flask import Blueprint, jsonify, request, current_app
from ..utils.file_helpers import load_network_devices, save_network_devices

locations_bp = Blueprint("locations", __name__)

@locations_bp.route("/api/zones/<int:zone_id>/groups/<int:group_id>/locations", methods=["POST"])
def create_location(zone_id, group_id):
    """
    Create a new location in the specified group.
    Expects JSON body with 'name' and optional 'description'.
    """
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'status': 'error', 'message': 'Location name is required'}), 400

        # Load current hierarchy
        hierarchy = load_network_devices()
        zones = hierarchy.get('zones', [])
        
        # Find the zone
        zone = next((z for z in zones if z.get('zone_id') == zone_id), None)
        if not zone:
            return jsonify({'status': 'error', 'message': 'Zone not found'}), 404

        # Find the group
        groups = zone.get('groups', [])
        group = next((g for g in groups if g.get('group_id') == group_id), None)
        if not group:
            return jsonify({'status': 'error', 'message': 'Group not found'}), 404

        # Get existing locations and determine new ID
        existing_locations = group.get('location', [])
        if not existing_locations:
            group['location'] = []
            new_id = 1
        else:
            # Find highest existing location_id
            max_id = max((loc.get('location_id', 0) for loc in existing_locations), default=0)
            new_id = max_id + 1

        # Optionally create a default device in the new location.
        create_default = bool(data.get('create_default_device', False))
        new_location = {
            'location_description': data.get('description', ''),
            'location_id': new_id,
            'location_name': data.get('name'),
            'device': []
        }
        if create_default:
            default_device = {
                'device_id': 1,
                'device_name': data.get('default_device_name', 'Device 1'),
                'device_description': data.get('default_device_description', ''),
                'device_hostname': data.get('default_device_hostname', None),
                'device_ip': data.get('default_device_ip', None),
                'device_mac': data.get('default_device_mac', None),
                'device_current_color': data.get('default_device_current_color', None),
                'device_segment_colors': data.get('default_device_segment_colors', [])
            }
            new_location['device'].append(default_device)
        
        group['location'].append(new_location)

        # Save updated hierarchy
        save_network_devices(hierarchy)

        return jsonify({'status': 'success', 'location': new_location}), 201

    except Exception as e:
        current_app.logger.exception("Failed to create location")
        return jsonify({'status': 'error', 'message': str(e)}), 500