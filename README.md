# WLED Controller

A modern, containerized web application to control multiple WLED devices from a central interface. This controller allows you to manage colors, brightness, effects, and organize WLED devices in a hierarchical structure with zones, groups, and locations.

## Features

### Device Management
- Add and manage multiple WLED devices in a hierarchical structure
- Organize devices by zones, groups, and locations
- Monitor device status (online/offline)
- Display device hostnames automatically
- Query device hostname directly from the WLED device
- Edit device information (name, IP address, description)

### Device Control
- Control colors and brightness across multiple devices simultaneously
- Apply effects to multiple devices
- Synchronize a group of devices with a master device
- Display a color strip showing all segments and colors of each device
- Live preview mode for real-time color updates
- Support for WLED presets to quickly apply saved configurations

### Modern Architecture
- Dockerized application with separate frontend and backend containers
- RESTful API with organized endpoints
- Modern frontend with Tailwind CSS
- Production-ready with Nginx and Gunicorn
- Development-friendly with hot reloading and volume mounts

## Architecture

This application consists of two main services:

- **Backend**: Python Flask API server running on port 5000
- **Frontend**: Static HTML/JS/CSS served by Nginx on port 80

## Requirements

- Docker and Docker Compose
- WLED devices on your network

## Quick Start with Docker (Recommended)

1. Clone this repository:
```bash
git clone <repository-url>
cd ledwebcontrolDocker
```

2. Start the application using Docker Compose:
```bash
docker-compose up -d
```

3. Open your web browser and navigate to `http://localhost`

The application will automatically build and start both the frontend and backend services.

## Development Setup

For development with hot reloading:

```bash
docker-compose up
```

This will:
- Start the backend with Flask development server and auto-reload
- Mount source code volumes for instant code changes
- Start the frontend with Nginx serving the static files

## Manual Installation (Alternative)

If you prefer to run without Docker:

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the backend server:
```bash
python run.py
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Build the CSS and static files:
```bash
npm run build
```

4. Serve the frontend files using a web server of your choice.

## Usage

1. Access the web interface at `http://localhost` (Docker) or your configured ports

2. Create the organizational hierarchy:
   - Add zones (e.g., "Living Room", "Bedroom")
   - Add groups within zones (e.g., "Main Lights", "Accent Lights")
   - Add locations within groups (e.g., "Window", "Ceiling")

3. Add your WLED devices to specific locations:
   - Device Name: A friendly name for your device
   - IP Address: The IP address of your WLED device (e.g., 192.168.1.100)
   - Description (optional): Any additional information about the device

4. Control your devices:
   - Select devices using the checkboxes
   - Set colors and brightness for selected devices
   - Apply effects to selected devices
   - Set a master device and synchronize other devices with it

## API Endpoints

The application provides a comprehensive RESTful API:

### Core Application
- `GET /`: Main web interface
- `GET /api/health`: Health check endpoint
- `GET /data/network_devices.json`: Get devices data

### Hierarchy Management
- `GET /api/hierarchy`: Get the complete organizational hierarchy
- `PUT /api/hierarchy`: Update the hierarchy structure
- `POST /api/hierarchy`: Create new hierarchy elements

### Zone Management
- `POST /api/zones`: Create a new zone

### Group Management
- `GET /api/groups`: Get all groups
- `POST /api/zones/<zone_id>/groups`: Create a group within a zone

### Location Management
- `POST /api/zones/<zone_id>/groups/<group_id>/locations`: Create a location within a group

### Device Management
- `POST /api/zones/<zone_id>/groups/<group_id>/locations/<location_id>/devices`: Add a device to a location
- `POST /add_device`: Add a device (legacy endpoint)

### Device Assignment
- `POST /api/assign_device`: Assign a device to a location

## Docker Services

### Backend Service
- **Container**: `ledweb_backend`
- **Port**: 5000
- **Technology**: Python Flask with Gunicorn
- **Features**: 
  - Development mode with hot reloading
  - Volume mounting for live code changes
  - CORS enabled for frontend communication

### Frontend Service
- **Container**: `ledweb_frontend`
- **Port**: 80
- **Technology**: Nginx serving static files
- **Features**:
  - Modern build process with Tailwind CSS
  - Responsive design
  - Font Awesome icons integration
  - Optimized static asset serving

## Development

### File Structure
```
ledwebcontrolDocker/
├── docker-compose.yml          # Docker services configuration
├── backend/                    # Python Flask backend
│   ├── Dockerfile             # Backend container configuration
│   ├── requirements.txt       # Python dependencies
│   ├── run.py                # Application entry point
│   ├── app/                  # Main application package
│   │   ├── __init__.py       # Flask app factory
│   │   ├── config.py         # Configuration settings
│   │   ├── api/              # API blueprints
│   │   ├── models/           # Data models
│   │   ├── utils/            # Utility functions
│   │   └── data/             # Device data storage
│   └── tests/                # Test suite
└── frontend/                  # Static frontend
    ├── Dockerfile            # Frontend container configuration
    ├── package.json          # Node.js dependencies and scripts
    ├── tailwind.config.js    # Tailwind CSS configuration
    └── src/                  # Source files
        ├── pages/            # HTML pages
        ├── js/               # JavaScript modules
        ├── css/              # Stylesheets
        └── assets/           # Static assets
```

### Available Scripts

#### Backend
- Start development server: `python run.py`
- Run with Gunicorn: `gunicorn app:app --bind 0.0.0.0:5000`

#### Frontend
- Build CSS: `npm run build-css`
- Watch CSS changes: `npm run watch-css`
- Build for production: `npm run build`

### Environment Variables
- `FLASK_ENV`: Set to `development` for debug mode
- Backend runs on `0.0.0.0:5000` in container
- Frontend is served on port `80` via Nginx

## WLED API Integration

This controller uses the WLED JSON API to communicate with devices. For more information about the WLED API, visit the [WLED Wiki](https://kno.wled.ge/interfaces/json-api/).

## Troubleshooting

### Common Issues
- **Devices show as offline**: Ensure they are powered on and connected to the same network
- **Cannot access the application**: Check that Docker containers are running with `docker-compose ps`
- **IP address issues**: Verify that the WLED device IP addresses are correct and accessible
- **Port conflicts**: Ensure ports 80 and 5000 are not being used by other applications

### Docker-specific Issues
- **Container build fails**: Check Docker logs with `docker-compose logs <service-name>`
- **Permission issues**: Ensure Docker has proper permissions on your system
- **Volume mount issues**: Verify that the project directory is accessible to Docker

### WLED Compatibility
- **API issues**: Make sure your WLED devices are running firmware that supports the JSON API (recommended version 0.13.0 or higher)
- **Network connectivity**: Ensure all devices are on the same network segment

### Development Issues
- **Frontend changes not reflecting**: Run `npm run build` to rebuild static assets
- **Backend API not responding**: Check that Flask is running and accessible on port 5000
- **CSS not updating**: Use `npm run watch-css` for automatic CSS rebuilding during development

## Backend startup & restart

When the backend starts it will perform a one-time background refresh of all configured WLED devices to populate their reachability status (online/offline) and `last_seen` timestamps. This helps the frontend display accurate device states immediately after the server starts.

Notes:
- The refresh runs in a non-blocking background thread so the API becomes available immediately.
- Devices that are powered off but still reachable will report `on: false` and appear as powered-off (not "Offline"). Devices that are not reachable (no power or network) will be marked as "Offline".

How to restart the backend

Local (Python):
```powershell
cd backend
# Activate your virtualenv if needed
& .\.venv\Scripts\Activate.ps1
python run.py
```

Docker Compose (recommended):
```powershell
# Rebuild and restart services
docker compose up -d --build

# Or restart only the backend service
docker compose restart ledweb_backend
```

If you change device metadata (for example `backend/app/data/network_devices.json`) you can trigger a fresh device scan by restarting the backend with one of the commands above.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## Technology Stack

- **Backend**: Python 3.13, Flask 2.3.3, Gunicorn 20.1.0
- **Frontend**: HTML5, JavaScript (ES6+), Tailwind CSS 3.4.0
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx (production), Flask dev server (development)
- **Dependencies**: Flask-CORS, Requests, Autoprefixer, PostCSS

## License

This project is open source and available under the MIT License.
