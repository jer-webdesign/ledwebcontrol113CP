"""
Error handling and logging configuration for ESP32 communication
"""

import logging
import sys
from typing import Dict, Any, Optional
from functools import wraps
from flask import current_app, jsonify
import time
import traceback

# Configure logging for ESP32 communication
def setup_esp32_logging():
    """
    Setup dedicated logging for ESP32 communication
    """
    # Create ESP32 logger
    esp32_logger = logging.getLogger('esp32_communication')
    esp32_logger.setLevel(logging.INFO)
    
    # Prevent duplicate logs
    if not esp32_logger.handlers:
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # Create file handler for ESP32 logs
        file_handler = logging.FileHandler('esp32_communication.log')
        file_handler.setLevel(logging.DEBUG)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        # Add handlers to logger
        esp32_logger.addHandler(console_handler)
        esp32_logger.addHandler(file_handler)
    
    return esp32_logger

# Get the ESP32 logger
esp32_logger = setup_esp32_logging()

class ESP32Error(Exception):
    """Base exception for ESP32 communication errors"""
    pass

class ESP32ConnectionError(ESP32Error):
    """Raised when unable to connect to ESP32 device"""
    pass

class ESP32TimeoutError(ESP32Error):
    """Raised when ESP32 request times out"""
    pass

class ESP32InvalidResponseError(ESP32Error):
    """Raised when ESP32 returns invalid response"""
    pass

class ESP32DeviceNotFoundError(ESP32Error):
    """Raised when ESP32 device is not found in configuration"""
    pass

def log_esp32_operation(operation_name: str):
    """
    Decorator to log ESP32 operations with timing and error handling
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            device_info = ""
            
            # Try to extract device info from arguments
            if args:
                if hasattr(args[0], '__class__') and 'ESP32' in str(args[0].__class__):
                    # This is likely a method call on ESP32Client
                    if len(args) > 1:
                        device_info = f" for device {args[1]}"
                elif len(args) > 0:
                    # First argument might be device_id or IP
                    device_info = f" for device {args[0]}"
            
            esp32_logger.info(f"Starting {operation_name}{device_info}")
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if result is not None:
                    esp32_logger.info(f"Completed {operation_name}{device_info} in {duration:.2f}s - Success")
                else:
                    esp32_logger.warning(f"Completed {operation_name}{device_info} in {duration:.2f}s - No response")
                
                return result
                
            except ESP32Error as e:
                duration = time.time() - start_time
                esp32_logger.error(f"Failed {operation_name}{device_info} in {duration:.2f}s - {type(e).__name__}: {e}")
                raise
                
            except Exception as e:
                duration = time.time() - start_time
                esp32_logger.error(f"Failed {operation_name}{device_info} in {duration:.2f}s - Unexpected error: {e}")
                esp32_logger.debug(f"Traceback: {traceback.format_exc()}")
                raise ESP32Error(f"Unexpected error in {operation_name}: {e}") from e
        
        return wrapper
    return decorator

def handle_esp32_api_errors(func):
    """
    Decorator to handle ESP32 errors in Flask API endpoints
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
            
        except ESP32DeviceNotFoundError as e:
            esp32_logger.warning(f"Device not found in API call: {e}")
            return jsonify({
                'status': 'error',
                'error_type': 'device_not_found',
                'message': str(e)
            }), 404
            
        except ESP32ConnectionError as e:
            esp32_logger.warning(f"Connection error in API call: {e}")
            return jsonify({
                'status': 'error',
                'error_type': 'connection_error',
                'message': 'Unable to connect to device. Please check if device is online.'
            }), 503
            
        except ESP32TimeoutError as e:
            esp32_logger.warning(f"Timeout error in API call: {e}")
            return jsonify({
                'status': 'error',
                'error_type': 'timeout_error',
                'message': 'Device did not respond within the timeout period.'
            }), 504
            
        except ESP32InvalidResponseError as e:
            esp32_logger.warning(f"Invalid response in API call: {e}")
            return jsonify({
                'status': 'error',
                'error_type': 'invalid_response',
                'message': 'Device returned an invalid response.'
            }), 502
            
        except ESP32Error as e:
            esp32_logger.error(f"ESP32 error in API call: {e}")
            return jsonify({
                'status': 'error',
                'error_type': 'esp32_error',
                'message': str(e)
            }), 500
            
        except Exception as e:
            esp32_logger.error(f"Unexpected error in API call: {e}")
            esp32_logger.debug(f"Traceback: {traceback.format_exc()}")
            
            # Don't expose internal errors in production
            if current_app and current_app.debug:
                message = str(e)
            else:
                message = 'An internal error occurred. Please try again later.'
            
            return jsonify({
                'status': 'error',
                'error_type': 'internal_error',
                'message': message
            }), 500
    
    return wrapper

def validate_device_id(device_id: str) -> str:
    """
    Validate device ID format
    
    Args:
        device_id: Device identifier to validate
        
    Returns:
        Validated device ID
        
    Raises:
        ESP32DeviceNotFoundError: If device ID is invalid
    """
    if not device_id or not isinstance(device_id, str):
        raise ESP32DeviceNotFoundError("Device ID must be a non-empty string")
    
    # Remove any whitespace
    device_id = device_id.strip()
    
    if not device_id:
        raise ESP32DeviceNotFoundError("Device ID cannot be empty")
    
    return device_id

def validate_ip_address(ip_address: str) -> str:
    """
    Validate IP address format
    
    Args:
        ip_address: IP address to validate
        
    Returns:
        Validated IP address
        
    Raises:
        ESP32Error: If IP address is invalid
    """
    if not ip_address or not isinstance(ip_address, str):
        raise ESP32Error("IP address must be a non-empty string")
    
    ip_address = ip_address.strip()
    
    # Basic IP validation
    parts = ip_address.split('.')
    if len(parts) != 4:
        raise ESP32Error(f"Invalid IP address format: {ip_address}")
    
    try:
        for part in parts:
            num = int(part)
            if num < 0 or num > 255:
                raise ESP32Error(f"Invalid IP address format: {ip_address}")
    except ValueError:
        raise ESP32Error(f"Invalid IP address format: {ip_address}")
    
    return ip_address

def create_error_response(error_type: str, message: str, details: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Create standardized error response
    
    Args:
        error_type: Type of error
        message: Error message
        details: Additional error details
        
    Returns:
        Error response dictionary
    """
    response = {
        'status': 'error',
        'error_type': error_type,
        'message': message,
        'timestamp': time.time()
    }
    
    if details:
        response['details'] = details
    
    return response

def log_device_operation(device_id: str, operation: str, success: bool, 
                        duration: float = None, details: Dict[str, Any] = None):
    """
    Log device operation for monitoring and debugging
    
    Args:
        device_id: Device identifier
        operation: Operation performed
        success: Whether operation succeeded
        duration: Operation duration in seconds
        details: Additional operation details
    """
    log_level = logging.INFO if success else logging.WARNING
    
    message = f"Device {device_id} - {operation} - {'SUCCESS' if success else 'FAILED'}"
    
    if duration is not None:
        message += f" ({duration:.2f}s)"
    
    if details:
        message += f" - {details}"
    
    esp32_logger.log(log_level, message)

# Health check functions
def check_esp32_connectivity(device_ips: list, timeout: int = 5) -> Dict[str, Dict[str, Any]]:
    """
    Check connectivity to multiple ESP32 devices
    
    Args:
        device_ips: List of device IP addresses
        timeout: Timeout for each check
        
    Returns:
        Dictionary with connectivity results for each device
    """
    from .esp32_client import esp32_client
    
    results = {}
    
    for ip in device_ips:
        start_time = time.time()
        try:
            is_reachable = esp32_client.ping_device(ip)
            duration = time.time() - start_time
            
            results[ip] = {
                'reachable': is_reachable,
                'response_time': duration,
                'error': None
            }
            
        except Exception as e:
            duration = time.time() - start_time
            results[ip] = {
                'reachable': False,
                'response_time': duration,
                'error': str(e)
            }
    
    return results

def get_system_health() -> Dict[str, Any]:
    """
    Get overall system health status
    
    Returns:
        System health information
    """
    from .device_manager import device_manager
    
    try:
        # Get device summary
        summary = device_manager.get_device_summary()
        
        # Calculate health metrics
        total_devices = summary.get('total_devices', 0)
        online_devices = summary.get('online_devices', 0)
        
        if total_devices > 0:
            connectivity_ratio = online_devices / total_devices
        else:
            connectivity_ratio = 1.0
        
        # Determine overall health
        if connectivity_ratio >= 0.9:
            health_status = 'healthy'
        elif connectivity_ratio >= 0.7:
            health_status = 'degraded'
        else:
            health_status = 'unhealthy'
        
        return {
            'status': health_status,
            'connectivity_ratio': connectivity_ratio,
            'total_devices': total_devices,
            'online_devices': online_devices,
            'offline_devices': summary.get('offline_devices', 0),
            'timestamp': time.time()
        }
        
    except Exception as e:
        esp32_logger.error(f"Failed to get system health: {e}")
        return {
            'status': 'unknown',
            'error': str(e),
            'timestamp': time.time()
        }