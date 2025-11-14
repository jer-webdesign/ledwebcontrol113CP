"""
Device Manager
Handles device communication by reading network_devices.json and managing ESP32 connections
"""

import json
import logging
import time
from typing import Dict, List, Optional, Any
from pathlib import Path
from .esp32_client import esp32_client
from .file_helpers import load_json_file, save_json_file

logger = logging.getLogger(__name__)

class DeviceManager:
    """Manages ESP32 device communication using network_devices.json"""
    
    def __init__(self, devices_file: str = None):
        """
        Initialize device manager
        
        Args:
            devices_file: Path to network_devices.json file
        """
        if devices_file is None:
            # Default to the data directory
            base_dir = Path(__file__).parent.parent
            self.devices_file = base_dir / "data" / "network_devices.json"
        else:
            self.devices_file = Path(devices_file)
        
        self.devices_data = {}
        self.load_devices()
    
    def load_devices(self) -> bool:
        """
        Load device configuration from network_devices.json and flatten to device_id -> device_data dict
        Returns:
            True if successful, False otherwise
        """
        try:
            raw_data = load_json_file(str(self.devices_file))
            if not raw_data or 'zones' not in raw_data:
                logger.warning(f"No device data found in {self.devices_file}")
                self.devices_data = {}
                return False

            flat_devices = {}
            for zone in raw_data.get('zones', []):
                for group in zone.get('groups', []):
                    for location in group.get('location', []):
                        for device in location.get('device', []) or []:
                            device_id = device.get('device_id')
                            # Use integer device_id for consistency
                            if isinstance(device_id, str):
                                try:
                                    device_id = int(device_id)
                                except Exception:
                                    pass
                            device_copy = dict(device)
                            device_copy['zone_id'] = zone.get('zone_id')
                            device_copy['group_id'] = group.get('group_id')
                            device_copy['location_id'] = location.get('location_id')
                            flat_devices[device_id] = device_copy
            self.devices_data = flat_devices
            logger.info(f"Loaded {len(self.devices_data)} devices from {self.devices_file}")
            return True
        except Exception as e:
            logger.error(f"Error loading devices from {self.devices_file}: {e}")
            self.devices_data = {}
            return False
    
    def save_devices(self) -> bool:
        """
        Save device configuration to network_devices.json
        
        Returns:
            True if successful, False otherwise
        """
        try:
            save_json_file(str(self.devices_file), self.devices_data)
            logger.info(f"Saved device data to {self.devices_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving devices to {self.devices_file}: {e}")
            return False
    
    def get_device_ip(self, device_id: str) -> Optional[str]:
        """
        Get IP address for a device
        
        Args:
            device_id: Device identifier
        Returns:
            IP address string or None if not found
        """
        try:
            device_id_int = int(device_id)
        except Exception:
            device_id_int = device_id
        device = self.devices_data.get(device_id_int)
        if device:
            return device.get('device_ip')
        return None
    
    def get_all_device_ips(self) -> Dict[str, str]:
        """
        Get all device IPs
        Returns:
            Dictionary mapping device_id to IP address
        """
        device_ips = {}
        for device_id, device_data in self.devices_data.items():
            ip = device_data.get('device_ip')
            if ip:
                device_ips[device_id] = ip
        return device_ips
    
    def get_device_state(self, device_id: str) -> Optional[Dict]:
        """
        Get current state from a specific ESP32 device
        
        Args:
            device_id: Device identifier
            
        Returns:
            Device state data or None if failed
        """
        # Remove stray indentation and duplicate try statement
        try:
            device_id_int = int(device_id)
        except Exception:
            device_id_int = device_id
        ip_address = self.get_device_ip(device_id_int)
        if not ip_address:
            logger.error(f"No IP address found for device {device_id}")
            return None
        logger.info(f"Getting state for device {device_id} at {ip_address}")
        state = esp32_client.get_device_state(ip_address)
        if state:
            # Update last seen timestamp
            if device_id_int in self.devices_data:
                self.devices_data[device_id_int]['last_seen'] = int(time.time())
                self.devices_data[device_id_int]['status'] = 'online'
        else:
            # Mark as offline if we can't reach it
            if device_id_int in self.devices_data:
                self.devices_data[device_id_int]['status'] = 'offline'
        return state
    
    def get_all_device_states(self) -> Dict[str, Dict]:
        """
        Get states from all devices concurrently
        
        Returns:
            Dictionary mapping device_id to state data
        """
        device_ips = self.get_all_device_ips()
        if not device_ips:
            logger.warning("No devices with IP addresses found")
            return {}
        
        logger.info(f"Getting states for {len(device_ips)} devices")
        
        # Get states using concurrent requests
        ip_to_states = esp32_client.get_multiple_device_states(list(device_ips.values()))
        
        # Map back to device IDs
        device_states = {}
        import time
        current_time = int(time.time())
        
        for device_id, ip_address in device_ips.items():
            state = ip_to_states.get(ip_address)
            device_states[device_id] = state
            
            # Update device status and last seen
            if device_id in self.devices_data:
                if state:
                    self.devices_data[device_id]['last_seen'] = current_time
                    self.devices_data[device_id]['status'] = 'online'
                else:
                    self.devices_data[device_id]['status'] = 'offline'
        
        return device_states
    
    def set_device_state(self, device_id: str, state_data: Dict) -> Optional[Dict]:
        """
        Set state on a specific ESP32 device
        
        Args:
            device_id: Device identifier
            state_data: State configuration to apply
            
        Returns:
            Response data or None if failed
        """
        try:
            device_id_int = int(device_id)
        except Exception:
            device_id_int = device_id
        ip_address = self.get_device_ip(device_id_int)
        if not ip_address:
            logger.error(f"No IP address found for device {device_id}")
            return None
        logger.info(f"Setting state for device {device_id} at {ip_address}: {state_data}")
        return esp32_client.set_device_state(ip_address, state_data)
    
    def set_device_brightness(self, device_id: str, brightness: int) -> Optional[Dict]:
        """
        Set brightness for a specific device
        
        Args:
            device_id: Device identifier
            brightness: Brightness level (0-255)
            
        Returns:
            Response data or None if failed
        """
        ip_address = self.get_device_ip(device_id)
        if not ip_address:
            logger.error(f"No IP address found for device {device_id}")
            return None
        
        logger.info(f"Setting brightness for device {device_id} to {brightness}")
        return esp32_client.set_brightness(ip_address, brightness)
    
    def set_device_power(self, device_id: str, on: bool) -> Optional[Dict]:
        """
        Turn device on or off
        
        Args:
            device_id: Device identifier
            on: True to turn on, False to turn off
            
        Returns:
            Response data or None if failed
        """
        ip_address = self.get_device_ip(device_id) 
        if not ip_address:
            logger.error(f"No IP address found for device {device_id}")
            return None

        logger.info(f"Setting power for device {device_id} to {'ON' if on else 'OFF'}")
        result = esp32_client.set_power(ip_address, on)

        # If turning on, attempt to apply stored color/segment configuration
        if on and result is not None:
            try:
                # Normalize device id for lookup
                try:
                    device_id_int = int(device_id)
                except Exception:
                    device_id_int = device_id

                dev = self.devices_data.get(device_id_int) or {}

                seg_colors = dev.get('device_segment_colors') or []
                curr_color = dev.get('device_current_color')

                def _hex_to_rgb(hex_str):
                    if not hex_str or not isinstance(hex_str, str):
                        return None
                    s = hex_str.strip().lstrip('#')
                    if len(s) == 3:
                        s = ''.join([c*2 for c in s])
                    if len(s) != 6:
                        return None
                    try:
                        r = int(s[0:2], 16)
                        g = int(s[2:4], 16)
                        b = int(s[4:6], 16)
                        return [r, g, b]
                    except Exception:
                        return None

                # New logic: read segment mapping from network_devices.json if present
                try:
                    device_state = esp32_client.get_device_state(ip_address) or {}
                    state_root = device_state.get('state') if isinstance(device_state.get('state'), dict) else device_state
                    total_leds = None
                    # 1. Try info.leds.count (WLED standard)
                    info = device_state.get('info') or state_root.get('info') or {}
                    if isinstance(info, dict) and isinstance(info.get('leds'), dict):
                        total_leds = info['leds'].get('count') or info['leds'].get('led_count')
                    if not total_leds and isinstance(info, dict):
                        total_leds = info.get('leds') or info.get('led_count') or info.get('count')
                    # 2. Try seg 'len' sum
                    if not total_leds and isinstance(state_root.get('seg'), list) and any('len' in s for s in state_root.get('seg')):
                        total_leds = sum((s.get('len') or 0) for s in state_root.get('seg'))
                    # 3. Try top-level fields
                    if not total_leds:
                        top_len = state_root.get('leds') or state_root.get('length') or None
                        if isinstance(top_len, int) and top_len > 0:
                            total_leds = top_len

                    # Check for device_segment_mapping in device config
                    seg_mapping = dev.get('device_segment_mapping')
                    seg_updates = []
                    logger.info(f"Device {device_id}: Detected total_leds={total_leds}, seg_colors={seg_colors}, curr_color={curr_color}")
                    if not seg_mapping:
                        # Generate a sensible, non-overlapping mapping.
                        # Cases:
                        # - If no saved segment colors but we have a current color: set a single segment covering the whole strip.
                        # - If saved segment colors exist: map LED0->color0, LED1->color1, LEDs 2..N->current color (if present) or color1.
                        led_count = total_leds if total_leds and total_leds > 0 else 60
                        # If the saved segment colors list is longer than the detected
                        # LED count (device may be misconfigured or reporting low),
                        # prefer the saved length so we don't silently truncate user data.
                        try:
                            if isinstance(seg_colors, list) and len(seg_colors) > led_count:
                                logger.info(f"Device {device_id}: increasing led_count from {led_count} to {len(seg_colors)} to accommodate saved segment colors")
                                led_count = len(seg_colors)
                        except Exception:
                            pass
                        seg_mapping = []
                        color0 = seg_colors[0] if len(seg_colors) > 0 else None
                        color1 = seg_colors[1] if len(seg_colors) > 1 else None
                        color_rest = curr_color if curr_color else (color1 or color0)

                        if not seg_colors and curr_color:
                            # No per-segment saved colors — set entire strip to current color
                            # Use exclusive stop semantics: stop is one past the last index
                            seg_mapping.append({"color": color_rest, "start": 0, "stop": led_count})
                        else:
                            # Create one-LED segments for each saved segment color (up to led_count)
                            for idx, col in enumerate(seg_colors):
                                if idx >= led_count:
                                    break
                                seg_mapping.append({"color": col, "start": idx, "stop": idx + 1})
                            # If there are remaining LEDs, assign them the "rest" color
                            if led_count > len(seg_colors) and color_rest:
                                seg_mapping.append({"color": color_rest, "start": len(seg_colors), "stop": led_count})

                        logger.info(f"Auto-generated seg_mapping for device {device_id}: {seg_mapping}")

                    if isinstance(seg_mapping, list) and len(seg_mapping) > 0:
                        # Each entry: {"start": int, "stop": int, "color": "#hex"}
                        for entry in seg_mapping:
                            start = entry.get('start')
                            stop_exclusive = entry.get('stop')
                            color_hex = entry.get('color')
                            rgb = _hex_to_rgb(color_hex)
                            # Stored 'stop' values are exclusive (one-past-end). Send them unchanged to the device
                            try:
                                if stop_exclusive is None:
                                    raise ValueError('stop is None')
                                stop_to_send = int(stop_exclusive)
                            except Exception:
                                logger.warning(f"Device {device_id}: Invalid stop value in segment mapping: {stop_exclusive}")
                                continue

                            logger.info(f"Device {device_id}: Segment entry (stored exclusive): start={start}, stop_exclusive={stop_exclusive}, sending_stop={stop_to_send}, color={color_hex}, rgb={rgb}")
                            # Only add valid ranges where start < stop (exclusive end)
                            try:
                                if rgb is not None and start is not None and isinstance(start, (int, str)):
                                    start_int = int(start)
                                    if start_int < stop_to_send:
                                        seg_updates.append({'start': start_int, 'stop': stop_to_send, 'col': [[rgb[0], rgb[1], rgb[2]]]})
                                    else:
                                        logger.warning(f"Device {device_id}: Skipping segment with start >= stop: start={start_int} stop={stop_to_send}")
                                else:
                                    logger.warning(f"Device {device_id}: Skipping invalid segment entry start={start} stop={stop_exclusive} rgb={rgb}")
                            except Exception:
                                logger.exception(f"Device {device_id}: Error processing segment entry start={start} stop={stop_exclusive} color={color_hex}")

                    if seg_updates:
                        # Include brightness (default 128) along with the segments
                        # and request the device to persist the settings (psave=1)
                        bri = dev.get('device_brightness') if isinstance(dev.get('device_brightness'), int) else 128
                        state_data = {'on': True, 'bri': int(bri), 'seg': seg_updates, 'psave': 1}
                        logger.info(f"Sending segment payload to device {device_id} at {ip_address}: {state_data}")
                        try:
                            resp = esp32_client.set_device_state(ip_address, state_data)
                            logger.info(f"Device {device_id}: set_device_state response: {resp}")
                        except Exception:
                            logger.exception(f"Failed to apply precise segment colors to device {device_id} at {ip_address}")
                except Exception:
                    logger.exception(f"Failed to query device state to apply segment colors for {device_id}")
            except Exception:
                logger.exception(f"Error while applying stored colors for device {device_id}")

        return result

    def apply_saved_state(self, device_id: str) -> Optional[Dict]:
        """
        Read the saved device info from network_devices.json (reloads file) and
        apply the saved segment/colors to the physical device by sending the
        appropriate WLED JSON payload. This does NOT toggle power; it only
        attempts to set the state (segments/brightness) as configured.

        Returns the response from esp32_client.set_device_state or None on failure.
        """
        # Ensure we have the latest data from disk
        try:
            self.load_devices()
        except Exception:
            logger.exception("Failed to reload devices file before applying saved state")

        try:
            try:
                device_id_int = int(device_id)
            except Exception:
                device_id_int = device_id

            dev = self.devices_data.get(device_id_int) or {}
            ip_address = self.get_device_ip(device_id_int)
            if not ip_address:
                logger.error(f"No IP address found for device {device_id}")
                return None

            seg_colors = dev.get('device_segment_colors') or []
            curr_color = dev.get('device_current_color')

            def _hex_to_rgb(hex_str):
                if not hex_str or not isinstance(hex_str, str):
                    return None
                s = hex_str.strip().lstrip('#')
                if len(s) == 3:
                    s = ''.join([c*2 for c in s])
                if len(s) != 6:
                    return None
                try:
                    r = int(s[0:2], 16)
                    g = int(s[2:4], 16)
                    b = int(s[4:6], 16)
                    return [r, g, b]
                except Exception:
                    return None

            # Query device for LED count / state where possible
            try:
                device_state = esp32_client.get_device_state(ip_address) or {}
                state_root = device_state.get('state') if isinstance(device_state.get('state'), dict) else device_state
                total_leds = None
                info = device_state.get('info') or state_root.get('info') or {}
                if isinstance(info, dict) and isinstance(info.get('leds'), dict):
                    total_leds = info['leds'].get('count') or info['leds'].get('led_count')
                if not total_leds and isinstance(info, dict):
                    total_leds = info.get('leds') or info.get('led_count') or info.get('count')
                if not total_leds and isinstance(state_root.get('seg'), list) and any('len' in s for s in state_root.get('seg')):
                    total_leds = sum((s.get('len') or 0) for s in state_root.get('seg'))
                if not total_leds:
                    top_len = state_root.get('leds') or state_root.get('length') or None
                    if isinstance(top_len, int) and top_len > 0:
                        total_leds = top_len
            except Exception:
                logger.exception(f"Failed to query device state for device {device_id}")
                total_leds = None

            # Determine segment mapping either from saved mapping or auto-generate
            seg_mapping = dev.get('device_segment_mapping')
            seg_updates = []
            logger.info(f"Apply saved state for device {device_id}: total_leds={total_leds} seg_colors={seg_colors} curr_color={curr_color}")

            if not seg_mapping:
                led_count = total_leds if total_leds and total_leds > 0 else 60
                # Ensure we don't truncate saved segment colors when the device reports
                # a smaller LED count (some devices may report an incorrect count).
                try:
                    if isinstance(seg_colors, list) and len(seg_colors) > led_count:
                        logger.info(f"Apply saved state: increasing led_count from {led_count} to {len(seg_colors)} for device {device_id}")
                        led_count = len(seg_colors)
                except Exception:
                    pass
                seg_mapping = []
                color0 = seg_colors[0] if len(seg_colors) > 0 else None
                color1 = seg_colors[1] if len(seg_colors) > 1 else None
                color_rest = curr_color if curr_color else (color1 or color0)

                if not seg_colors and curr_color:
                    seg_mapping.append({"color": color_rest, "start": 0, "stop": led_count})
                else:
                    # Create one-LED segments for each saved segment color (up to led_count)
                    for idx, col in enumerate(seg_colors):
                        if idx >= led_count:
                            break
                        seg_mapping.append({"color": col, "start": idx, "stop": idx + 1})
                    # If there are remaining LEDs, assign them the "rest" color
                    if led_count > len(seg_colors) and color_rest:
                        seg_mapping.append({"color": color_rest, "start": len(seg_colors), "stop": led_count})

            if isinstance(seg_mapping, list) and len(seg_mapping) > 0:
                for entry in seg_mapping:
                    start = entry.get('start')
                    stop_exclusive = entry.get('stop')
                    color_hex = entry.get('color')
                    rgb = _hex_to_rgb(color_hex)
                    try:
                        if stop_exclusive is None:
                            raise ValueError('stop is None')
                        stop_to_send = int(stop_exclusive)
                    except Exception:
                        logger.warning(f"Device {device_id}: Invalid stop value in segment mapping: {stop_exclusive}")
                        continue

                    try:
                        if rgb is not None and start is not None and isinstance(start, (int, str)):
                            start_int = int(start)
                            if start_int < stop_to_send:
                                seg_updates.append({'start': start_int, 'stop': stop_to_send, 'col': [[rgb[0], rgb[1], rgb[2]]]})
                            else:
                                logger.warning(f"Device {device_id}: Skipping segment with start >= stop: start={start_int} stop={stop_to_send}")
                        else:
                            logger.warning(f"Device {device_id}: Skipping invalid segment entry start={start} stop={stop_exclusive} rgb={rgb}")
                    except Exception:
                        logger.exception(f"Device {device_id}: Error processing segment entry start={start} stop={stop_exclusive} color={color_hex}")

            if seg_updates:
                bri = dev.get('device_brightness') if isinstance(dev.get('device_brightness'), int) else 128
                state_data = {'on': True, 'bri': int(bri), 'seg': seg_updates, 'psave': 1}
                logger.info(f"Applying saved state to device {device_id} at {ip_address}: {state_data}")
                try:
                    resp = esp32_client.set_device_state(ip_address, state_data)
                    logger.info(f"Device {device_id}: apply_saved_state response: {resp}")
                    return resp
                except Exception:
                    logger.exception(f"Failed to apply saved state to device {device_id} at {ip_address}")
                    return None

            logger.info(f"No segment updates to apply for device {device_id}")
            return None
        except Exception:
            logger.exception(f"Error while applying saved state for device {device_id}")
            return None
    
    def set_device_effect(self, device_id: str, effect_id: int) -> Optional[Dict]:
        """
        Set effect for a specific device
        
        Args:
            device_id: Device identifier
            effect_id: WLED effect ID
            
        Returns:
            Response data or None if failed
        """
        ip_address = self.get_device_ip(device_id)
        if not ip_address:
            logger.error(f"No IP address found for device {device_id}")
            return None
        
        logger.info(f"Setting effect for device {device_id} to effect ID {effect_id}")
        return esp32_client.set_effect(ip_address, effect_id)
    
    def ping_device(self, device_id: str) -> bool:
        """
        Check if device is reachable
        
        Args:
            device_id: Device identifier
            
        Returns:
            True if device responds, False otherwise
        """
        ip_address = self.get_device_ip(device_id)
        if not ip_address:
            return False
        
        return esp32_client.ping_device(ip_address)
    
    def ping_all_devices(self) -> Dict[str, bool]:
        """
        Ping all devices to check connectivity
        
        Returns:
            Dictionary mapping device_id to ping status
        """
        device_ips = self.get_all_device_ips()
        results = {}
        
        for device_id, ip_address in device_ips.items():
            results[device_id] = esp32_client.ping_device(ip_address)
        
        return results
    
    def get_device_info(self, device_id: str) -> Optional[Dict]:
        """
        Get device information from ESP32
        
        Args:
            device_id: Device identifier
            
        Returns:
            Device info data or None if failed
        """
        ip_address = self.get_device_ip(device_id)
        if not ip_address:
            logger.error(f"No IP address found for device {device_id}")
            return None
        
        return esp32_client.get_device_info(ip_address)
    
    def discover_new_devices(self, ip_range: str = "192.168.1") -> List[str]:
        """
        Discover new WLED devices on the network
        
        Args:
            ip_range: IP range to scan
            
        Returns:
            List of newly discovered device IP addresses
        """
        logger.info(f"Discovering devices in range {ip_range}.*")
        discovered_ips = esp32_client.discover_devices(ip_range)
        
        # Filter out already known devices
        known_ips = set(self.get_all_device_ips().values())
        new_ips = [ip for ip in discovered_ips if ip not in known_ips]
        
        logger.info(f"Discovered {len(new_ips)} new devices: {new_ips}")
        return new_ips
    
    def add_device(self, device_id: str, ip_address: str, name: str = None, location: str = None) -> bool:
        """
        Add a new device to the configuration
        
        Args:
            device_id: Unique device identifier
            ip_address: Device IP address
            name: Human-readable device name
            location: Device location
            
        Returns:
            True if successful, False otherwise
        """
        import time
        
        if device_id in self.devices_data:
            logger.warning(f"Device {device_id} already exists")
            return False
        
        # Get device info to validate it's a WLED device
        device_info = esp32_client.get_device_info(ip_address)
        if not device_info:
            logger.error(f"Could not get info from device at {ip_address}")
            return False
        
        self.devices_data[device_id] = {
            "ip_address": ip_address,
            "name": name or f"WLED Device {device_id}",
            "location": location or "Unknown",
            "type": "wled",
            "status": "online",
            "last_seen": int(time.time()),
            "device_info": device_info
        }
        
        logger.info(f"Added new device {device_id} at {ip_address}")
        return self.save_devices()
    
    def remove_device(self, device_id: str) -> bool:
        """
        Remove a device from the configuration
        
        Args:
            device_id: Device identifier to remove
            
        Returns:
            True if successful, False otherwise
        """
        if device_id not in self.devices_data:
            logger.warning(f"Device {device_id} not found")
            return False
        
        del self.devices_data[device_id]
        logger.info(f"Removed device {device_id}")
        return self.save_devices()
    
    def get_device_summary(self) -> Dict[str, Any]:
        """
        Get summary of all devices
        
        Returns:
            Summary dictionary with device counts and status
        """
        total_devices = len(self.devices_data)
        online_devices = sum(1 for device in self.devices_data.values() 
                           if device.get('status') == 'online')
        offline_devices = total_devices - online_devices
        
        return {
            "total_devices": total_devices,
            "online_devices": online_devices,
            "offline_devices": offline_devices,
            "devices": list(self.devices_data.keys())
        }

# Global device manager instance
device_manager = DeviceManager()