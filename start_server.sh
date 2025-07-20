#!/bin/bash
cd /home/runner/workspace
export PYTHONUNBUFFERED=1
echo "Starting WatchWithMe server..."
exec python main.py