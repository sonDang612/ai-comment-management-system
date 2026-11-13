"""Docker healthcheck: `python -m acms_ai.worker.healthcheck` exits 0 if the heartbeat is fresh."""

import sys
import time

from acms_ai.worker.config import get_settings


def main() -> int:
    settings = get_settings()
    try:
        age = time.time() - settings.heartbeat_file.stat().st_mtime
    except FileNotFoundError:
        return 1
    return 0 if age < settings.heartbeat_interval_seconds * 3 else 1


if __name__ == "__main__":
    sys.exit(main())
