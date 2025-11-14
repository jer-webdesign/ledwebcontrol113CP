# backend/Dockerfile
FROM python:3.13-slim

# Set the working directory inside the container
WORKDIR /app

# Copy requirements file and install Python dependencies
# This is done separately to leverage Docker's build cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code (app.py, run.py, network_devices.json, etc.)
COPY . .

# Flask and Gunicorn typically run on port 5000 by default
EXPOSE 5000

# Command to run the application using Gunicorn (production server)
# Use run.py which contains the app factory
# For development, we'll use Flask's built-in server for now
CMD ["python", "run.py"]