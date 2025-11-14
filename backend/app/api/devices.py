from flask import Blueprint, jsonify, request, redirect, url_for, current_app
from ..utils.file_helpers import load_network_devices, save_network_devices
from ..utils.device_manager import device_manager
from ..utils.esp32_client import esp32_client
from ..utils.esp32_errors import handle_esp32_api_errors, get_system_health

devices_bp = Blueprint("devices", __name__)

@devices_bp.route("/api/zones/<int:zone_id>/groups/<int:group_id>/locations/<int:location_id>/devices", methods=["POST"])
def create_device(zone_id, group_id, location_id):
    """
    Create a new device in the specified location.
    Expects JSON body with device information.
    """
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'status': 'error', 'message': 'Device name is required'}), 400

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

        # Find the location
        locations = group.get('location', [])
        location = next((loc for loc in locations if loc.get('location_id') == location_id), None)
        if not location:
            return jsonify({'status': 'error', 'message': 'Location not found'}), 404

        # Get existing devices and determine new ID
        existing_devices = location.get('device', [])
        if not existing_devices:
            location['device'] = []
            new_id = 1
        else:
            # Find highest existing device_id
            max_id = max((dev.get('device_id', 0) for dev in existing_devices), default=0)
            new_id = max_id + 1

        # Create new device (matching network_devices.json structure)
        new_device = {
            'device_id': new_id,
            'device_name': data.get('name'),
            'device_description': data.get('description', ''),
            'device_hostname': data.get('hostname', None),
            'device_ip': data.get('ip_address', None),
            'device_mac': data.get('mac_address', None),
            'device_current_color': data.get('current_color', None),
            'device_segment_colors': data.get('segment_colors', [])
        }

        # Try to probe the device if we have an IP
        ip = new_device.get('device_ip')
        if ip:
            try:
                info_data = esp32_client.get_device_info(ip)
                if info_data:
                    # Update hostname if available
                    hostname = info_data.get("name")
                    if hostname:
                        new_device["device_hostname"] = hostname
                    # Update MAC if available
                    mac = info_data.get("mac") or info_data.get("mac_address")
                    if mac:
                        new_device["device_mac"] = mac
                    current_app.logger.info(f"Successfully probed device at {ip}")
            except Exception as e:
                current_app.logger.warning(f"Failed to probe device at {ip}: {e}")

        location['device'].append(new_device)

        # Save updated hierarchy
        save_network_devices(hierarchy)

        return jsonify({'status': 'success', 'device': new_device}), 201

    except Exception as e:
        current_app.logger.exception("Failed to create device")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/add_device", methods=["POST"])
def add_device():
    """
    Legacy endpoint for adding devices.
    Redirects to the new structured endpoint or adds to a default location.
    """
    # Accept JSON body primarily, fall back to form data for compatibility
    payload = request.get_json(silent=True) or {}
    if not payload:
        payload = {
            'name': request.form.get('name'),
            'ip_address': request.form.get('ip_address'),
            'mac_address': request.form.get('mac_address'),
            'description': request.form.get('description', ''),
            'current_color': request.form.get('current_color'),
            'segment_colors': request.form.get('segment_colors', [])
        }

    # Find or create an "Unassigned" zone/group/location
    hierarchy = load_network_devices()
    zones = hierarchy.get('zones', [])
    
    # Look for zone_id 0 (Unassigned)
    unassigned_zone = next((z for z in zones if z.get('zone_id') == 0), None)
    
    if not unassigned_zone:
        # Create unassigned zone
        unassigned_zone = {
            'zone_id': 0,
            'zone_name': 'Unassigned',
            'zone_description': 'Devices not yet assigned to a location',
            'groups': []
        }
        hierarchy.setdefault('zones', []).insert(0, unassigned_zone)
    
    # Look for group_id 0 in unassigned zone
    unassigned_group = next((g for g in unassigned_zone.get('groups', []) if g.get('group_id') == 0), None)
    
    if not unassigned_group:
        # Create unassigned group
        unassigned_group = {
            'group_description': 'Unassigned devices',
            'group_id': 0,
            'group_name': 'Unassigned',
            'location': []
        }
        unassigned_zone.setdefault('groups', []).append(unassigned_group)
    
    # Look for location_id 0 in unassigned group
    unassigned_location = next((loc for loc in unassigned_group.get('location', []) if loc.get('location_id') == 0), None)
    
    if not unassigned_location:
        # Create unassigned location
        unassigned_location = {
            'location_description': 'Unassigned devices',
            'location_id': 0,
            'location_name': 'Unassigned',
            'device': []
        }
        unassigned_group.setdefault('location', []).append(unassigned_location)
    
    # Determine new device ID across all devices in the hierarchy
    max_id = 0
    for z in zones:
        for g in z.get('groups', []):
            for loc in g.get('location', []):
                for dev in loc.get('device', []):
                    dev_id = dev.get('device_id', 0)
                    if dev_id > max_id:
                        max_id = dev_id
    
    new_id = max_id + 1

    # Create new device
    new_device = {
        'device_id': new_id,
        'device_name': payload.get('name'),
        'device_description': payload.get('description', ''),
        'device_hostname': None,
        'device_ip': payload.get('ip_address'),
        'device_mac': payload.get('mac_address'),
        'device_current_color': payload.get('current_color'),
        'device_segment_colors': payload.get('segment_colors', [])
    }

    # Try to probe the device if we have an IP
    ip = new_device.get('device_ip')
    if ip:
        try:
            info_data = esp32_client.get_device_info(ip)
            if info_data:
                hostname = info_data.get("name")
                if hostname:
                    new_device["device_hostname"] = hostname
                mac = info_data.get("mac") or info_data.get("mac_address")
                if mac:
                    new_device["device_mac"] = mac
        except Exception as e:
            current_app.logger.warning(f"Failed to probe device at {ip}: {e}")

    # Add device to unassigned location
    unassigned_location.setdefault('device', []).append(new_device)

    # Save updated hierarchy
    save_network_devices(hierarchy)

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"status": "success", "device": new_device})
    else:
        return redirect(url_for("devices.add_device"))


# ESP32 Device Control Endpoints

@devices_bp.route("/api/devices/states", methods=["GET"])
@handle_esp32_api_errors
def get_all_device_states():
    """
    Get states from all ESP32 devices
    """
    states = device_manager.get_all_device_states()
    return jsonify({'status': 'success', 'states': states}), 200


@devices_bp.route("/api/devices/<device_id>/power", methods=["POST"])
def set_device_power(device_id):
    """
    Turn ESP32 device on or off
    Expects JSON body with 'on' field (boolean)
    """
    try:
        data = request.get_json()
        if not data or 'on' not in data:
            return jsonify({'status': 'error', 'message': 'Power state (on) is required'}), 400
        
        on = bool(data['on'])
        # Get device IP so we can return it to the caller (browser)
        ip = device_manager.get_device_ip(device_id)
        if not ip:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404

        result = device_manager.set_device_power(device_id, on)
        if result is None:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404

        # Return device_ip in the response so the frontend can log it to the browser console
        return jsonify({'status': 'success', 'device_ip': ip, 'result': result}), 200
        
    except Exception as e:
        current_app.logger.exception(f"Failed to set power for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/<device_id>/brightness", methods=["POST"])
def set_device_brightness(device_id):
    """
    Set ESP32 device brightness
    Expects JSON body with 'brightness' field (0-255)
    """
    try:
        data = request.get_json()
        if not data or 'brightness' not in data:
            return jsonify({'status': 'error', 'message': 'Brightness level is required'}), 400
        
        brightness = int(data['brightness'])
        if brightness < 0 or brightness > 255:
            return jsonify({'status': 'error', 'message': 'Brightness must be between 0 and 255'}), 400
        
        result = device_manager.set_device_brightness(device_id, brightness)
        if result is None:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404
        
        return jsonify({'status': 'success', 'result': result}), 200
        
    except Exception as e:
        current_app.logger.exception(f"Failed to set brightness for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/<device_id>/color", methods=["POST"])
def set_device_color(device_id):
    """
    Set ESP32 device color
    Expects JSON body with 'r', 'g', 'b' fields (0-255), optional 'w' field
    """
    try:
        data = request.get_json()
        if not data or not all(field in data for field in ['r', 'g', 'b']):
            return jsonify({'status': 'error', 'message': 'RGB values are required'}), 400
        
        r = int(data['r'])
        g = int(data['g'])
        b = int(data['b'])
        w = int(data.get('w', 0))
        
        # Validate ranges
        for value, name in [(r, 'r'), (g, 'g'), (b, 'b'), (w, 'w')]:
            if value < 0 or value > 255:
                return jsonify({'status': 'error', 'message': f'{name} must be between 0 and 255'}), 400
        
        result = device_manager.set_device_color(device_id, r, g, b, w)
        if result is None:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404
        
        return jsonify({'status': 'success', 'result': result}), 200
        
    except Exception as e:
        current_app.logger.exception(f"Failed to set color for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/<device_id>/effect", methods=["POST"])
def set_device_effect(device_id):
    """
    Set ESP32 device effect
    Expects JSON body with 'effect_id' field
    """
    try:
        data = request.get_json()
        if not data or 'effect_id' not in data:
            return jsonify({'status': 'error', 'message': 'Effect ID is required'}), 400
        
        effect_id = int(data['effect_id'])
        if effect_id < 0:
            return jsonify({'status': 'error', 'message': 'Effect ID must be positive'}), 400
        
        result = device_manager.set_device_effect(device_id, effect_id)
        if result is None:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404
        
        return jsonify({'status': 'success', 'result': result}), 200
        
    except Exception as e:
        current_app.logger.exception(f"Failed to set effect for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/<device_id>/ping", methods=["GET"])
def ping_device(device_id):
    """
    Check if ESP32 device is reachable
    """
    try:
        is_reachable = device_manager.ping_device(device_id)
        return jsonify({
            'status': 'success', 
            'reachable': is_reachable,
            'device_id': device_id
        }), 200
        
    except Exception as e:
        current_app.logger.exception(f"Failed to ping device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/ping", methods=["GET"])
def ping_all_devices():
    """
    Check connectivity for all devices
    """
    try:
        ping_results = device_manager.ping_all_devices()
        return jsonify({'status': 'success', 'ping_results': ping_results}), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to ping devices")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/<device_id>/info", methods=["GET"])
def get_device_info(device_id):
    """
    Get device information from ESP32
    """
    try:
        info = device_manager.get_device_info(device_id)
        if info is None:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404
        
        return jsonify({'status': 'success', 'info': info}), 200
        
    except Exception as e:
        current_app.logger.exception(f"Failed to get info for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/discover", methods=["POST"])
def discover_devices():
    """
    Discover new WLED devices on the network
    Expects JSON body with optional 'ip_range' field
    """
    try:
        data = request.get_json() or {}
        ip_range = data.get('ip_range', '192.168.1')
        
        new_devices = device_manager.discover_new_devices(ip_range)
        return jsonify({
            'status': 'success', 
            'discovered_devices': new_devices,
            'count': len(new_devices)
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to discover devices")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/probe", methods=["POST"])
def probe_device_by_ip():
    """
    Probe a device at a given IP address and return basic device info without adding it to the hierarchy.
    Expects JSON body: { "ip": "192.168.1.123" }
    """
    try:
        data = request.get_json() or {}
        ip = data.get('ip')
        if not ip:
            return jsonify({'status': 'error', 'message': 'IP address is required'}), 400

        # Ask esp32_client for device info
        info = esp32_client.get_device_info(ip)
        if not info:
            return jsonify({'status': 'error', 'message': 'No response from device'}), 504

        return jsonify({'status': 'success', 'info': info}), 200
    except Exception as e:
        current_app.logger.exception(f"Failed to probe device at {data.get('ip') if 'data' in locals() else 'unknown'}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/summary", methods=["GET"])
def get_devices_summary():
    """
    Get summary of all devices
    """
    try:
        summary = device_manager.get_device_summary()
        return jsonify({'status': 'success', 'summary': summary}), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to get devices summary")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/health", methods=["GET"])
def get_system_health_endpoint():
    """
    Get system health status
    """
    try:
        health = get_system_health()
        return jsonify({'status': 'success', 'health': health}), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to get system health")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# Apply error handling to critical endpoints
@devices_bp.route("/api/devices/<device_id>/state", methods=["GET"])
@handle_esp32_api_errors
def get_device_state(device_id):
    """
    Get current state from ESP32 device
    """
    state = device_manager.get_device_state(device_id)
    if state is None:
        # DeviceManager returns None when the physical device is unreachable.
        # Instead of a 404, return stored metadata and a status flag so the UI
        # can display an offline indicator without erroring.
        try:
            # Attempt to return stored metadata from device_manager.devices_data
            try:
                did_int = int(device_id)
            except Exception:
                did_int = device_id
            dev_meta = device_manager.devices_data.get(did_int) or {}
            # Build a minimal state-like object containing metadata and status
            minimal = {
                'on': False,
                'bri': dev_meta.get('device_brightness', 128),
                'device_current_color': dev_meta.get('device_current_color'),
                'device_segment_colors': dev_meta.get('device_segment_colors', []),
                'device_ip': dev_meta.get('device_ip'),
                'status': dev_meta.get('status', 'offline')
            }
            return jsonify({'status': 'success', 'state': minimal}), 200
        except Exception:
            return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404

    return jsonify({'status': 'success', 'state': state}), 200


@devices_bp.route("/api/devices/<device_id>/state", methods=["POST"])
@handle_esp32_api_errors
def set_device_state(device_id):
    """
    Set state on ESP32 device
    Expects JSON body with WLED state data
    """
    data = request.get_json()
    if not data:
        return jsonify({'status': 'error', 'message': 'State data is required'}), 400
    
    result = device_manager.set_device_state(device_id, data)
    if result is None:
        return jsonify({'status': 'error', 'message': 'Device not found or unreachable'}), 404
    
    return jsonify({'status': 'success', 'result': result}), 200


@devices_bp.route("/api/devices/<device_id>/network", methods=["POST"])
def update_device_network(device_id):
    """
    Update the network metadata for a device stored in network_devices.json.
    Accepts JSON body with any of: device_ip, device_mac, device_current_color, device_segment_colors
    Applies a small rule: if two segment colors are provided and they differ, keep the device_current_color
    unchanged (unless explicitly provided) and persist the segment_colors as-is. Otherwise a single
    color will be treated as the device_current_color.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Payload required'}), 400

        # Load the authoritative network_devices.json structure
        net = load_network_devices()

        for z in net.get('zones', []):
            for g in z.get('groups', []):
                for l in g.get('location', []):
                    for d in (l.get('device') or []):
                        if str(d.get('device_id')) == str(device_id):
                            # Update fields if provided
                            ip = data.get('device_ip')
                            mac = data.get('device_mac')
                            curr = data.get('device_current_color')
                            segs = data.get('device_segment_colors')

                            if ip is not None:
                                d['device_ip'] = ip
                            if mac is not None:
                                d['device_mac'] = mac

                            # Normalize segment colors to a list if present
                            if isinstance(segs, (list, tuple)):
                                segs_list = list(segs)
                            else:
                                segs_list = None

                            # Apply rule described by the UI: if two segment colors are provided and
                            # they are different, persist segment colors and keep current color
                            # unless explicitly provided. Otherwise, treat the provided value as
                            # the device_current_color.
                            if segs_list and len(segs_list) >= 2 and str(segs_list[0]) != str(segs_list[1]):
                                # Keep device_current_color unless the payload included it
                                if curr is not None:
                                    d['device_current_color'] = curr
                                d['device_segment_colors'] = segs_list
                            else:
                                # If a current color was sent, use it. If a single segment color
                                # was provided treat it as the current color. Otherwise clear
                                # the segment colors list.
                                if curr is not None:
                                    d['device_current_color'] = curr
                                elif segs_list and len(segs_list) == 1:
                                    d['device_current_color'] = segs_list[0]
                                # Persist provided segment list if it's meaningful
                                if segs_list:
                                    d['device_segment_colors'] = segs_list
                                else:
                                    d['device_segment_colors'] = d.get('device_segment_colors', []) or []

                            # Save back to disk
                            save_network_devices(net)

                            # Refresh in-memory device manager mapping so subsequent control calls work
                            try:
                                device_manager.load_devices()
                            except Exception:
                                current_app.logger.exception('Failed to reload device manager after network update')

                            return jsonify({'status': 'success', 'device': d}), 200

        return jsonify({'status': 'error', 'message': 'Device not found in network file'}), 404

    except Exception as e:
        current_app.logger.exception(f"Failed to update network info for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@devices_bp.route("/api/devices/<device_id>/apply_saved", methods=["POST"])
def apply_saved_device_state(device_id):
    """
    Apply saved device state from network_devices.json to the physical device.
    This reads the saved configuration and attempts to set per-segment colors
    and brightness, requesting the device to persist the settings.
    """
    try:
        result = device_manager.apply_saved_state(device_id)
        if result is None:
            return jsonify({'status': 'error', 'message': 'No saved state applied or device unreachable'}), 404
        return jsonify({'status': 'success', 'result': result}), 200
    except Exception as e:
        current_app.logger.exception(f"Failed to apply saved state for device {device_id}")
        return jsonify({'status': 'error', 'message': str(e)}), 500