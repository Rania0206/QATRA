"""In-memory dataset store, built once at startup from scripts/load_data.py."""
import importlib.util
import logging
from typing import Any

from app.config import SCRIPTS_DIR

log = logging.getLogger(__name__)


def _load_loader_module():
    spec = importlib.util.spec_from_file_location("load_data", SCRIPTS_DIR / "load_data.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Store:
    def __init__(self) -> None:
        self.datasets: dict[str, Any] = {}
        self.errors: dict[str, str] = {}

    def load(self) -> "Store":
        loaders = _load_loader_module()
        for name in loaders.ALL:
            try:
                self.datasets[name] = getattr(loaders, name)()
            except Exception as e:  # keep the app up if one file is missing
                self.errors[name] = str(e)
                log.warning("dataset %s failed to load: %s", name, e)
        return self

    def get(self, name: str) -> Any:
        return self.datasets[name]

    def __getitem__(self, name: str) -> Any:
        return self.datasets[name]

    def row_counts(self) -> dict[str, int]:
        return {n: len(d) if hasattr(d, "__len__") else 1 for n, d in self.datasets.items()}


_store: Store | None = None


def init_store() -> Store:
    global _store
    if _store is None:
        _store = Store().load()
    return _store


def get_store() -> Store:
    """Return the shared store (builds it on first call). Usable as a FastAPI dependency."""
    return init_store()
