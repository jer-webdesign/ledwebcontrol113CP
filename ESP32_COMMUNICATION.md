# ESP32 HTTP Communication Flow

This document explains how the LED Web Control system communicates with ESP32 devices running WLED firmware over Wi-Fi.

## Communication Flow

```
Frontend → Backend → ESP32 (WLED) → Backend → Frontend
```

### Detailed Steps:

1. **Backend reads network_devices.json**
   - Contains device configurations including IP addresses
   - File location: `backend/app/data/network_devices.json`

2. **Backend finds ESP32's IP address**
   - Device manager loads the configuration
   - Extracts IP address for target device

3. **Backend makes HTTP request to ESP32**
   - Uses the ESP32 HTTP client (`esp32_client.py`)
   - Sends requests to: `http://{ip_address}/json/state`
   - Or control endpoints like: `http://{ip_address}/json/state` (POST)

4. **Request travels over Wi-Fi network**
   - Goes through your router/Omada network infrastructure
   - Uses standard HTTP protocol (port 80)

5. **ESP32 receives HTTP request**
   - WLED firmware handles the incoming request
   - Processes the command or state query

6. **WLED firmware processes the command**
   - Updates LED strip state (color, brightness, effects)
   - Prepares response data

7. **ESP32 sends HTTP response back**
   - JSON response with current state or command result
   - Includes status, brightness, color, effects, etc.

8. **Backend receives response**
   - ESP32 client processes the JSON response
   - Handles errors and timeouts

9. **Backend returns data to Frontend**
   - API endpoint returns JSON response to web interface
   - Frontend updates the user interface

## API Endpoints

### Device State Management
- `GET /api/devices/{device_id}/state` - Get current device state
- `POST /api/devices/{device_id}/state` - Set device state
- `GET /api/devices/states` - Get all device states

### Device Control
- `POST /api/devices/{device_id}/power` - Turn device on/off
- `POST /api/devices/{device_id}/brightness` - Set brightness (0-255)
- `POST /api/devices/{device_id}/color` - Set RGB/RGBW color
- `POST /api/devices/{device_id}/effect` - Set WLED effect

### Device Management
- `GET /api/devices/{device_id}/ping` - Test device connectivity
- `GET /api/devices/{device_id}/info` - Get device information
- `POST /api/devices/discover` - Discover new devices on network

### System Health
- `GET /api/devices/health` - Get system health status
- `GET /api/devices/summary` - Get device summary

## Example HTTP Requests

### Get Device State
```http
GET /api/devices/device_1/state
```

Response:
```json
{
  "status": "success",
  "state": {
    "on": true,
    "bri": 255,
    "seg": [
      {
        "col": [[255, 0, 0]]
      }
    ]
  }
}
```

### Set Device Color
```http
POST /api/devices/device_1/color
Content-Type: application/json

{
  "r": 255,
  "g": 0,
  "b": 0
}
```

### Set Device Brightness
```http
POST /api/devices/device_1/brightness
Content-Type: application/json

{
  "brightness": 128
}
```

## WLED API Endpoints

The system communicates with these WLED endpoints on each ESP32:

- `GET http://{ip}/json/state` - Get current state
- `POST http://{ip}/json/state` - Set state
- `GET http://{ip}/json/info` - Get device info
- `GET http://{ip}/json/effects` - Get available effects

## Error Handling

The system includes comprehensive error handling for:

- **Connection Errors**: When ESP32 is unreachable
- **Timeout Errors**: When ESP32 doesn't respond in time
- **Invalid Response**: When ESP32 returns malformed data
- **Device Not Found**: When device isn't in configuration

## Network Requirements

- ESP32 devices must be on the same network as the backend
- ESP32 devices must have static IP addresses or DHCP reservations
- Firewall must allow HTTP traffic on port 80
- Wi-Fi network must be stable and reliable

## Configuration

### network_devices.json Structure
```json
{
  "device_1": {
    "ip_address": "192.168.1.150",
    "name": "Living Room LEDs",
    "location": "Living Room",
    "type": "wled",
    "status": "online"
  }
}
```

### Adding New Devices
1. Use the discovery endpoint: `POST /api/devices/discover`
2. Or manually add to `network_devices.json`
3. Restart the backend to reload configuration

## Testing

Run the test script to verify communication:
```bash
cd backend
python test_esp32_communication.py
```

This will:
1. Load device configuration
2. Test connectivity to all devices
3. Get device states
4. Test device control
5. Check system health

## Troubleshooting

### Common Issues:
1. **Device not responding**: Check IP address and network connectivity
2. **Timeout errors**: Increase timeout in ESP32 client configuration
3. **Invalid response**: Ensure ESP32 is running WLED firmware
4. **Connection refused**: Check if ESP32 web server is running

### Debug Steps:
1. Ping the ESP32 device directly: `ping {ip_address}`
2. Access WLED web interface: `http://{ip_address}`
3. Check backend logs for error details
4. Use the health check endpoint to monitor system status