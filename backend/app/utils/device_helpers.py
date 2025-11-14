from .file_helpers import load_available_devices, load_hierarchy

def find_device_by_mac(mac_address):
    devices_data = load_available_devices()
    for device in devices_data['available_devices']:
        if device['mac_address'] == mac_address:
            return device
    return None

def get_assigned_devices():
    hierarchy = load_hierarchy()
    assigned_devices = []

    for zone in hierarchy['zones']:
        for group in zone['groups']:
            for location in group['location']:
                if location['assigned_device_mac']:
                    device = find_device_by_mac(location['assigned_device_mac'])
                    if device:
                        device_info = device.copy()
                        device_info['zone_name'] = zone['name']
                        device_info['group_name'] = group['name']
                        device_info['location_name'] = location['name']
                        device_info['location_id'] = location['id']
                        assigned_devices.append(device_info)

    return assigned_devices
