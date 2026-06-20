import sys
import os

# Add the 'backend' folder to path so python can resolve 'app' module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app
