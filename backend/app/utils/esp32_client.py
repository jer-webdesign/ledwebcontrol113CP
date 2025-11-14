"""
ESP32 WLED HTTP Client
Handles communication with ESP32 devices running WLED firmware
"""

import requests
import json
import logging
from typing import Dict, Optional, List, Any
from urllib.parse import urljoin
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

class ESP32Client:
    """HTTP client for communicating with ESP32 WLED devices"""
    
    def __init__(self, timeout: int = 5, max_retries: int = 3):
        """
        Initialize ESP32 client
        
        Args:
            timeout: HTTP request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        # Set default headers for WLED communication
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'LEDWebControl/1.0'
        })
    
    def _make_request(self, url: str, method: str = 'GET', data: Dict = None) -> Optional[Dict]:
        """
        Make HTTP request with retry logic
        
        Args:
            url: Full URL to request
            method: HTTP method (GET, POST, PUT)
            data: Request payload for POST/PUT requests
            
        Returns:
            Response data as dictionary or None if failed
        """
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Making {method} request to {url} (attempt {attempt + 1})")
                
                if method.upper() == 'GET':
                    response = self.session.get(url, timeout=self.timeout)
                elif method.upper() == 'POST':
                    response = self.session.post(url, json=data, timeout=self.timeout)
                elif method.upper() == 'PUT':
                    response = self.session.put(url, json=data, timeout=self.timeout)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                
                # Try to parse JSON response
                try:
                    return response.json()
                except json.JSONDecodeError:
                    logger.warning(f"Non-JSON response from {url}: {response.text}")
                    return {"success": True, "response": response.text}
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1} for {url}")
            except requests.exceptions.ConnectionError:
                logger.warning(f"Connection error on attempt {attempt + 1} for {url}")
            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP error {e.response.status_code} for {url}: {e}")
                return None
            except Exception as e:
                logger.error(f"Unexpected error for {url}: {e}")
                return None
                
            if attempt < self.max_retries - 1:
                time.sleep(0.5 * (attempt + 1))  # Progressive backoff
        
        logger.error(f"Failed to connect to {url} after {self.max_retries} attempts")
        return None
    
    def get_device_state(self, ip_address: str) -> Optional[Dict]:
        """
        Get current state from ESP32 WLED device
        
        Args:
            ip_address: IP address of the ESP32 device
            
        Returns:
            Device state data or None if failed
        """
        url = f"http://{ip_address}/json/state"
        return self._make_request(url, 'GET')
    
    def get_device_info(self, ip_address: str) -> Optional[Dict]:
        """
        Get device information from ESP32 WLED device
        
        Args:
            ip_address: IP address of the ESP32 device
            
        Returns:
            Device info data or None if failed
        """
        url = f"http://{ip_address}/json/info"
        return self._make_request(url, 'GET')
    
    def set_device_state(self, ip_address: str, state_data: Dict) -> Optional[Dict]:
        """
        Set device state on ESP32 WLED device
        
        Args:
            ip_address: IP address of the ESP32 device
            state_data: State configuration to apply
            
        Returns:
            Response data or None if failed
        """
        url = f"http://{ip_address}/json/state"
        return self._make_request(url, 'POST', state_data)
    
    def set_brightness(self, ip_address: str, brightness: int) -> Optional[Dict]:
        """
        Set device brightness (0-255)
        
        Args:
            ip_address: IP address of the ESP32 device
            brightness: Brightness level (0-255)
            
        Returns:
            Response data or None if failed
        """
        state_data = {"bri": max(0, min(255, brightness))}
        return self.set_device_state(ip_address, state_data)
    
    def set_power(self, ip_address: str, on: bool) -> Optional[Dict]:
        """
        Turn device on or off
        
        Args:
            ip_address: IP address of the ESP32 device
            on: True to turn on, False to turn off
            
        Returns:
            Response data or None if failed
        """
        state_data = {"on": on}
        return self.set_device_state(ip_address, state_data)
    
    def set_color(self, ip_address: str, r: int, g: int, b: int, w: int = 0) -> Optional[Dict]:
        """
        Set device color (RGB or RGBW)
        
        Args:
            ip_address: IP address of the ESP32 device
            r: Red value (0-255)
            g: Green value (0-255)
            b: Blue value (0-255)
            w: White value (0-255, optional)
            
        Returns:
            Response data or None if failed
        """
        color = [
            max(0, min(255, r)),
            max(0, min(255, g)),
            max(0, min(255, b))
        ]
        if w > 0:
            color.append(max(0, min(255, w)))
            
        state_data = {"seg": [{"col": [color]}]}
        return self.set_device_state(ip_address, state_data)
    
    def set_effect(self, ip_address: str, effect_id: int) -> Optional[Dict]:
        """
        Set device effect
        
        Args:
            ip_address: IP address of the ESP32 device
            effect_id: WLED effect ID
            
        Returns:
            Response data or None if failed
        """
        state_data = {"seg": [{"fx": effect_id}]}
        return self.set_device_state(ip_address, state_data)
    
    def get_multiple_device_states(self, ip_addresses: List[str]) -> Dict[str, Optional[Dict]]:
        """
        Get states from multiple devices concurrently
        
        Args:
            ip_addresses: List of IP addresses
            
        Returns:
            Dictionary mapping IP addresses to their state data
        """
        results = {}
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            # Submit all requests
            future_to_ip = {
                executor.submit(self.get_device_state, ip): ip 
                for ip in ip_addresses
            }
            
            # Collect results
            for future in as_completed(future_to_ip):
                ip = future_to_ip[future]
                try:
                    result = future.result()
                    results[ip] = result
                except Exception as e:
                    logger.error(f"Error getting state for {ip}: {e}")
                    results[ip] = None
        
        return results
    
    def ping_device(self, ip_address: str) -> bool:
        """
        Check if device is reachable
        
        Args:
            ip_address: IP address of the ESP32 device
            
        Returns:
            True if device responds, False otherwise
        """
        try:
            url = f"http://{ip_address}/json/state"
            response = self.session.get(url, timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def discover_devices(self, ip_range: str = "192.168.1") -> List[str]:
        """
        Discover WLED devices on network (basic IP scanning)
        
        Args:
            ip_range: IP range to scan (e.g., "192.168.1")
            
        Returns:
            List of discovered device IP addresses
        """
        discovered = []
        
        def check_ip(ip):
            if self.ping_device(ip):
                # Verify it's actually a WLED device
                info = self.get_device_info(ip)
                if info and 'ver' in info:  # WLED has 'ver' field in info
                    return ip
            return None
        
        with ThreadPoolExecutor(max_workers=50) as executor:
            # Check IPs 1-254 in the range
            futures = [
                executor.submit(check_ip, f"{ip_range}.{i}") 
                for i in range(1, 255)
            ]
            
            for future in as_completed(futures):
                result = future.result()
                if result:
                    discovered.append(result)
        
        return sorted(discovered)
    
    def close(self):
        """Close the HTTP session"""
        self.session.close()

# Global ESP32 client instance
esp32_client = ESP32Client()