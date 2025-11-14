from flask import Blueprint, jsonify, request, current_app
from ..utils.file_helpers import load_network_devices, save_network_devices

groups_bp = Blueprint('groups', __name__)

@groups_bp.route('/api/groups', methods=['GET'])
def api_groups():
    """
    GET /api/groups?zone_id=ID
    Returns JSON { "groups": [ ... ] } for the requested zone_id.
    If zone_id is omitted returns all groups across zones (each group includes zone_id).
    """
    try:
        hierarchy = load_network_devices()
        zone_id = request.args.get('zone_id')
        zones = hierarchy.get('zones', [])
        result = []

        if zone_id:
            # find matching zone
            for z in zones:
                if str(z.get('zone_id')) == str(zone_id):
                    for g in z.get('groups', []):
                        # include zone_id for convenience
                        gg = dict(g)
                        gg['zone_id'] = z.get('zone_id')
                        result.append(gg)
                    break
        else:
            # return all groups with zone_id attached
            for z in zones:
                for g in z.get('groups', []):
                    gg = dict(g)
                    gg['zone_id'] = z.get('zone_id')
                    result.append(gg)

        return jsonify({"groups": result}), 200
    except Exception as e:
        current_app.logger.exception("Failed to read groups")
        return jsonify({"error": "internal server error", "message": str(e)}), 500

@groups_bp.route("/api/zones/<int:zone_id>/groups", methods=["POST"])
def create_group(zone_id):
    """
    Create a new group in the specified zone.
    Expects JSON body with 'name' and optional 'description'.
    """
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'status': 'error', 'message': 'Group name is required'}), 400

        # Load current hierarchy
        hierarchy = load_network_devices()
        zones = hierarchy.get('zones', [])
        
        # Find the zone
        zone = next((z for z in zones if z.get('zone_id') == zone_id), None)
        
        if not zone:
            return jsonify({'status': 'error', 'message': 'Zone not found'}), 404

        # Get existing groups and determine new ID
        existing_groups = zone.get('groups', [])
        if not existing_groups:
            zone['groups'] = []
            new_id = 1
        else:
            # Find highest existing group_id
            max_id = max((g.get('group_id', 0) for g in existing_groups), default=0)
            new_id = max_id + 1

        # Create default device (matching network_devices.json structure)
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

        # Create default location (note: key is 'device' not 'device_id')
        default_location = {
            'location_description': data.get('default_location_description', ''),
            'location_id': 1,
            'location_name': data.get('default_location_name', 'Location 1'),
            'device': [default_device]  # Note: 'device' not 'device_id'
        }

        # Create new group (note: key is 'location' not 'locations')
        new_group = {
            'group_description': data.get('description', ''),
            'group_id': new_id,
            'group_name': data.get('name'),
            'location': [default_location]  # Note: 'location' not 'locations'
        }
        
        zone['groups'].append(new_group)

        # Save updated hierarchy
        save_network_devices(hierarchy)

        return jsonify({'status': 'success', 'group': new_group}), 201

    except Exception as e:
        current_app.logger.exception("Failed to create group")
        return jsonify({'status': 'error', 'message': str(e)}), 500