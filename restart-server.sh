#!/bin/bash

# Kill existing server processes
pkill -f "tsx server/index.ts" || true
sleep 2

# Start the server
npm run dev