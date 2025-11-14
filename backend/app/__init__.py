import os
import importlib
import json
import logging
import time
from collections import OrderedDict
from flask import Flask, send_from_directory, abort, jsonify, request
from flask_cors import CORS

# Optional: path to the single-source network file (used by other utils)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FRONTEND_SRC = os.path.join(ROOT_DIR, 'frontend', 'src')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _register_blueprint_if_exists(app, module_name):
    """
    Import module_name and register a blueprint attribute if present.
    Common attribute names: bp, blueprint, api, and module-specific names.
    """
    try:
        mod = importlib.import_module(module_name)
    except ImportError:
        logger.debug("Module %s not found, skipping.", module_name)
        return
    # Check for common blueprint attribute names
    for attr in ('bp', 'blueprint', 'api', 'groups_bp', 'zones_bp', 'locations_bp', 'devices_bp', 'hierarchy_bp'):
        if hasattr(mod, attr):
            bp = getattr(mod, attr)
            try:
                app.register_blueprint(bp)
                logger.info("Registered blueprint %s from %s", attr, module_name)
            except Exception as e:
                logger.exception("Failed to register blueprint from %s: %s", module_name, e)
            return
    logger.debug("Module %s imported but no blueprint attribute found.", module_name)

def normalize_zone(zone_data):
    """Normalize a single zone to the correct property order."""
    ordered_zone = OrderedDict()
    zone_order = ['zone_id', 'zone_name', 'zone_description', 'groups']
    
    for key in zone_order:
        if key in zone_data:
            if key == 'groups':
                ordered_zone[key] = [normalize_group(group) for group in zone_data[key]]
            else:
                ordered_zone[key] = zone_data[key]
    
    # Add any remaining keys
    for key in zone_data:
        if key not in zone_order:
            ordered_zone[key] = zone_data[key]
    
    return ordered_zone

def normalize_group(group_data):
    """Normalize a single group to the correct property order."""
    ordered_group = OrderedDict()
    group_order = ['group_id', 'group_name', 'group_description', 'location']
    
    for key in group_order:
        if key in group_data:
            if key == 'location':
                ordered_group[key] = [normalize_location(loc) for loc in group_data[key]]
            else:
                ordered_group[key] = group_data[key]
    
    # Add any remaining keys
    for key in group_data:
        if key not in group_order:
            ordered_group[key] = group_data[key]
    
    return ordered_group

def normalize_location(location_data):
    """Normalize a single location to the correct property order."""
    ordered_location = OrderedDict()
    location_order = ['location_id', 'location_name', 'location_description', 'device']
    
    for key in location_order:
        if key in location_data:
            if key == 'device':
                ordered_location[key] = [normalize_device(dev) for dev in location_data[key]]
            else:
                ordered_location[key] = location_data[key]
    
    # Add any remaining keys
    for key in location_data:
        if key not in location_order:
            ordered_location[key] = location_data[key]
    
    return ordered_location

def normalize_device(device_data):
    """Normalize a single device to the correct property order."""
    ordered_device = OrderedDict()
    device_order = ['device_id', 'device_name', 'device_description', 'device_hostname', 
                   'device_ip', 'device_mac', 'device_current_color', 'device_segment_colors']
    
    for key in device_order:
        if key in device_data:
            ordered_device[key] = device_data[key]
    
    # Add any remaining keys
    for key in device_data:
        if key not in device_order:
            ordered_device[key] = device_data[key]
    
    return ordered_device

def normalize_structure_order(data):
    """
    Normalize the structure to match the desired property ordering
    based on network_devices.json format.
    """
    if isinstance(data, dict):
        if 'zones' in data:
            # Top-level hierarchy object
            ordered_data = OrderedDict()
            ordered_data['zones'] = [normalize_zone(zone) for zone in data.get('zones', [])]
            # Add any remaining keys
            for key in data:
                if key != 'zones':
                    ordered_data[key] = data[key]
            return ordered_data
        else:
            # Generic object - preserve as-is
            return data
    elif isinstance(data, list):
        return [normalize_structure_order(item) for item in data]
    else:
        return data

def merge_zones_with_structure_preservation(original_zones, updated_zones):
    """
    Merge zones intelligently:
    - Preserve structure of existing zones that appear in both original and updated
    - Add new zones with normalized structure
    - Remove zones that are in original but not in updated
    """
    result_zones = []
    
    # Create a mapping of zone_id to zone for quick lookup
    original_zone_map = {str(z.get('zone_id')): z for z in original_zones}
    updated_zone_map = {str(z.get('zone_id')): z for z in updated_zones}
    
    # Process all zones from updated data (maintains order from frontend)
    for updated_zone in updated_zones:
        zone_id = str(updated_zone.get('zone_id'))
        
        if zone_id in original_zone_map:
            # Existing zone - preserve structure and merge updates
            original_zone = original_zone_map[zone_id]
            merged_zone = merge_zone_with_structure(original_zone, updated_zone)
            result_zones.append(merged_zone)
        else:
            # New zone - normalize structure
            normalized_zone = normalize_zone(updated_zone)
            result_zones.append(normalized_zone)
    
    return result_zones

def merge_zone_with_structure(original_zone, updated_zone):
    """Merge a single zone while preserving structure."""
    result = OrderedDict()
    zone_order = ['zone_id', 'zone_name', 'zone_description', 'groups']
    
    # Process in the correct order
    for key in zone_order:
        if key in updated_zone:
            if key == 'groups':
                # Merge groups intelligently
                result[key] = merge_groups_with_structure_preservation(
                    original_zone.get('groups', []),
                    updated_zone.get('groups', [])
                )
            else:
                result[key] = updated_zone[key]
        elif key in original_zone:
            result[key] = original_zone[key]
    
    # Add any remaining keys from either zone
    for key in set(list(original_zone.keys()) + list(updated_zone.keys())):
        if key not in result:
            result[key] = updated_zone.get(key, original_zone.get(key))
    
    return result

def merge_groups_with_structure_preservation(original_groups, updated_groups):
    """Merge groups while preserving structure of existing ones and normalizing new ones."""
    result_groups = []
    
    original_group_map = {str(g.get('group_id')): g for g in original_groups}
    
    for updated_group in updated_groups:
        group_id = str(updated_group.get('group_id'))
        
        if group_id in original_group_map:
            # Existing group - preserve structure
            original_group = original_group_map[group_id]
            merged_group = merge_group_with_structure(original_group, updated_group)
            result_groups.append(merged_group)
        else:
            # New group - normalize
            result_groups.append(normalize_group(updated_group))
    
    return result_groups

def merge_group_with_structure(original_group, updated_group):
    """Merge a single group while preserving structure."""
    result = OrderedDict()
    group_order = ['group_id', 'group_name', 'group_description', 'location']
    
    for key in group_order:
        if key in updated_group:
            if key == 'location':
                # Merge locations intelligently
                result[key] = merge_locations_with_structure_preservation(
                    original_group.get('location', []),
                    updated_group.get('location', [])
                )
            else:
                result[key] = updated_group[key]
        elif key in original_group:
            result[key] = original_group[key]
    
    for key in set(list(original_group.keys()) + list(updated_group.keys())):
        if key not in result:
            result[key] = updated_group.get(key, original_group.get(key))
    
    return result

def merge_locations_with_structure_preservation(original_locations, updated_locations):
    """Merge locations while preserving structure of existing ones."""
    result_locations = []
    
    original_location_map = {str(loc.get('location_id')): loc for loc in original_locations}
    
    for updated_location in updated_locations:
        location_id = str(updated_location.get('location_id'))
        
        if location_id in original_location_map:
            original_location = original_location_map[location_id]
            merged_location = merge_location_with_structure(original_location, updated_location)
            result_locations.append(merged_location)
        else:
            result_locations.append(normalize_location(updated_location))
    
    return result_locations

def merge_location_with_structure(original_location, updated_location):
    """Merge a single location while preserving structure."""
    result = OrderedDict()
    location_order = ['location_id', 'location_name', 'location_description', 'device']
    
    for key in location_order:
        if key in updated_location:
            if key == 'device':
                # Devices can be merged similarly
                result[key] = [normalize_device(dev) for dev in updated_location.get('device', [])]
            else:
                result[key] = updated_location[key]
        elif key in original_location:
            result[key] = original_location[key]
    
    for key in set(list(original_location.keys()) + list(updated_location.keys())):
        if key not in result:
            result[key] = updated_location.get(key, original_location.get(key))
    
    return result

def create_app():
    """
    Create and configure the Flask application.

    - API-only: do NOT serve frontend HTML or static frontend assets here.
    - Enables CORS for dev convenience.
    - Tries to register common API blueprints if present.
    """
    # API-only backend (no static folder)
    app = Flask(__name__, static_folder=None)
    # record start time for uptime reporting
    app.start_time = time.time()

    # Load config if present
    try:
        from .config import Config
        app.config.from_object(Config)
        logger.info("Loaded app config from app.config.Config")
    except Exception:
        logger.debug("No app.config.Config found; using default Flask config")

    # Enable CORS for frontend dev usage (restrict in production via FRONTEND_ORIGIN env)
    frontend_origin = os.environ.get('FRONTEND_ORIGIN')
    if frontend_origin:
        CORS(app, origins=[frontend_origin])
    else:
        CORS(app)

    # Register existing API modules (handles all blueprints automatically)
    api_modules = [
        'app.api.zones',
        'app.api.groups',
        'app.api.locations',
        'app.api.devices',
        'app.api.hierarchy',
        'app.api.wled',
    ]
    for mod in api_modules:
        _register_blueprint_if_exists(app, mod)

    # Kick off a background refresh of all device states so the frontend
    # receives accurate online/offline information immediately after startup.
    try:
        from .utils.device_manager import device_manager
        import threading

        def _refresh_states_background():
            try:
                app.logger.info('Background: refreshing all device states')
                device_manager.get_all_device_states()
                app.logger.info('Background: device state refresh complete')
            except Exception:
                app.logger.exception('Background device state refresh failed')

        t = threading.Thread(target=_refresh_states_background, daemon=True)
        t.start()
    except Exception:
        logger.exception('Failed to start background device state refresh')

    # Respond to Chrome DevTools probe to avoid noisy 404 logs (optional, harmless)
    @app.route('/.well-known/appspecific/com.chrome.devtools.json')
    def chrome_devtools_probe():
        return ('', 204)

    # Serve the authoritative network_devices.json from the backend data folder
    @app.route('/data/network_devices.json', methods=['GET'])
    def serve_network_devices():
        data_path = os.path.join(os.path.dirname(__file__), 'data', 'network_devices.json')
        if os.path.exists(data_path):
            return send_from_directory(os.path.dirname(data_path), os.path.basename(data_path))
        abort(404)

    # Enhanced /api/hierarchy endpoint with smart structure preservation
    @app.route('/api/hierarchy', methods=['GET', 'PUT', 'POST'])
    def api_hierarchy():
        data_path = os.path.join(os.path.dirname(__file__), 'data', 'network_devices.json')
        
        if request.method == 'GET':
            if not os.path.exists(data_path):
                app.logger.warning("Hierarchy file not found: %s", data_path)
                return jsonify({"zones": []}), 200
            try:
                with open(data_path, 'r', encoding='utf-8') as fh:
                    payload = json.load(fh, object_pairs_hook=OrderedDict)
                return jsonify(payload)
            except Exception as e:
                app.logger.exception("Failed to read hierarchy file: %s", e)
                return jsonify({"error": "failed to read hierarchy"}), 500

        # Handle PUT or POST to persist updated hierarchy with smart structure preservation
        try:
            updated_payload = request.get_json(force=True)
            
            # Load the original file to preserve structure where appropriate
            original_payload = {"zones": []}
            if os.path.exists(data_path):
                try:
                    with open(data_path, 'r', encoding='utf-8') as fh:
                        original_payload = json.load(fh, object_pairs_hook=OrderedDict)
                except Exception as e:
                    app.logger.warning("Could not load original file for structure preservation: %s", e)
            
            # Smart merge: preserve structure for existing items, normalize new items
            final_payload = OrderedDict()
            
            if 'zones' in updated_payload:
                original_zones = original_payload.get('zones', [])
                updated_zones = updated_payload.get('zones', [])
                
                final_payload['zones'] = merge_zones_with_structure_preservation(
                    original_zones, 
                    updated_zones
                )
            else:
                # If no zones key, just normalize the whole thing
                final_payload = normalize_structure_order(updated_payload)
            
            # Add any other top-level keys from updated payload
            for key in updated_payload:
                if key not in final_payload:
                    final_payload[key] = updated_payload[key]

            # Write the final payload while preserving order
            with open(data_path, 'w', encoding='utf-8') as fh:
                json.dump(final_payload, fh, indent=2, ensure_ascii=False, separators=(',', ': '))
            
            app.logger.info("Successfully updated hierarchy file with smart structure preservation")
            return jsonify({"status": "ok", "message": "Hierarchy updated successfully"}), 200
            
        except Exception as e:
            app.logger.exception("Failed to write hierarchy file: %s", e)
            return jsonify({"error": str(e)}), 500

    @app.route('/', methods=['GET'])
    def root():
        # Simple human-readable page to confirm the API backend is up.
        html = (
            "<!doctype html><html><head><meta charset='utf-8'><title>Backend</title>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            "</head><body style='font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;'>"
            "<h1>Backend server is running smoothly</h1>"
            "<p>The backend is up and serving API endpoints:</p>" 
            "<p>Run the frontend separately at <code>http://127.0.0.1:5500/pages/index.html</code></p>"
            "<p><strong>Enhanced with smart JSON structure preservation for add/delete operations!</strong></p>"
            "</body></html>"
        )
        return html, 200

    @app.route('/api/health', methods=['GET'])
    def api_health():
        """
        Simple health endpoint for frontend or monitoring to confirm backend is running.
        Returns JSON: { status: "ok" | "error", uptime: seconds, message: str }
        """
        try:
            uptime = int(time.time() - getattr(app, 'start_time', time.time()))
            return jsonify({
                "status": "ok",
                "uptime_seconds": uptime,
                "message": "Backend server running with smart structure preservation"
            }), 200
        except Exception as e:
            app.logger.exception("Health check failed: %s", e)
            return jsonify({"status": "error", "message": "Health check failed"}), 500

    return app