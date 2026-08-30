import os
from pathlib import Path

DB_PATH = Path(os.getenv("DB_PATH", "data/poli-quizzes.db"))

MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", 1_048_576))  # 1 MB per JSON
MAX_QUIZZES_PER_LIST = int(os.getenv("MAX_QUIZZES_PER_LIST", 50))

# Hard database ceiling, enforced by SQLite itself rather than by app-level
# counting. 25600 pages x 4096 bytes = 100 MB.
MAX_DB_PAGES = int(os.getenv("MAX_DB_PAGES", 25_600))

CODE_LENGTH = 7
EDIT_KEY_LENGTH = 32
