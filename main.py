import os
from app import app, socketio
import routes  # noqa: F401

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # use PORT from Render environment
    socketio.run(app, host="0.0.0.0", port=port, debug=True)
