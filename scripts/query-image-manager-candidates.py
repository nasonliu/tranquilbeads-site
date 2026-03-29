#!/usr/bin/env python3
"""Local-only helper for image-manager candidate queries."""

import json
import sqlite3
import sys

DB_FILE = "file:/Volumes/office/products/Pic/sorted/products.db?mode=ro&immutable=1"


def main() -> int:
    if len(sys.argv) < 2:
        print("[]")
        return 0

    sql = sys.argv[1]

    connection = sqlite3.connect(DB_FILE, uri=True)
    connection.row_factory = sqlite3.Row

    try:
        rows = connection.execute(sql).fetchall()
        payload = [dict(row) for row in rows]
        print(json.dumps(payload, ensure_ascii=False))
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
