"""
Lambda handler for /todos routes.
GET    /todos        → get_todos
POST   /todos        → create_todo
PUT    /todos/{id}   → update_todo
DELETE /todos/{id}   → delete_todo
"""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

# ── DynamoDB setup ────────────────────────────────────────────────────────────

TABLE_NAME = os.environ["TODOS_TABLE"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

# ── Helpers ───────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")


def _response(status_code: int, body=None) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body or {}),
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_body(event: dict) -> dict:
    raw = event.get("body") or "{}"
    return json.loads(raw)


# ── Route handlers ────────────────────────────────────────────────────────────


def get_todos(event: dict, context) -> dict:
    """GET /todos — return all todos for the caller."""
    result = table.scan()
    items = sorted(result.get("Items", []), key=lambda x: x.get("createdAt", ""))
    return _response(200, items)


def create_todo(event: dict, context) -> dict:
    """POST /todos — create a new todo."""
    body = _parse_body(event)
    title = (body.get("title") or "").strip()

    if not title:
        return _response(400, {"message": "title is required"})

    now = _now_iso()
    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "completed": False,
        "createdAt": now,
        "updatedAt": now,
    }
    table.put_item(Item=item)
    return _response(201, item)


def update_todo(event: dict, context) -> dict:
    """PUT /todos/{id} — update title and/or completed."""
    todo_id = (event.get("pathParameters") or {}).get("id")
    if not todo_id:
        return _response(400, {"message": "id path parameter is required"})

    body = _parse_body(event)

    # Build update expression dynamically
    updates = {}
    if "title" in body:
        title = (body["title"] or "").strip()
        if not title:
            return _response(400, {"message": "title cannot be empty"})
        updates["title"] = title
    if "completed" in body:
        updates["completed"] = bool(body["completed"])

    if not updates:
        return _response(400, {"message": "Nothing to update"})

    updates["updatedAt"] = _now_iso()

    expr_parts = [f"#attr_{k} = :val_{k}" for k in updates]
    update_expr = "SET " + ", ".join(expr_parts)
    expr_names = {f"#attr_{k}": k for k in updates}
    expr_values = {f":val_{k}": v for k, v in updates.items()}

    try:
        result = table.update_item(
            Key={"id": todo_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ConditionExpression="attribute_exists(id)",
            ReturnValues="ALL_NEW",
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return _response(404, {"message": f"Todo {todo_id} not found"})

    return _response(200, result["Attributes"])


def delete_todo(event: dict, context) -> dict:
    """DELETE /todos/{id} — remove a todo."""
    todo_id = (event.get("pathParameters") or {}).get("id")
    if not todo_id:
        return _response(400, {"message": "id path parameter is required"})

    try:
        table.delete_item(
            Key={"id": todo_id},
            ConditionExpression="attribute_exists(id)",
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return _response(404, {"message": f"Todo {todo_id} not found"})

    return _response(204)


# ── Router ────────────────────────────────────────────────────────────────────

ROUTES = {
    ("GET", "/todos"): get_todos,
    ("POST", "/todos"): create_todo,
    ("PUT", "/todos/{id}"): update_todo,
    ("DELETE", "/todos/{id}"): delete_todo,
}


def handler(event: dict, context) -> dict:
    """Main Lambda entry point — routes to the correct handler."""
    method = event.get("httpMethod", "")
    path = event.get("resource", event.get("path", ""))

    # OPTIONS pre-flight
    if method == "OPTIONS":
        return _response(200)

    route_fn = ROUTES.get((method, path))
    if route_fn is None:
        return _response(404, {"message": f"Route {method} {path} not found"})

    return route_fn(event, context)
