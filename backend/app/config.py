from pathlib import Path

from dotenv import load_dotenv

PROJECT_NAME = "QATRA"  # single place to rename the project

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent
DATA_DIR = ROOT_DIR / "data"
SCRIPTS_DIR = ROOT_DIR / "scripts"

load_dotenv(ROOT_DIR / ".env")

CORS_ORIGINS = ["http://localhost:5173"]
