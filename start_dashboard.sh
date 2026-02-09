#!/bin/bash

# Configuration
PORT=5000
HOST="http://127.0.0.1"
URL="$HOST:$PORT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO] Checking dependencies...${NC}"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install it."
    exit 1
fi

# Check for Flask
if ! python3 -c "import flask" &> /dev/null; then
    echo -e "${BLUE}[INFO] Installing Flask...${NC}"
    pip install flask
fi

# Kill any existing process on port 5000
fuser -k $PORT/tcp 2>/dev/null

echo -e "${GREEN}[SUCCESS] Starting Memory Defense Dashboard...${NC}"
echo -e "${BLUE}[INFO] Presentation Mode Active${NC}"
echo -e "${BLUE}[INFO] Access Local: $URL${NC}"

# Detect Host-Only IP (usually enp0s8 or eth1 in VirtualBox)
HOST_IP=$(ip -4 addr show enp0s8 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
if [ -z "$HOST_IP" ]; then
    # Fallback: try to find any 192.168.56.x address
    HOST_IP=$(ip -4 addr | grep -oP '(?<=inet\s)192\.168\.56\.\d+' | head -n 1)
fi

if [ ! -z "$HOST_IP" ]; then
    echo -e "${GREEN}[INFO] Access from Windows: http://$HOST_IP:$PORT${NC}"
else
    echo -e "${BLUE}[INFO] External IP not detected automatically. Run 'ip a' to find it.${NC}"
fi

# Start Server in Background
python3 gui/app.py  > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo -e "${BLUE}[INFO] Waiting for server to initialize...${NC}"
sleep 2

# Open Browser
if command -v xdg-open &> /dev/null; then
    xdg-open $URL
elif command -v open &> /dev/null; then
    open $URL
else
    echo "Could not detect browser opener. Please open $URL manually."
fi

echo -e "${GREEN}[READY] Dashboard is running! (PID: $SERVER_PID)${NC}"
echo "Press Ctrl+C to stop the server."

# Keep script running to handle shutdown
trap "kill $SERVER_PID; exit" INT
wait $SERVER_PID
