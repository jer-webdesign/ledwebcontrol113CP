import os
import json

# Path to the data folder (sits alongside "app/")
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
JSON_FILENAME = "network_devices.json"

# Make sure the data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def _get_path(filename: str) -> str:
    return os.path.join(DATA_DIR, filename)

# def load_hierarchy():
#     path = _get_path(JSON_FILENAME)
#     if os.path.exists(path):
#         with open(path, "r") as f:
#             return json.load(f)
#     return {"zones": []}

# def save_hierarchy(hierarchy):
#     path = _get_path(JSON_FILENAME)
#     with open(path, "w") as f:
#         json.dump(hierarchy, f, indent=4)

def load_network_devices():
    path = _get_path(JSON_FILENAME)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {"zones": []}

def save_network_devices(devices_data):
    path = _get_path(JSON_FILENAME)
    _atomic_write_json(path, devices_data)


def load_json_file(path: str):
    """Load JSON file from the given path and return the data."""
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json_file(path: str, data):
    """Save data as JSON to the given path."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Compatibility layer: convert network_devices.json into the shapes used by the
# rest of the application (hierarchy.json and available_devices.json formats).
def load_hierarchy():
    """Return hierarchy in the shape: {"zones": [ {id,name,description,groups:[{id,name,description,locations:[{id,name,description,assigned_device_mac}]}]} ]}
    This converts the network_devices.json structure into the expected hierarchy.
    """
    net = load_network_devices()
    out = {"zones": []}
    for z in net.get("zones", []):
        zone = {
            "id": z.get("zone_id"),
            "name": z.get("zone_name"),
            "description": z.get("zone_description", ""),
            "groups": []
        }
        for g in z.get("groups", []):
            group = {
                "id": g.get("group_id"),
                "name": g.get("group_name"),
                "description": g.get("group_description", ""),
                "location": []
            }
            for l in g.get("location", []):
                # If the network file contains devices within this location, treat
                # the first device's mac as the assigned_device_mac for the location.
                first_dev = None
                devs = l.get("device_id", []) or []
                if len(devs) > 0:
                    first_dev = devs[0]

                loc = {
                    "id": l.get("location_id"),
                    "name": l.get("location_name"),
                    "description": l.get("location_description", ""),
                    # preserve the original device objects array so callers that
                    # expect the `device_id` list can access full device data
                    "device_id": devs,
                    "assigned_device_mac": first_dev.get("device_mac") if first_dev else None
                }
                group["location"].append(loc)
            zone["groups"].append(group)
        out["zones"].append(zone)
    return out


def save_hierarchy(hierarchy):
    """Persist hierarchy edits back into network_devices.json.

    This will merge the provided `hierarchy` (zones/groups/locations)
    into the existing network file while preserving device lists for
    locations unless the hierarchy contains its own `device_id` array.
    """
    net = load_network_devices()

    new_net = {"zones": []}
    # index existing device lists by (zone_id, group_id, location_id)
    existing_map = {}
    for z in net.get("zones", []):
        for g in z.get("groups", []):
            for l in g.get("location", []):
                key = (z.get("zone_id"), g.get("group_id"), l.get("location_id"))
                existing_map[key] = l.get("device_id", []) or []

    for z in hierarchy.get("zones", []):
        zone_obj = {
            "zone_id": z.get("id"),
            "zone_name": z.get("name"),
            "zone_description": z.get("description", ""),
            "groups": []
        }
        for g in z.get("groups", []):
            group_obj = {
                "group_id": g.get("id"),
                "group_name": g.get("name"),
                "group_description": g.get("description", ""),
                "location": []
            }
            for l in g.get("location", []):
                # If caller supplied device_id list in the hierarchy, use it.
                supplied_devs = l.get("device")
                if supplied_devs is not None:
                    devices_for_loc = supplied_devs
                else:
                    # fall back to whatever was present in the network file
                    devices_for_loc = existing_map.get((z.get("id"), g.get("id"), l.get("id")), [])

                loc_obj = {
                    "location_id": l.get("id"),
                    "location_name": l.get("name"),
                    "location_description": l.get("description", ""),
                    "device": devices_for_loc
                }
                group_obj["location"].append(loc_obj)
            zone_obj["groups"].append(group_obj)
        new_net["zones"].append(zone_obj)

    save_network_devices(new_net)


def load_available_devices():
    """Return available devices in the shape: {"available_devices": [ ... ]}
    This converts devices found in network_devices.json into the canonical
    available_devices format expected by the API.
    """
    net = load_network_devices()
    devices = []
    for z in net.get("zones", []):
        for g in z.get("groups", []):
            for l in g.get("location", []):
                for d in l.get("device", []) or []:
                    dev = {
                        # map the network file keys to API keys used elsewhere
                        "id": d.get("device_id"),
                        "name": d.get("device_name"),
                        "mac_address": d.get("device_mac"),
                        "ip_address": d.get("device_ip"),
                        "description": d.get("device_description", ""),
                        "hostname": d.get("device_hostname", ""),
                        "current_color": d.get("device_current_color", None),
                        "segment_colors": d.get("device_segment_colors", []),
                        # record where this device was found in the network file
                        "assigned_to_location": {
                            "zone_id": z.get("zone_id"),
                            "group_id": g.get("group_id"),
                            "location_id": l.get("location_id")
                        }
                    }
                    devices.append(dev)
    return {"available_devices": devices}


def save_available_devices(devices_data):
    """Persist available devices into `network_devices.json`.

    `devices_data` can be either a dict with key `available_devices` or a list.
    Devices are placed into locations according to their
    `assigned_to_location` property. Unassigned devices are placed into a
    special zone/group/location with ids 0 (zone_id=0, group_id=0, location_id=0).
    """
    # normalize input
    if isinstance(devices_data, dict):
        devices = devices_data.get("available_devices", [])
    else:
        devices = devices_data or []

    net = load_network_devices()

    # Build a mapping for quick location lookup in net
    loc_map = {}
    for z in net.get("zones", []):
        for g in z.get("groups", []):
            for l in g.get("location", []):
                key = (z.get("zone_id"), g.get("group_id"), l.get("location_id"))
                # initialize device list if missing
                l.setdefault("device", [])
                loc_map[key] = l

    # ensure an 'unassigned' container exists (zone 0/group 0/location 0)
    unassigned_key = (0, 0, 0)
    if unassigned_key not in loc_map:
        # create if missing
        # try to reuse existing zone 0 or append new
        un_zone = next((z for z in net.get("zones", []) if z.get("zone_id") == 0), None)
        if not un_zone:
            un_zone = {"zone_id": 0, "zone_name": "Unassigned", "zone_description": "", "groups": []}
            net.setdefault("zones", []).append(un_zone)
        un_group = next((g for g in un_zone.get("groups", []) if g.get("group_id") == 0), None)
        if not un_group:
            un_group = {"group_id": 0, "group_name": "Unassigned", "group_description": "", "location": []}
            un_zone.setdefault("groups", []).append(un_group)
        un_loc = {"location_id": 0, "location_name": "Unassigned", "location_description": "", "device": []}
        un_group.setdefault("locations", []).append(un_loc)
        loc_map[unassigned_key] = un_loc

    # Clear all existing device lists so we can repopulate from devices_data
    for loc in loc_map.values():
        loc["device"] = []

    def _to_network_device(d):
        # convert available-device shape to network device object
        return {
            "device_id": d.get("id"),
            "device_name": d.get("name"),
            "device_mac": d.get("mac_address"),
            "device_description": d.get("description", ""),
            "device_hostname": d.get("hostname", ""),
            "device_current_color": d.get("current_color", None),
            "device_segment_colors": d.get("segment_colors", []) or [],
            "device_ip": d.get("ip_address")
        }

    for d in devices:
        assigned = d.get("assigned_to_location") or {}
        key = (assigned.get("zone_id", 0), assigned.get("group_id", 0), assigned.get("location_id", 0))
        loc = loc_map.get(key, loc_map[unassigned_key])
        loc.setdefault("device", []).append(_to_network_device(d))

    # Finally, write merged network file
    save_network_devices(net)

# Legacy wrappers (still used by some routes)
def load_devices():
    # legacy wrapper used by some routes: returns a list of device dicts
    data = load_available_devices()
    return data.get("available_devices", [])


def save_devices(devices):
    # legacy wrapper: accept a list of device dicts and persist to available_devices.json
    devices_data = {"available_devices": devices}
    save_available_devices(devices_data)


# --- Atomic write + simple lock helpers ---
import time

def _acquire_lock(lock_path: str, timeout: float = 5.0) -> bool:
    """Acquire a simple lock by creating a lock file. Returns True if acquired.
    This is a cooperative, filesystem-based lock intended for simple single-host
    usage. It will wait up to `timeout` seconds before giving up.
    """
    start = time.time()
    while True:
        try:
            # Use os.O_EXCL to ensure atomic creation
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
            return True
        except FileExistsError:
            if (time.time() - start) >= timeout:
                return False
            time.sleep(0.05)


def _release_lock(lock_path: str) -> None:
    try:
        if os.path.exists(lock_path):
            os.remove(lock_path)
    except Exception:
        # best-effort
        pass


def _atomic_write_json(path: str, data, lock_timeout: float = 5.0) -> None:
    """Write JSON to `path` atomically using a temp file and os.replace.
    Uses a per-target lock file to avoid concurrent writers colliding.
    """
    dirpath = os.path.dirname(path)
    basename = os.path.basename(path)
    lock_path = os.path.join(dirpath, f".{basename}.lock")
    tmp_path = os.path.join(dirpath, f".{basename}.tmp")

    acquired = _acquire_lock(lock_path, timeout=lock_timeout)
    if not acquired:
        raise RuntimeError(f"Could not acquire lock for writing {path}")

    try:
        # Write to temp file first
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
            f.flush()
            os.fsync(f.fileno())

        # Atomically replace target
        os.replace(tmp_path, path)
    finally:
        # cleanup lock even on exceptions
        _release_lock(lock_path)

