"""
ESP32 Communication Test Script

This script demonstrates the communication flow:
1. Backend reads network_devices.json
2. Finds ESP32's IP address
3. Makes HTTP request to ESP32
4. ESP32 responds with current state
5. Backend can send control commands
"""

import sys
import json
from pathlib import Path

# Add the app directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent))

from app.utils.device_manager import device_manager
from app.utils.esp32_client import esp32_client

def main():
    print("ESP32 Communication Test")
    print("=" * 40)
    
    # Step 1: Load devices from network_devices.json
    print("\n1. Loading devices from network_devices.json...")
    device_manager.load_devices()
    
    device_ips = device_manager.get_all_device_ips()
    print(f"Found {len(device_ips)} devices:")
    for device_id, ip in device_ips.items():
        print(f"  - {device_id}: {ip}")
    
    if not device_ips:
        print("\nNo devices found in network_devices.json")
        print("Please add some devices first or run device discovery.")
        return
    
    # Step 2: Test connectivity to all devices
    print("\n2. Testing connectivity to all devices...")
    ping_results = device_manager.ping_all_devices()
    
    online_devices = []
    for device_id, is_online in ping_results.items():
        status = "ONLINE" if is_online else "OFFLINE"
        print(f"  - {device_id}: {status}")
        if is_online:
            online_devices.append(device_id)
    
    if not online_devices:
        print("\nNo devices are currently online.")
        print("Please check your ESP32 devices and network connectivity.")
        return
    
    # Step 3: Get states from online devices
    print(f"\n3. Getting states from {len(online_devices)} online devices...")
    states = device_manager.get_all_device_states()
    
    for device_id in online_devices:
        state = states.get(device_id)
        if state:
            print(f"\n  Device {device_id} state:")
            print(f"    Power: {'ON' if state.get('on', False) else 'OFF'}")
            print(f"    Brightness: {state.get('bri', 0)}/255")
            
            # Get color information if available
            seg = state.get('seg', [])
            if seg and len(seg) > 0:
                colors = seg[0].get('col', [])
                if colors and len(colors) > 0:
                    color = colors[0]
                    if len(color) >= 3:
                        print(f"    Color: RGB({color[0]}, {color[1]}, {color[2]})")
        else:
            print(f"  Device {device_id}: Failed to get state")
    
    # Step 4: Test device control (optional)
    if online_devices:
        test_device = online_devices[0]
        print(f"\n4. Testing device control on {test_device}...")
        
        # Test brightness control
        print(f"  Setting brightness to 128...")
        result = device_manager.set_device_brightness(test_device, 128)
        if result:
            print("    ✓ Brightness set successfully")
        else:
            print("    ✗ Failed to set brightness")
        
        # Test color control
        print(f"  Setting color to red...")
        result = device_manager.set_device_color(test_device, 255, 0, 0)  # Red
        if result:
            print("    ✓ Color set successfully")
        else:
            print("    ✗ Failed to set color")
        
        # Get updated state
        print(f"  Getting updated state...")
        updated_state = device_manager.get_device_state(test_device)
        if updated_state:
            print("    ✓ Successfully retrieved updated state")
            print(f"    New brightness: {updated_state.get('bri', 0)}/255")
        else:
            print("    ✗ Failed to get updated state")
    
    # Step 5: System health check
    print("\n5. System health check...")
    from app.utils.esp32_errors import get_system_health
    health = get_system_health()
    
    print(f"  Overall status: {health['status'].upper()}")
    print(f"  Connectivity ratio: {health['connectivity_ratio']:.1%}")
    print(f"  Total devices: {health['total_devices']}")
    print(f"  Online devices: {health['online_devices']}")
    print(f"  Offline devices: {health['offline_devices']}")
    
    print("\n" + "=" * 40)
    print("ESP32 Communication Test Complete!")

if __name__ == "__main__":
    main()