#!/bin/bash

# Speech-to-Text Floating Dashboard Launcher
# This script starts the backend server and opens the floating control panel.

# 1. Start the Node.js backend
echo "🚀 Starting STT Backend..."
cd backend
npm install > /dev/null 2>&1
node server.js &
BACKEND_PID=$!

# 2. Wait for backend to be ready
echo "⏳ Waiting for backend..."
sleep 2

# 3. Open the Dashboard in Safari and make it a small "floating" window
echo "📱 Launching Floating Dashboard..."
DASHBOARD_PATH="/Users/jorgefernandezilufi/Documents/TEXT TO SPEECH/dashboard.html"

osascript <<EOF
tell application "Safari"
    make new document with properties {URL:"file://$DASHBOARD_PATH"}
    delay 1
    -- Position it to the right side of the screen as a small floating box
    set bounds of front window to {1200, 100, 1430, 450}
end tell
EOF

echo "✅ System Ready!"
echo "Press Ctrl+C to stop the backend."

# Keep script running to manage the backend PID
trap "kill $BACKEND_PID; exit" SIGINT SIGTERM
wait
