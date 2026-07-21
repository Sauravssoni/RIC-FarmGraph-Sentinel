"""SQLite document persistence for the demo API (Phase G — Task 002).

Deliberately minimal: JSON documents keyed by id, one table per aggregate.
This is a SINGLE-NODE DEMO persistence layer (no concurrency control beyond a
process lock, no migrations, no replication) and is labelled as such in
/health and the docs. It replaces the Task 001 in-memory-only limitation so
that reviews, referrals, learning records and audit events survive a process
restart. Set FGR_PERSIST=memory to disable (used by the test-suite default).
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB = REPO_ROOT / "data" / "runtime" / "fgr.db"

TABLES = (
    "cases",
    "observations",
    "reviews",
    "followups",
    "missions",
    "referrals",
    "learning_records",
    "audit",
    "kv_meta",
)

_DDL = "".join(
    f"CREATE TABLE IF NOT EXISTS {t} (id TEXT PRIMARY KEY, doc TEXT NOT NULL);"
    for t in TABLES
)


class SQLStore:
    """Thread-safe JSON document store over stdlib sqlite3."""

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(self.path), check_same_thread=False)
        with self._lock:
            self._conn.executescript(_DDL)
            self._conn.commit()

    def put(self, table: str, id_: str, doc: dict[str, Any]) -> None:
        assert table in TABLES, f"unknown table {table}"
        with self._lock:
            self._conn.execute(
                f"INSERT INTO {table} (id, doc) VALUES (?, ?) "
                f"ON CONFLICT(id) DO UPDATE SET doc=excluded.doc",
                (id_, json.dumps(doc, ensure_ascii=False)),
            )
            self._conn.commit()

    def get(self, table: str, id_: str) -> Optional[dict[str, Any]]:
        assert table in TABLES, f"unknown table {table}"
        with self._lock:
            row = self._conn.execute(f"SELECT doc FROM {table} WHERE id = ?", (id_,)).fetchone()
        return json.loads(row[0]) if row else None

    def all(self, table: str) -> list[dict[str, Any]]:
        assert table in TABLES, f"unknown table {table}"
        with self._lock:
            rows = self._conn.execute(f"SELECT doc FROM {table}").fetchall()
        return [json.loads(r[0]) for r in rows]

    def has(self, table: str, id_: str) -> bool:
        return self.get(table, id_) is not None

    def count(self, table: str) -> int:
        assert table in TABLES, f"unknown table {table}"
        with self._lock:
            row = self._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
        return int(row[0])

    def clear_all(self) -> None:
        with self._lock:
            for t in TABLES:
                self._conn.execute(f"DELETE FROM {t}")
            self._conn.commit()


def default_store() -> SQLStore:
    return SQLStore(os.environ.get("FGR_DB_PATH", str(DEFAULT_DB)))
