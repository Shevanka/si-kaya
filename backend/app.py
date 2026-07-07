from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from pathlib import Path
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATABASE_PATH = Path("database.db")


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    connection = get_db_connection()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at TEXT,
            deleted INTEGER DEFAULT 0
        )
        """
    )

    connection.commit()
    connection.close()


def row_to_dict(row):
    return {
        "id": row["id"],
        "date": row["date"],
        "category": row["category"],
        "amount": row["amount"],
        "note": row["note"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "synced_at": row["synced_at"],
        "deleted": bool(row["deleted"]),
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "dompet-harian-backend",
            "database": str(DATABASE_PATH),
        }
    )


@app.route("/expenses", methods=["GET"])
def get_expenses():
    connection = get_db_connection()

    rows = connection.execute(
        """
        SELECT
            id,
            date,
            category,
            amount,
            note,
            created_at,
            updated_at,
            synced_at,
            deleted
        FROM expenses
        ORDER BY date DESC, created_at DESC
        """
    ).fetchall()

    connection.close()

    expenses = [row_to_dict(row) for row in rows]

    return jsonify(
        {
            "count": len(expenses),
            "expenses": expenses,
        }
    )


@app.route("/expenses/<expense_id>", methods=["GET"])
def get_expense_by_id(expense_id):
    connection = get_db_connection()

    row = connection.execute(
        """
        SELECT
            id,
            date,
            category,
            amount,
            note,
            created_at,
            updated_at,
            synced_at,
            deleted
        FROM expenses
        WHERE id = ?
        """,
        (expense_id,),
    ).fetchone()

    connection.close()

    if row is None:
        return jsonify({"error": "Expense not found"}), 404

    return jsonify(row_to_dict(row))


@app.route("/sync", methods=["POST"])
def sync_expenses():
    payload = request.get_json(silent=True)

    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    expenses = payload.get("expenses")

    if not isinstance(expenses, list):
        return jsonify({"error": "Field 'expenses' must be a list"}), 400

    synced_ids = []
    failed_items = []

    connection = get_db_connection()

    for expense in expenses:
        try:
            validate_expense(expense)

            synced_at = datetime.utcnow().isoformat() + "Z"

            connection.execute(
                """
                INSERT INTO expenses (
                    id,
                    date,
                    category,
                    amount,
                    note,
                    created_at,
                    updated_at,
                    synced_at,
                    deleted
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    date = excluded.date,
                    category = excluded.category,
                    amount = excluded.amount,
                    note = excluded.note,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    synced_at = excluded.synced_at,
                    deleted = excluded.deleted
                """,
                (
                    expense["id"],
                    expense["date"],
                    expense["category"],
                    float(expense["amount"]),
                    expense.get("note", ""),
                    expense["created_at"],
                    expense["updated_at"],
                    synced_at,
                    1 if expense.get("deleted", False) else 0,
                ),
            )

            synced_ids.append(expense["id"])

        except Exception as error:
            failed_items.append(
                {
                    "id": expense.get("id"),
                    "error": str(error),
                }
            )

    connection.commit()
    connection.close()

    return jsonify(
        {
            "success": len(failed_items) == 0,
            "synced_ids": synced_ids,
            "failed_items": failed_items,
        }
    )


@app.route("/expenses", methods=["DELETE"])
def delete_all_expenses():
    connection = get_db_connection()

    connection.execute("DELETE FROM expenses")
    connection.commit()
    connection.close()

    return jsonify(
        {
            "success": True,
            "message": "All expenses deleted",
        }
    )


def validate_expense(expense):
    required_fields = [
        "id",
        "date",
        "category",
        "amount",
        "created_at",
        "updated_at",
    ]

    for field in required_fields:
        if field not in expense:
            raise ValueError(f"Missing required field: {field}")

    if not str(expense["id"]).strip():
        raise ValueError("Expense id cannot be empty")

    if not str(expense["date"]).strip():
        raise ValueError("Expense date cannot be empty")

    if not str(expense["category"]).strip():
        raise ValueError("Expense category cannot be empty")

    amount = float(expense["amount"])

    if amount <= 0:
        raise ValueError("Expense amount must be greater than 0")


if __name__ == "__main__":
    init_database()
    app.run(host="0.0.0.0", port=5000, debug=True)