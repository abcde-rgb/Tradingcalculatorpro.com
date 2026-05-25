from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import asyncpg
import json as _json_module
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import secrets
import hashlib
import re as _re_module
import stripe  # Stripe SDK for advanced subscription management
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from options_math import (
    generate_options_chain,
    calculate_payoff,
    find_break_evens,
    calculate_greeks,
    calculate_pnl_attribution,
    simulate_assignment,
)
from stock_data import (
    get_stock_data,
    search_tickers,
    generate_expirations,
    get_options_chain_real,
    get_available_expirations,
)
from candle_patterns import detect_all_patterns, PATTERN_META
from performance import (
    compute_trade_pnl,
    detect_errors,
    compute_analytics,
    generate_insights,
    trades_for_user,
    make_trade_doc,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============================================================
#  PostgreSQL / asyncpg adapter — mimics Motor's Collection API
# ============================================================

def _json_default(obj):
    """JSON serialiser for datetime and other non-standard types."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _serialize(doc: dict) -> str:
    """Serialize a Python dict to a JSON string suitable for JSONB storage."""
    return _json_module.dumps(doc, default=_json_default)


def _deserialize(raw) -> dict:
    """Deserialize a JSONB value from asyncpg (may already be a dict or a str)."""
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return _json_module.loads(raw)
    # asyncpg returns Record objects for rows; we convert to dict
    return dict(raw)


_SAFE_FIELD_RE = _re_module.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')


def _build_where_clause(filter_dict: dict, start_param: int = 1):
    """
    Convert a (potentially complex) MongoDB-style filter dict into a PostgreSQL
    WHERE clause string + list of bind parameters.

    Supported operators:
      - Simple equality:   {"field": value}
      - $set / $or:        {"$or": [{...}, {...}]}
      - $in:               {"field": {"$in": [...]}}
      - $ne:               {"field": {"$ne": value}}
      - $gte / $lte / $gt / $lt: {"field": {"$gte": value}}
      - $regex:            {"field": {"$regex": pattern, "$options": "i"}}
      - None equality:     {"field": None}  → IS NULL or JSON null
    """
    if not filter_dict:
        return "", [], start_param

    parts = []
    params = []
    param_idx = start_param

    for key, value in filter_dict.items():
        if key == "$or":
            sub_parts = []
            for sub_filter in value:
                sub_clause, sub_params, param_idx = _build_where_clause(sub_filter, param_idx)
                if sub_clause:
                    sub_parts.append(f"({sub_clause})")
                    params.extend(sub_params)
            if sub_parts:
                parts.append("(" + " OR ".join(sub_parts) + ")")
            continue

        # key is a field name, value may be a plain value or operator dict
        if key == "_id":
            # Special: _id maps to _key column (used for app_settings "global" doc)
            if isinstance(value, str):
                parts.append(f"_key = ${param_idx}")
                params.append(value)
                param_idx += 1
            continue

        if not _SAFE_FIELD_RE.match(key):
            logging.warning("Ignored invalid field name in query filter: %r", key)
            continue

        if isinstance(value, dict) and any(k.startswith("$") for k in value):
            for op, operand in value.items():
                if op == "$regex":
                    flags = value.get("$options", "")
                    if "i" in flags:
                        parts.append(f"(data->>'{ key }') ~* ${param_idx}")
                    else:
                        parts.append(f"(data->>'{ key }') ~ ${param_idx}")
                    params.append(operand)
                    param_idx += 1
                elif op == "$options":
                    continue  # handled with $regex
                elif op == "$in":
                    if operand is None or len(operand) == 0:
                        parts.append("FALSE")
                        continue
                    # Handle list with possible None values
                    non_null = [x for x in operand if x is not None]
                    has_null = any(x is None for x in operand)
                    sub = []
                    if non_null:
                        placeholders = ", ".join(
                            f"${param_idx + i}" for i in range(len(non_null))
                        )
                        sub.append(f"(data->>'{key}') IN ({placeholders})")
                        params.extend([str(v) if not isinstance(v, str) else v for v in non_null])
                        param_idx += len(non_null)
                    if has_null:
                        sub.append(f"(data->>'{key}') IS NULL")
                    if sub:
                        parts.append("(" + " OR ".join(sub) + ")")
                    else:
                        parts.append("FALSE")
                elif op == "$ne":
                    if operand is None:
                        parts.append(f"(data->'{key}') IS NOT NULL AND (data->'{key}') != 'null'::jsonb")
                    else:
                        parts.append(f"(data->>'{key}') != ${param_idx}")
                        params.append(str(operand) if not isinstance(operand, str) else operand)
                        param_idx += 1
                elif op == "$gte":
                    parts.append(f"(data->>'{key}') >= ${param_idx}")
                    params.append(str(operand) if not isinstance(operand, str) else operand)
                    param_idx += 1
                elif op == "$lte":
                    parts.append(f"(data->>'{key}') <= ${param_idx}")
                    params.append(str(operand) if not isinstance(operand, str) else operand)
                    param_idx += 1
                elif op == "$gt":
                    parts.append(f"(data->>'{key}') > ${param_idx}")
                    params.append(str(operand) if not isinstance(operand, str) else operand)
                    param_idx += 1
                elif op == "$lt":
                    parts.append(f"(data->>'{key}') < ${param_idx}")
                    params.append(str(operand) if not isinstance(operand, str) else operand)
                    param_idx += 1
                else:
                    # Unknown operator — skip silently (no-op filter)
                    pass
        elif value is None:
            # Match documents where the field is absent OR explicitly null
            parts.append(f"(data->'{key}' IS NULL OR data->'{key}' = 'null'::jsonb)")
        elif isinstance(value, bool):
            json_val = "true" if value else "false"
            parts.append(f"(data->'{key}') = '{json_val}'::jsonb")
        else:
            # Simple equality — use JSONB containment for the single key
            sub_filter = {key: value}
            parts.append(f"data @> ${param_idx}::jsonb")
            params.append(_serialize(sub_filter))
            param_idx += 1

    clause = " AND ".join(parts) if parts else ""
    return clause, params, param_idx


class _DeleteResult:
    def __init__(self, count: int):
        self.deleted_count = count


class _UpdateResult:
    def __init__(self, matched: int, modified: int):
        self.matched_count = matched
        self.modified_count = modified


class _Cursor:
    """Lazy cursor returned by Collection.find(). Supports .sort(), .limit(), .skip(), .to_list(), async for."""

    def __init__(self, pool, table: str, filter_dict: dict, projection=None):
        self._pool = pool
        self._table = table
        self._filter = filter_dict
        self._projection = projection  # ignored — we always return full JSONB doc
        self._sort_field: Optional[str] = None
        self._sort_dir: int = 1   # 1 ASC, -1 DESC
        self._limit_val: Optional[int] = None
        self._skip_val: int = 0

    # --- chaining methods ---

    def sort(self, key_or_list, direction=None):
        """Support both .sort("field", -1) and .sort([("field", -1)]) forms."""
        if isinstance(key_or_list, list):
            # Use only the first sort key for simplicity
            if key_or_list:
                self._sort_field, self._sort_dir = key_or_list[0]
        else:
            self._sort_field = key_or_list
            self._sort_dir = direction if direction is not None else 1
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    def skip(self, n: int):
        self._skip_val = n
        return self

    # --- execution ---

    def _build_query(self):
        """Build SQL WHERE, ORDER BY, LIMIT, OFFSET parts and the filter params."""
        if self._filter:
            where_clause, params, next_param = _build_where_clause(self._filter)
            where = f"WHERE {where_clause}" if where_clause else ""
        else:
            where = ""
            params = []
            next_param = 1

        order = ""
        if self._sort_field:
            dir_str = "DESC" if self._sort_dir == -1 else "ASC"
            # ISO date strings sort correctly as text
            order = f"ORDER BY (data->>'{self._sort_field}') {dir_str} NULLS LAST"

        limit_clause = f"LIMIT {self._limit_val}" if self._limit_val is not None else ""
        offset_clause = f"OFFSET {self._skip_val}" if self._skip_val else ""

        sql = f"SELECT data FROM {self._table} {where} {order} {limit_clause} {offset_clause}".strip()
        return sql, params

    async def to_list(self, length=None):
        sql, params = self._build_query()
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        result = [_deserialize(r["data"]) for r in rows]
        if length is not None:
            result = result[:length]
        return result

    def __aiter__(self):
        return self._AsyncIterator(self)

    class _AsyncIterator:
        def __init__(self, cursor):
            self._cursor = cursor
            self._rows = None
            self._idx = 0

        async def __anext__(self):
            if self._rows is None:
                self._rows = await self._cursor.to_list()
            if self._idx >= len(self._rows):
                raise StopAsyncIteration
            row = self._rows[self._idx]
            self._idx += 1
            return row


def _apply_update_operators(doc: dict, update_dict: dict) -> dict:
    """Apply $set, $inc, $push, $addToSet to a document copy in Python."""
    result = dict(doc)

    if "$set" in update_dict:
        for k, v in update_dict["$set"].items():
            result[k] = v

    if "$inc" in update_dict:
        for k, v in update_dict["$inc"].items():
            current = result.get(k, 0) or 0
            result[k] = current + v

    if "$push" in update_dict:
        for k, v in update_dict["$push"].items():
            lst = result.get(k, [])
            if not isinstance(lst, list):
                lst = []
            lst = list(lst)
            lst.append(v)
            result[k] = lst

    if "$addToSet" in update_dict:
        for k, v in update_dict["$addToSet"].items():
            lst = result.get(k, [])
            if not isinstance(lst, list):
                lst = []
            lst = list(lst)
            if v not in lst:
                lst.append(v)
            result[k] = lst

    return result


def _doc_key(doc: dict) -> str:
    """Derive the _key (primary key) from a document. Uses 'id' field."""
    return str(doc.get("id") or doc.get("_id") or uuid.uuid4())


class Collection:
    """Thin Motor-compatible Collection wrapper over asyncpg + JSONB."""

    def __init__(self, pool_holder, name: str):
        self._pool_holder = pool_holder  # reference to the Database object holding the pool
        self._name = name

    @property
    def _pool(self):
        return self._pool_holder._pool

    async def _ensure_table(self):
        """Idempotently create the collection table (called by Database at startup)."""
        async with self._pool.acquire() as conn:
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {self._name} (
                    _key TEXT PRIMARY KEY,
                    data JSONB NOT NULL
                )
            """)
            await conn.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_{self._name}_data
                ON {self._name} USING GIN (data)
            """)

    # --- Motor-compatible methods ---

    async def find_one(self, filter_dict: dict, projection=None):
        """SELECT … WHERE <clause> LIMIT 1.  Supports complex MongoDB filter operators."""
        if not filter_dict:
            sql = f"SELECT data FROM {self._name} LIMIT 1"
            params = []
        else:
            where, params, _ = _build_where_clause(filter_dict)
            if where:
                sql = f"SELECT data FROM {self._name} WHERE {where} LIMIT 1"
            else:
                sql = f"SELECT data FROM {self._name} LIMIT 1"

        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(sql, *params)
        if row is None:
            return None
        return _deserialize(row["data"])

    def find(self, filter_dict: dict = None, projection=None):
        """Return a lazy _Cursor (supports .sort/.limit/.skip/.to_list/async for)."""
        return _Cursor(self._pool, self._name, filter_dict or {}, projection)

    async def insert_one(self, document: dict):
        """INSERT into the table. Ignores _id field."""
        doc = dict(document)
        doc.pop("_id", None)
        key = _doc_key(doc)
        async with self._pool.acquire() as conn:
            await conn.execute(
                f"INSERT INTO {self._name} (_key, data) VALUES ($1, $2::jsonb) ON CONFLICT (_key) DO NOTHING",
                key, _serialize(doc),
            )
        return type("InsertResult", (), {"inserted_id": key})()

    async def update_one(self, filter_dict: dict, update_dict: dict, upsert: bool = False):
        """SELECT, apply operators in Python, then UPDATE (or INSERT if upsert)."""
        async with self._pool.acquire() as conn:
            if filter_dict:
                where, params, _ = _build_where_clause(filter_dict)
                if where:
                    row = await conn.fetchrow(
                        f"SELECT _key, data FROM {self._name} WHERE {where} LIMIT 1",
                        *params,
                    )
                else:
                    row = await conn.fetchrow(f"SELECT _key, data FROM {self._name} LIMIT 1")
            else:
                row = await conn.fetchrow(f"SELECT _key, data FROM {self._name} LIMIT 1")

            if row:
                existing = _deserialize(row["data"])
                key = row["_key"]
                merged = _apply_update_operators(existing, update_dict)
                await conn.execute(
                    f"UPDATE {self._name} SET data = $1::jsonb WHERE _key = $2",
                    _serialize(merged), key,
                )
                return _UpdateResult(matched=1, modified=1)
            elif upsert:
                # Build a new document from $set fields + filter fields (skip operator keys)
                new_doc: dict = {k: v for k, v in filter_dict.items() if not k.startswith("$")}
                new_doc = _apply_update_operators(new_doc, update_dict)
                # Determine the storage key: prefer _id from filter, then id field
                if "_id" in filter_dict and isinstance(filter_dict["_id"], str):
                    key = filter_dict["_id"]
                else:
                    key = _doc_key(new_doc)
                    if "id" not in new_doc and "_id" not in new_doc:
                        new_doc["id"] = key
                await conn.execute(
                    f"INSERT INTO {self._name} (_key, data) VALUES ($1, $2::jsonb) "
                    f"ON CONFLICT (_key) DO UPDATE SET data = EXCLUDED.data",
                    key, _serialize(new_doc),
                )
                return _UpdateResult(matched=0, modified=0)
            else:
                return _UpdateResult(matched=0, modified=0)

    async def delete_one(self, filter_dict: dict):
        """DELETE one matching row."""
        async with self._pool.acquire() as conn:
            where, params, _ = _build_where_clause(filter_dict)
            if where:
                row = await conn.fetchrow(
                    f"SELECT _key FROM {self._name} WHERE {where} LIMIT 1", *params,
                )
            else:
                row = await conn.fetchrow(f"SELECT _key FROM {self._name} LIMIT 1")
            if row:
                await conn.execute(f"DELETE FROM {self._name} WHERE _key = $1", row["_key"])
                return _DeleteResult(1)
            return _DeleteResult(0)

    async def delete_many(self, filter_dict: dict):
        """DELETE all matching rows."""
        async with self._pool.acquire() as conn:
            if filter_dict:
                where, params, _ = _build_where_clause(filter_dict)
                if where:
                    result = await conn.execute(
                        f"DELETE FROM {self._name} WHERE {where}", *params,
                    )
                else:
                    result = await conn.execute(f"DELETE FROM {self._name}")
            else:
                result = await conn.execute(f"DELETE FROM {self._name}")
            # asyncpg returns "DELETE N" as a string
            try:
                count = int(result.split()[-1])
            except Exception:
                count = 0
            return _DeleteResult(count)

    async def count_documents(self, filter_dict: dict):
        """SELECT COUNT(*) with full operator support."""
        async with self._pool.acquire() as conn:
            if filter_dict:
                where, params, _ = _build_where_clause(filter_dict)
                if where:
                    row = await conn.fetchrow(
                        f"SELECT COUNT(*) AS cnt FROM {self._name} WHERE {where}", *params,
                    )
                else:
                    row = await conn.fetchrow(f"SELECT COUNT(*) AS cnt FROM {self._name}")
            else:
                row = await conn.fetchrow(f"SELECT COUNT(*) AS cnt FROM {self._name}")
            return row["cnt"] if row else 0

    async def estimated_document_count(self):
        return await self.count_documents({})

    async def create_index(self, *args, **kwargs):
        """No-op: PostgreSQL GIN index on JSONB handles all queries adequately."""
        return None

    async def aggregate(self, pipeline: list):
        """
        Minimal aggregate support for the patterns actually used in this codebase:
        - $group by a field with $sum: 1 → returns distinct values with counts
        - $sort, $limit, $project
        """
        return _AggCursor(self._pool, self._name, pipeline)

    async def distinct(self, field: str, filter_dict: dict = None):
        """Return distinct values of a JSONB field, optionally filtered."""
        if not _SAFE_FIELD_RE.match(field):
            raise ValueError(f"Invalid field name: {field!r}")
        async with self._pool.acquire() as conn:
            if filter_dict:
                where, params, _ = _build_where_clause(filter_dict)
                if where:
                    rows = await conn.fetch(
                        f"SELECT DISTINCT data->>'{field}' AS v FROM {self._name} WHERE {where}",
                        *params,
                    )
                else:
                    rows = await conn.fetch(
                        f"SELECT DISTINCT data->>'{field}' AS v FROM {self._name}"
                    )
            else:
                rows = await conn.fetch(
                    f"SELECT DISTINCT data->>'{field}' AS v FROM {self._name}"
                )
            return [r["v"] for r in rows if r["v"] is not None]


class _AggCursor:
    """Async iterable that executes a simplified aggregation pipeline."""

    def __init__(self, pool, table: str, pipeline: list):
        self._pool = pool
        self._table = table
        self._pipeline = pipeline
        self._rows: Optional[List[dict]] = None

    async def _execute(self) -> List[dict]:
        """Execute the pipeline by interpreting it step by step in Python."""
        # Step 1: fetch all documents (or filtered set)
        match_filter = {}
        group_id_field = None
        sum_field = None
        sort_spec = None
        limit_n = None
        project_spec = None

        for stage in self._pipeline:
            if "$match" in stage:
                match_filter = stage["$match"]
            elif "$group" in stage:
                group_id_field = stage["$group"].get("_id")
                # look for first $sum accumulator
                for k, v in stage["$group"].items():
                    if k == "_id":
                        continue
                    if isinstance(v, dict) and "$sum" in v:
                        sum_field = k
            elif "$sort" in stage:
                sort_spec = stage["$sort"]
            elif "$limit" in stage:
                limit_n = stage["$limit"]
            elif "$project" in stage:
                project_spec = stage["$project"]

        # Fetch docs
        async with self._pool.acquire() as conn:
            if match_filter:
                where_clause, params, _ = _build_where_clause(match_filter)
                if where_clause:
                    rows = await conn.fetch(
                        f"SELECT data FROM {self._table} WHERE {where_clause}", *params,
                    )
                else:
                    rows = await conn.fetch(f"SELECT data FROM {self._table}")
            else:
                rows = await conn.fetch(f"SELECT data FROM {self._table}")
        docs = [_deserialize(r["data"]) for r in rows]

        # Group
        if group_id_field is not None:
            # group_id_field is like "$subscription_plan" → field name is "subscription_plan"
            if isinstance(group_id_field, str) and group_id_field.startswith("$"):
                field_name = group_id_field[1:]
            else:
                field_name = group_id_field

            groups: dict = {}
            for doc in docs:
                val = doc.get(field_name)
                key = val  # None is valid
                groups.setdefault(key, 0)
                groups[key] += 1

            result_docs = [
                {"_id": k, (sum_field or "count"): v}
                for k, v in groups.items()
            ]
        else:
            result_docs = docs

        # Sort
        if sort_spec:
            for sort_field, sort_dir in reversed(list(sort_spec.items())):
                if sort_field == "_id":
                    result_docs.sort(key=lambda d: (d.get("_id") or ""), reverse=(sort_dir == -1))
                else:
                    result_docs.sort(key=lambda d: (d.get(sort_field) or 0), reverse=(sort_dir == -1))

        # Limit
        if limit_n is not None:
            result_docs = result_docs[:limit_n]

        # Project (very basic — just renames _id)
        if project_spec:
            new_docs = []
            for doc in result_docs:
                new_doc = {}
                for k, v in project_spec.items():
                    if v == 0:
                        # exclude
                        new_doc = {dk: dv for dk, dv in doc.items() if dk != k}
                    elif isinstance(v, str) and v.startswith("$"):
                        new_doc[k] = doc.get(v[1:])
                    elif v == 1:
                        if k in doc:
                            new_doc[k] = doc[k]
                new_docs.append(new_doc)
            result_docs = new_docs

        return result_docs

    async def to_list(self, length=None):
        rows = await self._execute()
        if length is not None:
            rows = rows[:length]
        return rows

    def __aiter__(self):
        return self._AsyncIterator(self)

    class _AsyncIterator:
        def __init__(self, agg_cursor):
            self._agg = agg_cursor
            self._rows = None
            self._idx = 0

        async def __anext__(self):
            if self._rows is None:
                self._rows = await self._agg._execute()
            if self._idx >= len(self._rows):
                raise StopAsyncIteration
            row = self._rows[self._idx]
            self._idx += 1
            return row


class Database:
    """Mimics a Motor database object. Attribute access → Collection proxy."""

    def __init__(self):
        self._pool = None
        self._collections: Dict[str, Collection] = {}

    def __getattr__(self, name: str) -> Collection:
        # Called for db.users, db.trades, etc.
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._collections:
            self._collections[name] = Collection(self, name)
        return self._collections[name]

    def __getitem__(self, name: str) -> Collection:
        # Called for db["trades"], db[coll], etc.
        return self.__getattr__(name)

    async def init_pool(self, database_url: str):
        # Detect Cloud SQL Unix socket (host=/cloudsql/...) vs TCP (Neon/Supabase/dev)
        is_unix_socket = "?host=/" in database_url or database_url.split("?")[0].count("/") > 3
        clean_url = database_url.split("?")[0]
        host_param = database_url.split("?host=")[1] if "?host=" in database_url else None

        if is_unix_socket and host_param:
            # Cloud SQL via Unix socket — SSL not applicable on socket connections
            self._pool = await asyncpg.create_pool(
                f"{clean_url}?host={host_param}",
                min_size=1, max_size=10,
            )
        else:
            import ssl as _ssl
            ssl_ctx = _ssl.create_default_context()
            self._pool = await asyncpg.create_pool(
                clean_url, ssl=ssl_ctx, min_size=1, max_size=10,
            )

    async def create_all_tables(self):
        """Create tables for all well-known collections upfront."""
        known = [
            "users", "trades", "calculations", "alerts", "portfolio",
            "password_resets", "revoked_tokens", "user_revocations",
            "user_states", "stock_cache", "payment_transactions",
            "stripe_webhook_logs", "admin_audit_log", "app_settings",
            "saved_positions", "coupons", "feature_flags",
            # Extended modules
            "referrals", "referral_redemptions",
            "password_reset_tokens", "email_verification_tokens",
        ]
        for name in known:
            coll = self.__getattr__(name)
            await coll._ensure_table()

    async def close(self):
        if self._pool:
            await self._pool.close()


# Global db object (pool is None until startup_event runs)
db = Database()

_DATABASE_URL = os.environ.get("DATABASE_URL", "")

# JWT Configuration
# 🔒 SECURITY: JWT_SECRET must be set via environment variable
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    # Generate a secure random secret for development (should be set in production)
    import secrets as sec
    JWT_SECRET = sec.token_urlsafe(32)
    print("⚠️  WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET env variable for production!")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
if not STRIPE_API_KEY:
    logging.warning("⚠️  STRIPE_API_KEY not set — payment endpoints will fail")
stripe.api_key = STRIPE_API_KEY

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'alerts@tradingcalculator.pro')

# Demo User (siempre tiene acceso PRO completo)
DEMO_EMAIL = os.environ.get('DEMO_EMAIL', "demo@btccalc.pro")
DEMO_PASSWORD = os.environ.get('DEMO_PASSWORD', "12345678")

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "monthly":   {"name": "Mensual",     "price": 17.00,  "currency": "EUR", "interval": "month",    "days": 30,    "stripe_price_id": "price_1TXM8EImYjMeegYBvEaA8LxH", "klarna": False},
    "quarterly": {"name": "Trimestral",  "price": 45.00,  "currency": "EUR", "interval": "quarter",  "days": 90,    "stripe_price_id": "price_1TXM8KImYjMeegYB71T1UNaW", "klarna": False},
    "annual":    {"name": "Anual",       "price": 200.00, "currency": "EUR", "interval": "year",     "days": 365,   "stripe_price_id": "price_1TXM8QImYjMeegYBS4svthyq", "klarna": False},
    "lifetime":  {"name": "De Por Vida", "price": 500.00, "currency": "EUR", "interval": "lifetime", "days": 36500, "stripe_price_id": "price_1TXM8YImYjMeegYBouBCvmC0", "klarna": True},
}

app = FastAPI(title="Trading Calculator PRO API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============================================================
#  Rate limiting (slowapi) — applied to brute-force-prone routes
# ============================================================
limiter = Limiter(key_func=get_remote_address, default_limits=[])
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": f"Demasiados intentos, espera un momento. Límite: {exc.detail}"},
    )


app.add_middleware(SlowAPIMiddleware)

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TradeEntry(BaseModel):
    symbol: str
    direction: str  # "long" or "short"
    entryPrice: float
    exitPrice: Optional[float] = None
    quantity: float
    leverage: float = 1.0
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    status: str = "open"  # "open" or "closed"

class PortfolioAsset(BaseModel):
    symbol: str
    quantity: float
    avgPrice: float
    targetAllocation: Optional[float] = None

class PriceAlert(BaseModel):
    symbol: str
    targetPrice: float
    condition: str  # "above" or "below"
    notifyEmail: bool = True

class ChangePlanRequest(BaseModel):
    new_plan_id: str

class CancelSubscriptionRequest(BaseModel):
    immediate: bool = False  # If True, cancel immediately. If False, cancel at period end

class EmailAlertRequest(BaseModel):
    email: str
    symbol: str
    currentPrice: float
    targetPrice: float
    condition: str

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def hash_password_async(password: str) -> str:
    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    return await loop.run_in_executor(None, hash_password, password)

async def verify_password_async(password: str, hashed: str) -> bool:
    import asyncio as _asyncio
    loop = _asyncio.get_event_loop()
    return await loop.run_in_executor(None, verify_password, password, hashed)


def _hash_token(token: str) -> str:
    """SHA-256 hash a one-time token before storing it in the DB."""
    return hashlib.sha256(token.encode()).hexdigest()


# ============================================================
#  JWT (with revocable tokens via `jti` blacklist)
# ============================================================
def create_token(user_id: str, email: str) -> str:
    """Issue a JWT carrying a unique `jti` so we can revoke individual sessions."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "email": email,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def _is_token_revoked(payload: dict) -> bool:
    """Quick BL lookup. Older tokens (no `jti`) are still accepted for backwards compat."""
    jti = payload.get("jti")
    if not jti:
        return False
    return bool(await db.revoked_tokens.find_one({"jti": jti}, {"_id": 1}))


async def _revoke_token(payload: dict) -> None:
    """Insert the token's jti into the blacklist so subsequent requests fail."""
    jti = payload.get("jti")
    if not jti:
        return  # nothing to revoke
    exp = payload.get("exp")
    expires_at = (
        datetime.fromtimestamp(exp, tz=timezone.utc)
        if isinstance(exp, (int, float))
        else datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    )
    await db.revoked_tokens.update_one(
        {"jti": jti},
        {"$set": {
            "jti": jti,
            "user_id": payload.get("user_id"),
            "expires_at": expires_at,
            "revoked_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )


async def _revoke_all_tokens_for_user(user_id: str) -> int:
    """Best-effort: scan recently-issued sessions and revoke them. Used when admin
    resets a user's password so old tokens stop working immediately."""
    # We don't track issued tokens explicitly; instead we insert a "user-wide"
    # revocation marker that `require_user` will honor.
    await db.user_revocations.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "revoked_after": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS + 1),
        }},
        upsert=True,
    )
    return 1


async def _is_user_session_revoked(payload: dict) -> bool:
    """If admin reset password, old tokens issued *before* `revoked_after` are dead."""
    user_id = payload.get("user_id")
    iat = payload.get("iat")
    if not user_id or not iat:
        return False
    iat_dt = datetime.fromtimestamp(iat, tz=timezone.utc) if isinstance(iat, (int, float)) else None
    if not iat_dt:
        return False
    rec = await db.user_revocations.find_one({"user_id": user_id}, {"_id": 0, "revoked_after": 1})
    if not rec or not rec.get("revoked_after"):
        return False
    revoked_after = rec["revoked_after"]
    if isinstance(revoked_after, str):
        try:
            revoked_after = datetime.fromisoformat(revoked_after.replace("Z", "+00:00"))
        except ValueError:
            return False
    elif isinstance(revoked_after, datetime):
        # Ensure timezone-aware comparison
        if revoked_after.tzinfo is None:
            revoked_after = revoked_after.replace(tzinfo=timezone.utc)
    return iat_dt < revoked_after


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if await _is_token_revoked(payload) or await _is_user_session_revoked(payload):
            return None
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None

async def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    payload = decode_token(credentials.credentials)
    if await _is_token_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión revocada (logout)")
    if await _is_user_session_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión expirada por cambio de contraseña")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Gate-keeper for admin-only endpoints. Returns the admin user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    payload = decode_token(credentials.credentials)
    if await _is_token_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión revocada (logout)")
    if await _is_user_session_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión expirada por cambio de contraseña")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acceso restringido")
    return user


# ============================================================
#  ADMIN AUDIT LOG  (every admin write goes through here)
# ============================================================
def _client_ip(request: Optional[Request]) -> str:
    if not request:
        return ""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


async def log_admin_action(
    *,
    admin: dict,
    action: str,
    target_type: str = "",
    target_id: str = "",
    target_email: str = "",
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> None:
    """Persist an admin action to `admin_audit_log`. Never raises."""
    try:
        await db.admin_audit_log.insert_one({
            "id": str(uuid.uuid4()),
            "admin_id": admin.get("id"),
            "admin_email": admin.get("email"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "target_email": target_email,
            "details": details or {},
            "ip": _client_ip(request),
            "user_agent": (request.headers.get("user-agent") if request else "") or "",
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as e:
        logging.error(f"audit log failed for action={action}: {e}")

def check_premium(user: dict) -> bool:
    """Check if user has premium access. Demo user always has premium."""
    if not user:
        return False
    # Demo user always has full PRO access
    if user.get("email") == DEMO_EMAIL:
        return True
    if user.get("subscription_plan") == "lifetime":
        return True
    if user.get("subscription_end"):
        end_date = datetime.fromisoformat(user["subscription_end"].replace('Z', '+00:00'))
        return end_date > datetime.now(timezone.utc)
    return False

# ============= STARTUP - Create Demo User =============

@app.on_event("startup")
async def startup_event():
    """Initialise asyncpg pool, create tables, seed demo user."""

    # ── Connect to PostgreSQL ────────────────────────────────────────────
    _db_ready = False
    if not _DATABASE_URL:
        logging.error("DATABASE_URL env var is not set — database will not work")
    else:
        try:
            await db.init_pool(_DATABASE_URL)
            await db.create_all_tables()
            logging.info("PostgreSQL pool initialised and tables ensured")
            _db_ready = True
        except Exception as e:
            logging.error(f"Could not initialise PostgreSQL: {e}", exc_info=True)

    if not _db_ready:
        logging.warning("Skipping post-startup DB tasks — database not available")
        return

    # ── Seed demo user ───────────────────────────────────────────────────
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if not existing:
        demo_user = {
            "id": "demo-user-001",
            "email": DEMO_EMAIL,
            "password": hash_password(DEMO_PASSWORD),
            "name": "Demo Trader",
            "subscription_plan": "lifetime",
            "subscription_end": None,
            "is_premium": True,
            "is_admin": True,
            "auth_provider": "password",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(demo_user)
        logging.info("Demo user created: demo@btccalc.pro (admin)")
    else:
        # Idempotent self-heal: ensure demo always has admin + lifetime premium.
        patch: Dict[str, Any] = {}
        if not existing.get("is_admin"):
            patch["is_admin"] = True
        if existing.get("subscription_plan") != "lifetime":
            patch["subscription_plan"] = "lifetime"
        if not existing.get("auth_provider"):
            patch["auth_provider"] = "password"
        if patch:
            await db.users.update_one({"email": DEMO_EMAIL}, {"$set": patch})
            logging.info("Demo user patched: %s", patch)

    # ── Extended modules ─────────────────────────────────────────────────
    try:
        from missing_apis import ensure_missing_api_indexes
        from referrals import ensure_referral_indexes
        from realtime_alerts import start_poller

        await ensure_missing_api_indexes(db)
        await ensure_referral_indexes(db)
        start_poller()
        logging.info("✅ Extended modules: indexes ensured & WS poller started")
    except Exception as e:
        logging.error(f"Extended modules startup error: {e}", exc_info=True)

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=dict)
@limiter.limit("3/hour")
async def register(request: Request, user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": await hash_password_async(user_data.password),
        "name": user_data.name,
        "subscription_plan": None,
        "subscription_end": None,
        "is_premium": False,
        "is_admin": False,
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    try:
        import asyncio as _asyncio
        _asyncio.create_task(_send_welcome_email(user_data.email, user_data.name))
    except Exception:
        pass

    token = create_token(user_id, user_data.email)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "subscription_plan": None,
            "subscription_end": None,
            "is_premium": False,
            "is_admin": False,
            "auth_provider": "password",
        }
    }

@api_router.post("/auth/login", response_model=dict)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not user.get("password") or not await verify_password_async(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_seen": now_iso}, "$inc": {"login_count": 1}},
    )

    token = create_token(user["id"], user["email"])
    is_premium = check_premium(user)

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
            "is_premium": is_premium,
            "is_admin": bool(user.get("is_admin")),
            "auth_provider": user.get("auth_provider", "password"),
            "last_seen": now_iso,
            "login_count": (user.get("login_count") or 0) + 1,
        }
    }

async def _sync_stripe_subscription(user: dict) -> None:
    """If subscription_end is in the past and user has a stripe_customer_id,
    re-verify against Stripe and update the local DB if expired."""
    if not user.get("stripe_customer_id"):
        return
    if user.get("subscription_plan") == "lifetime":
        return
    sub_end = user.get("subscription_end")
    if not sub_end:
        return
    try:
        end_dt = datetime.fromisoformat(sub_end.replace('Z', '+00:00'))
    except ValueError:
        return
    if end_dt > datetime.now(timezone.utc):
        return  # still valid locally, no need to call Stripe
    try:
        subs = stripe.Subscription.list(
            customer=user["stripe_customer_id"], status="active", limit=1
        )
        if subs.data:
            sub = subs.data[0]
            new_end = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc).isoformat()
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"subscription_end": new_end, "is_premium": True}},
            )
            logging.info("[auth/me] Stripe sync: extended subscription for %s → %s", user["id"], new_end)
        else:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"is_premium": False, "subscription_plan": None, "subscription_end": None}},
            )
            logging.info("[auth/me] Stripe sync: subscription expired for %s", user["id"])
    except Exception as exc:
        logging.warning("[auth/me] Stripe sync failed for %s: %s", user["id"], exc)


@api_router.get("/auth/me", response_model=dict)
async def get_me(user: dict = Depends(require_user)):
    await _sync_stripe_subscription(user)
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0}) or user
    is_premium = check_premium(user)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
    )
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "subscription_plan": user.get("subscription_plan"),
        "subscription_end": user.get("subscription_end"),
        "is_premium": is_premium,
        "is_admin": bool(user.get("is_admin")),
        "auth_provider": user.get("auth_provider", "password"),
        "picture": user.get("picture"),
        "last_seen": user.get("last_seen"),
        "login_count": user.get("login_count", 0),
    }


@api_router.post("/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Revoke the caller's JWT so it cannot be reused even if leaked."""
    if not credentials:
        return {"ok": True, "revoked": False}
    try:
        payload = decode_token(credentials.credentials)
    except HTTPException:
        return {"ok": True, "revoked": False}
    await _revoke_token(payload)
    return {"ok": True, "revoked": True}


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ============= MAGIC LINK (Passwordless) =============

class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerifyRequest(BaseModel):
    token: str


@api_router.post("/auth/magic-link")
@limiter.limit("3/hour")
async def request_magic_link(request: Request, body: MagicLinkRequest):
    """Send a one-time login link to the user's email. Creates account if it doesn't exist."""
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Auto-create a passwordless account
        import uuid as _uuid
        user = {
            "id": str(_uuid.uuid4()),
            "email": email,
            "name": email.split("@")[0].replace(".", " ").title(),
            "auth_provider": "magic_link",
            "password": None,
            "is_admin": False,
            "is_premium": False,
            "subscription_plan": None,
            "subscription_end": None,
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "login_count": 0,
        }
        await db.users.insert_one(user)

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.password_resets.insert_one({
        "token": _hash_token(token),
        "user_id": user["id"],
        "email": email,
        "type": "magic_link",
        "used": False,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    frontend_url = os.environ.get("FRONTEND_URL", "https://tradingcalculator.pro")
    magic_url = f"{frontend_url}/magic?token={token}"
    # Send email (non-blocking)
    import asyncio as _asyncio
    _asyncio.create_task(_send_magic_link_email(email, user.get("name", ""), magic_url))
    # In dev (no SendGrid), log the link
    if not SENDGRID_API_KEY:
        logging.info(f"[magic-link] DEV MODE — link for {email}: {magic_url}")
    return {"ok": True, "message": "Si el email existe, recibirás el enlace en breve."}


@api_router.post("/auth/magic-link/verify")
@limiter.limit("10/minute")
async def verify_magic_link(request: Request, body: MagicLinkVerifyRequest):
    """Exchange a magic link token for a session JWT."""
    record = await db.password_resets.find_one(
        {"token": _hash_token(body.token), "used": False, "type": "magic_link"}, {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Enlace inválido o ya utilizado")
    expires = datetime.fromisoformat(record["expires_at"])
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace ha expirado (15 minutos). Solicita uno nuevo.")
    await db.password_resets.update_one({"token": _hash_token(body.token)}, {"$set": {"used": True}})
    user = await db.users.find_one({"id": record["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "login_count": (user.get("login_count") or 0) + 1,
        "auth_provider": user.get("auth_provider") or "magic_link",
    }})
    token = create_token(user["id"], user["email"])
    return {
        "access_token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "is_admin": user.get("is_admin", False),
            "is_premium": user.get("is_premium", False),
            "subscription_plan": user.get("subscription_plan"),
            "auth_provider": user.get("auth_provider", "magic_link"),
        },
    }


async def _send_magic_link_email(to_email: str, name: str, magic_url: str) -> None:
    if not SENDGRID_API_KEY:
        return
    try:
        import httpx as _httpx
        payload = {
            "personalizations": [{"to": [{"email": to_email, "name": name}]}],
            "from": {"email": SENDER_EMAIL, "name": "Trading Calculator PRO"},
            "subject": "Tu enlace de acceso — Trading Calculator PRO",
            "content": [{"type": "text/html", "value": f"""
<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
  <h2 style="color:#10b981">Trading Calculator PRO</h2>
  <p>Hola {name},</p>
  <p>Haz clic en el botón para iniciar sesión. El enlace expira en <strong>15 minutos</strong>.</p>
  <a href="{magic_url}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 28px;
     border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
    Iniciar sesión →
  </a>
  <p style="color:#888;font-size:12px">Si no solicitaste este enlace, ignora este email.</p>
</div>"""}],
        }
        async with _httpx.AsyncClient(timeout=10) as c:
            await c.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
            )
    except Exception as e:
        logging.warning(f"[magic-link] email error: {e}")


@api_router.post("/auth/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, body: ForgotPasswordRequest):
    """Generate a password-reset token, store it in DB, and email the reset link."""
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    # Always return 200 to prevent email enumeration
    if not user:
        return {"ok": True}

    reset_token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    await db.password_resets.update_one(
        {"user_id": user["id"]},
        {"$set": {"token": _hash_token(reset_token), "expires_at": expires_at, "used": False}},
        upsert=True,
    )

    frontend_url = os.environ.get("FRONTEND_URL", "https://tradingcalculator.pro")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    try:
        import asyncio as _asyncio
        _asyncio.create_task(_send_password_reset_email(user["email"], user.get("name", ""), reset_url))
    except Exception:
        pass
    return {"ok": True}


@api_router.post("/auth/reset-password")
@limiter.limit("5/hour")
async def reset_password(request: Request, body: ResetPasswordRequest):
    """Consume a reset token and set a new password."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    record = await db.password_resets.find_one({"token": _hash_token(body.token), "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="Token inválido o ya utilizado")

    expires = datetime.fromisoformat(record["expires_at"])
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace ha expirado. Solicita uno nuevo.")

    await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"password": hash_password(body.new_password)}},
    )
    await db.password_resets.update_one({"token": _hash_token(body.token)}, {"$set": {"used": True}})
    # Revoke all existing sessions so old tokens stop working
    await db.user_revocations.update_one(
        {"user_id": record["user_id"]},
        {"$set": {"revoked_after": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "message": "Contraseña actualizada correctamente"}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@api_router.post("/auth/change-password")
@limiter.limit("5/hour")
async def change_password(request: Request, body: ChangePasswordRequest, user: dict = Depends(require_user)):
    """Authenticated user changes their own password."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")

    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 1})
    if not user_doc or not user_doc.get("password"):
        raise HTTPException(status_code=400, detail="Esta cuenta usa login con Google. Usa la opción de Google para gestionar tu contraseña.")

    if not verify_password(body.current_password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": hash_password(body.new_password)}},
    )
    # Revoke all existing sessions (force re-login)
    await db.user_revocations.update_one(
        {"user_id": user["id"]},
        {"$set": {"revoked_after": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "message": "Contraseña cambiada correctamente. Por seguridad, vuelve a iniciar sesión."}


@api_router.delete("/auth/account")
@limiter.limit("3/hour")
async def delete_account(request: Request, user: dict = Depends(require_user)):
    """RGPD: permanently delete the authenticated user's account and all data."""
    user_id = user["id"]
    # Delete all user data across collections
    for collection in ["trades", "calculations", "alerts", "portfolio",
                        "user_states", "payment_transactions", "performance_trades"]:
        try:
            await getattr(db, collection).delete_many({"user_id": user_id})
        except Exception:
            pass
    await db.users.delete_one({"id": user_id})
    logging.info(f"[RGPD] Account deleted: {user_id}")
    return {"ok": True, "message": "Cuenta eliminada permanentemente"}


@api_router.get("/auth/my-data")
@limiter.limit("5/hour")
async def export_my_data(request: Request, user: dict = Depends(require_user)):
    """RGPD Art. 20 — portabilidad de datos. Devuelve todos los datos del usuario en JSON."""
    import json as _json
    user_id = user["id"]
    safe_user = {k: v for k, v in user.items() if k not in ("password",)}

    async def collect(collection, query):
        try:
            return await getattr(db, collection).find(query, {"_id": 0})
        except Exception:
            return []

    trades        = await collect("trades",            {"user_id": user_id})
    calculations  = await collect("calculations",      {"user_id": user_id})
    alerts        = await collect("alerts",            {"user_id": user_id})
    performance   = await collect("performance_trades",{"user_id": user_id})

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile":      safe_user,
        "trades":       trades,
        "calculations": calculations,
        "alerts":       alerts,
        "performance":  performance,
    }

    filename = f"my-data-{user_id[:8]}.json"
    return Response(
        content=_json.dumps(payload, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============= GOOGLE OAUTH =============
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")


class GoogleAuthRequest(BaseModel):
    """Payload sent by the SPA after Google's button returns an ID token."""
    credential: str  # the Google-issued ID token (JWT signed by Google)


@api_router.post("/auth/google")
@limiter.limit("10/minute")
async def google_auth(request: Request, payload: GoogleAuthRequest):
    """
    Verify a Google ID token, then return our own JWT.

    Flow:
      1. SPA shows Google button (`<GoogleLogin/>`).
      2. On success Google returns an `id_token` JWT, signed by Google.
      3. SPA POSTs it to this endpoint as `{credential: <jwt>}`.
      4. We verify the signature against Google's public certs, extract email,
         look up or create our app's user, and issue our own JWT.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth no está configurado en el servidor")

    try:
        # `verify_oauth2_token` checks signature, audience, expiration & issuer.
        info = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        # Bad signature, expired token, or wrong audience
        logging.warning("Google token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Token de Google inválido") from exc

    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Cuenta de Google sin email verificado")

    # Look up by email, otherwise create a passwordless user with `auth_provider=google`.
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": email,
            "password": None,                  # no password for Google users
            "name": info.get("name") or email.split("@")[0],
            "picture": info.get("picture"),
            "subscription_plan": None,
            "subscription_end": None,
            "is_premium": False,
            "is_admin": False,
            "auth_provider": "google",
            "google_sub": info.get("sub"),     # stable Google user id
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        # Backfill picture / google_sub on existing accounts that registered with email/password.
        updates = {}
        if not user.get("google_sub"):
            updates["google_sub"] = info.get("sub")
        if not user.get("picture") and info.get("picture"):
            updates["picture"] = info.get("picture")
        if updates:
            await db.users.update_one({"id": user["id"]}, {"$set": updates})
            user.update(updates)

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
            "is_premium": check_premium(user),
            "is_admin": bool(user.get("is_admin")),
            "auth_provider": user.get("auth_provider", "google"),
        },
    }

# ============= PRICES - Real-time Data =============

@api_router.get("/prices")
async def get_prices():
    """Real-time crypto prices from CoinGecko + real commodities (gold, silver, oil) from yfinance."""
    data: Dict[str, Any] = {}
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,avalanche-2,polkadot,chainlink,litecoin",
                    "vs_currencies": "usd,eur",
                    "include_24hr_change": "true",
                    "include_24hr_vol": "true"
                },
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
    except Exception as e:
        logging.error(f"Error fetching crypto prices: {e}")

    # Crypto fallback if CoinGecko failed entirely
    if not data:
        data = {
            "bitcoin": {"usd": 97000, "eur": 89000, "usd_24h_change": 2.1},
            "ethereum": {"usd": 3600, "eur": 3300, "usd_24h_change": 1.5},
            "solana": {"usd": 195, "eur": 178, "usd_24h_change": 3.2},
            "binancecoin": {"usd": 680, "eur": 620, "usd_24h_change": 1.1},
            "ripple": {"usd": 0.62, "eur": 0.57, "usd_24h_change": 0.8},
            "cardano": {"usd": 0.48, "eur": 0.44, "usd_24h_change": -0.5},
            "dogecoin": {"usd": 0.14, "eur": 0.13, "usd_24h_change": 4.2},
            "avalanche-2": {"usd": 38, "eur": 35, "usd_24h_change": 2.1},
            "polkadot": {"usd": 7.8, "eur": 7.1, "usd_24h_change": 1.3},
            "chainlink": {"usd": 16, "eur": 14.5, "usd_24h_change": 0.7},
            "litecoin": {"usd": 88, "eur": 80, "usd_24h_change": 1.2},
        }

    # ── REAL commodities via yfinance (GC=F gold, SI=F silver, CL=F oil) ──
    try:
        import yfinance as yf
        eur_usd = 0.92
        try:
            fx = yf.Ticker("EURUSD=X").history(period="2d")
            if not fx.empty:
                eur_usd = 1 / float(fx["Close"].iloc[-1])
        except Exception:
            pass
        commodity_map = {"gold": "GC=F", "silver": "SI=F", "oil": "CL=F"}
        for label, sym in commodity_map.items():
            try:
                t = yf.Ticker(sym)
                hist = t.history(period="2d")
                if hist.empty:
                    continue
                price = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else price
                change = round((price - prev) / prev * 100, 4) if prev else 0.0
                data[label] = {
                    "usd": round(price, 4),
                    "eur": round(price * eur_usd, 4),
                    "usd_24h_change": change,
                }
            except Exception as ce:
                logging.warning(f"Commodity {label} ({sym}) fetch error: {ce}")
        # Static fallback only if yfinance returned nothing
        data.setdefault("gold",   {"usd": 2680.0, "eur": 2450.0, "usd_24h_change": 0.5})
        data.setdefault("silver", {"usd": 31.50,  "eur": 28.80,  "usd_24h_change": 0.8})
    except Exception as e:
        logging.error(f"Commodities (yfinance) error: {e}")
        data.setdefault("gold",   {"usd": 2680.0, "eur": 2450.0, "usd_24h_change": 0.5})
        data.setdefault("silver", {"usd": 31.50,  "eur": 28.80,  "usd_24h_change": 0.8})

    return data

# Note: /forex-prices, /indices-prices, /commodities-prices, /ohlc/{symbol} (universal)
# are provided by `missing_apis.py` (registered at startup with REAL data via yfinance).

_COINGECKO_COIN_MAP: Dict[str, str] = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin",
    "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin", "AVAX": "avalanche-2",
    "DOT": "polkadot", "LINK": "chainlink", "LTC": "litecoin",
}


def _pick_ohlc_interval_ms(days: int) -> int:
    """Pick aggregation bucket size (ms) based on the requested time range."""
    if days <= 7:
        return 3600 * 1000               # 1 hour
    if days <= 30:
        return 4 * 3600 * 1000           # 4 hours
    return 24 * 3600 * 1000              # 1 day


def _candle_from_bucket(bucket_start_ms: int, prices: List[float]) -> Dict[str, Any]:
    """Build an OHLC candle from the prices that fell into one time bucket."""
    return {
        "time": bucket_start_ms // 1000,
        "open": prices[0],
        "high": max(prices),
        "low": min(prices),
        "close": prices[-1],
    }


def _group_prices_into_ohlc(
    prices: List[List[float]], interval_ms: int
) -> List[Dict[str, Any]]:
    """Group raw [timestamp_ms, price] tuples into OHLC candles."""
    ohlc: List[Dict[str, Any]] = []
    bucket_start: Optional[int] = None
    bucket_prices: List[float] = []

    for timestamp, price in prices:
        interval_start = (int(timestamp) // interval_ms) * interval_ms
        if bucket_start is None or interval_start != bucket_start:
            if bucket_prices and bucket_start is not None:
                ohlc.append(_candle_from_bucket(bucket_start, bucket_prices))
            bucket_start = interval_start
            bucket_prices = [price]
        else:
            bucket_prices.append(price)

    if bucket_prices and bucket_start is not None:
        ohlc.append(_candle_from_bucket(bucket_start, bucket_prices))
    return ohlc


@api_router.get("/ohlc/{symbol}")
async def get_ohlc_data(symbol: str, days: int = 30) -> Dict[str, Any]:
    """Universal OHLC for ANY asset (crypto, stocks, forex, indices, commodities).
    1) Try CoinGecko (for known crypto). 2) Fall back to yfinance for any symbol."""
    sym_upper = symbol.upper()
    empty: Dict[str, Any] = {"ohlc": [], "symbol": sym_upper, "source": "none"}

    # 1) CoinGecko for the well-known crypto coins
    coin_id = _COINGECKO_COIN_MAP.get(sym_upper)
    if coin_id:
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart",
                    params={"vs_currency": "usd", "days": days},
                    timeout=15.0,
                )
            if response.status_code == 200:
                prices = response.json().get("prices", [])
                if prices:
                    ohlc = _group_prices_into_ohlc(prices, _pick_ohlc_interval_ms(days))
                    return {"ohlc": ohlc, "symbol": sym_upper, "source": "coingecko"}
        except Exception as e:
            logging.warning(f"CoinGecko OHLC for {sym_upper}: {e}")

    # 2) yfinance fallback — works for stocks, forex (EURUSD=X), indices (^GSPC),
    #    commodities (GC=F), and any crypto via SYMBOL-USD pair.
    try:
        import yfinance as yf
        if days <= 7:
            interval = "1h"
        elif days <= 60:
            interval = "1d"
        else:
            interval = "1wk"
        period_str = f"{days}d" if days <= 730 else "2y"

        candidate_symbols = [symbol]
        if not any(c in symbol for c in ["-", "=", "^", "."]):
            candidate_symbols.append(f"{sym_upper}-USD")  # try crypto pair

        for cand in candidate_symbols:
            try:
                hist = yf.Ticker(cand).history(period=period_str, interval=interval)
                if hist.empty:
                    continue
                candles = []
                for idx, row in hist.iterrows():
                    candles.append({
                        "time": int(idx.timestamp()),
                        "open":  round(float(row["Open"]), 6),
                        "high":  round(float(row["High"]), 6),
                        "low":   round(float(row["Low"]), 6),
                        "close": round(float(row["Close"]), 6),
                        "volume": float(row.get("Volume", 0) or 0),
                    })
                if candles:
                    return {"ohlc": candles, "symbol": sym_upper, "source": "yfinance"}
            except Exception as e:
                logging.warning(f"yfinance OHLC for {cand}: {e}")

    except Exception as e:
        logging.error(f"OHLC error: {e}")

    return empty

# ============= TRADING JOURNAL =============

@api_router.post("/journal/trades")
async def create_trade(trade: TradeEntry, user: dict = Depends(require_user)):
    trade_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **trade.dict(),
        "pnl": None,
        "roe": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate P&L if trade is closed
    if trade.status == "closed" and trade.exitPrice:
        if trade.direction == "long":
            pnl = (trade.exitPrice - trade.entryPrice) * trade.quantity * trade.leverage
            roe = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * trade.leverage
        else:
            pnl = (trade.entryPrice - trade.exitPrice) * trade.quantity * trade.leverage
            roe = ((trade.entryPrice - trade.exitPrice) / trade.entryPrice) * 100 * trade.leverage
        trade_doc["pnl"] = round(pnl, 2)
        trade_doc["roe"] = round(roe, 2)
    
    await db.trades.insert_one(trade_doc)
    trade_doc.pop("_id", None)
    return trade_doc

@api_router.get("/journal/trades")
async def get_trades(user: dict = Depends(require_user), limit: int = 100):
    trades = await db.trades.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return trades

@api_router.put("/journal/trades/{trade_id}")
async def update_trade(trade_id: str, updates: dict, user: dict = Depends(require_user)):
    trade = await db.trades.find_one({"id": trade_id, "user_id": user["id"]})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade no encontrado")
    
    # Recalculate P&L if closing
    if updates.get("status") == "closed" and updates.get("exitPrice"):
        direction = trade.get("direction", updates.get("direction"))
        entry = trade.get("entryPrice", updates.get("entryPrice"))
        exit_price = updates.get("exitPrice")
        quantity = trade.get("quantity", updates.get("quantity", 1))
        leverage = trade.get("leverage", updates.get("leverage", 1))
        
        if direction == "long":
            pnl = (exit_price - entry) * quantity * leverage
            roe = ((exit_price - entry) / entry) * 100 * leverage
        else:
            pnl = (entry - exit_price) * quantity * leverage
            roe = ((entry - exit_price) / entry) * 100 * leverage
        
        updates["pnl"] = round(pnl, 2)
        updates["roe"] = round(roe, 2)
    
    await db.trades.update_one(
        {"id": trade_id, "user_id": user["id"]},
        {"$set": updates}
    )
    return {"message": "Trade actualizado"}

@api_router.delete("/journal/trades/{trade_id}")
async def journal_delete_trade(trade_id: str, user: dict = Depends(require_user)):
    result = await db.trades.delete_one({"id": trade_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade no encontrado")
    return {"message": "Trade eliminado"}

def _empty_journal_stats() -> Dict[str, Any]:
    return {
        "totalTrades": 0, "wins": 0, "losses": 0, "winRate": 0,
        "totalPnl": 0, "avgWin": 0, "avgLoss": 0,
        "profitFactor": 0, "expectancy": 0,
        "maxDrawdown": 0, "consecutiveLosses": 0,
    }


def _aggregate_journal_trades(trades: List[Dict[str, Any]]) -> Dict[str, float]:
    """Single-pass aggregation over a list of closed trades."""
    agg = {
        "total_pnl": 0.0, "gross_profit": 0.0, "gross_loss": 0.0,
        "wins": 0, "losses": 0,
        "max_consecutive_losses": 0, "max_drawdown": 0.0,
    }
    current_streak = 0
    equity = 0.0
    peak = 0.0

    for trade in trades:
        pnl = trade.get("pnl", 0) or 0
        agg["total_pnl"] += pnl
        if pnl > 0:
            agg["wins"] += 1
            agg["gross_profit"] += pnl
            current_streak = 0
        else:
            agg["losses"] += 1
            agg["gross_loss"] += abs(pnl)
            current_streak += 1
            if current_streak > agg["max_consecutive_losses"]:
                agg["max_consecutive_losses"] = current_streak
        equity += pnl
        if equity > peak:
            peak = equity
        drawdown = peak - equity
        if drawdown > agg["max_drawdown"]:
            agg["max_drawdown"] = drawdown
    return agg


def _journal_stats_from_aggregate(agg: Dict[str, float], total: int) -> Dict[str, Any]:
    """Derive the public stats dict from the aggregate counters."""
    wins, losses = agg["wins"], agg["losses"]
    avg_win = agg["gross_profit"] / wins if wins else 0
    avg_loss = -agg["gross_loss"] / losses if losses else 0
    profit_factor = agg["gross_profit"] / agg["gross_loss"] if agg["gross_loss"] > 0 else 0
    win_rate = (wins / total) * 100 if total else 0
    expectancy = (win_rate / 100 * avg_win) + ((100 - win_rate) / 100 * avg_loss)
    return {
        "totalTrades": total,
        "wins": wins,
        "losses": losses,
        "winRate": round(win_rate, 2),
        "totalPnl": round(agg["total_pnl"], 2),
        "avgWin": round(avg_win, 2),
        "avgLoss": round(avg_loss, 2),
        "profitFactor": round(profit_factor, 2),
        "expectancy": round(expectancy, 2),
        "maxDrawdown": round(agg["max_drawdown"], 2),
        "consecutiveLosses": agg["max_consecutive_losses"],
    }


@api_router.get("/journal/stats")
async def get_journal_stats(user: dict = Depends(require_user)) -> Dict[str, Any]:
    """Get trading statistics from the user's closed trades."""
    trades = await db.trades.find(
        {"user_id": user["id"], "status": "closed"},
        {"_id": 0},
    ).to_list(1000)
    if not trades:
        return _empty_journal_stats()
    agg = _aggregate_journal_trades(trades)
    return _journal_stats_from_aggregate(agg, len(trades))

# ============= PORTFOLIO =============

@api_router.get("/portfolio")
async def get_portfolio(user: dict = Depends(require_user)):
    portfolio = await db.portfolio.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    return portfolio

@api_router.post("/portfolio")
async def add_portfolio_asset(asset: PortfolioAsset, user: dict = Depends(require_user)):
    asset_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **asset.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolio.insert_one(asset_doc)
    return {"id": asset_doc["id"], "message": "Activo añadido al portfolio"}

@api_router.put("/portfolio/{asset_id}")
async def update_portfolio_asset(asset_id: str, updates: dict, user: dict = Depends(require_user)):
    result = await db.portfolio.update_one(
        {"id": asset_id, "user_id": user["id"]},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    return {"message": "Activo actualizado"}

@api_router.delete("/portfolio/{asset_id}")
async def delete_portfolio_asset(asset_id: str, user: dict = Depends(require_user)):
    result = await db.portfolio.delete_one({"id": asset_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    return {"message": "Activo eliminado"}

@api_router.get("/portfolio/rebalance")
async def get_rebalance_suggestions(user: dict = Depends(require_user)):
    """Get portfolio rebalancing suggestions based on trading journal performance"""
    portfolio = await db.portfolio.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    trades = await db.trades.find(
        {"user_id": user["id"], "status": "closed"},
        {"_id": 0}
    ).to_list(1000)
    
    if not portfolio:
        return {"suggestions": [], "message": "Portfolio vacío"}
    
    # Analyze performance by symbol
    symbol_performance = {}
    for trade in trades:
        symbol = trade.get("symbol", "UNKNOWN")
        if symbol not in symbol_performance:
            symbol_performance[symbol] = {"pnl": 0, "trades": 0, "wins": 0}
        symbol_performance[symbol]["pnl"] += trade.get("pnl", 0)
        symbol_performance[symbol]["trades"] += 1
        if trade.get("pnl", 0) > 0:
            symbol_performance[symbol]["wins"] += 1
    
    suggestions = []
    for asset in portfolio:
        symbol = asset.get("symbol")
        perf = symbol_performance.get(symbol, {"pnl": 0, "trades": 0, "wins": 0})
        win_rate = (perf["wins"] / perf["trades"] * 100) if perf["trades"] > 0 else 50
        
        current_allocation = asset.get("targetAllocation", 0)
        
        # Suggest increasing allocation for high performers
        if win_rate > 60 and perf["pnl"] > 0:
            suggested = min(current_allocation * 1.2, 40)  # Cap at 40%
            action = "increase"
        elif win_rate < 40 or perf["pnl"] < 0:
            suggested = max(current_allocation * 0.8, 5)  # Min 5%
            action = "decrease"
        else:
            suggested = current_allocation
            action = "maintain"
        
        suggestions.append({
            "symbol": symbol,
            "currentAllocation": current_allocation,
            "suggestedAllocation": round(suggested, 2),
            "action": action,
            "reason": f"Win rate: {round(win_rate, 1)}%, P&L: ${round(perf['pnl'], 2)}"
        })
    
    return {"suggestions": suggestions}

# ============= PRICE ALERTS =============

@api_router.post("/alerts")
async def create_alert(alert: PriceAlert, user: dict = Depends(require_user)):
    alert_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        **alert.dict(),
        "is_active": True,
        "triggered": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.alerts.insert_one(alert_doc)
    return {"id": alert_doc["id"], "message": "Alerta creada"}

@api_router.get("/alerts")
async def get_alerts(user: dict = Depends(require_user)):
    alerts = await db.alerts.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    return alerts

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(require_user)):
    result = await db.alerts.delete_one({"id": alert_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return {"message": "Alerta eliminada"}

async def _send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send a transactional email via SendGrid. Returns True on success."""
    if not SENDGRID_API_KEY:
        logging.info(f"[email] SendGrid not configured, skipping: {subject} → {to_email}")
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        message = Mail(from_email=SENDER_EMAIL, to_emails=to_email, subject=subject, html_content=html_content)
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
        logging.info(f"[email] sent '{subject}' → {to_email}")
        return True
    except Exception as e:
        logging.error(f"[email] SendGrid error: {e}")
        return False

_EMAIL_BASE = """
<html><body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
<tr><td style="background:linear-gradient(135deg,#00E676,#00B0FF);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#000;font-size:24px;font-weight:bold;">Trading Calculator PRO</h1>
<p style="margin:8px 0 0;color:#000;opacity:0.7;font-size:14px;">tradingcalculator.pro</p>
</td></tr>
<tr><td style="padding:40px;">{body}</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
<p style="color:#555;font-size:12px;margin:0;">© 2025 Trading Calculator PRO · Todos los derechos reservados</p>
</td></tr>
</table></td></tr></table>
</body></html>
"""

def _email_html(body_html: str) -> str:
    return _EMAIL_BASE.replace("{body}", body_html)

async def _send_welcome_email(to_email: str, name: str) -> None:
    body = f"""
<h2 style="color:#fff;margin-top:0;">¡Bienvenido, {name}! 🎉</h2>
<p style="color:#aaa;line-height:1.6;">Tu cuenta en <strong style="color:#00E676;">Trading Calculator PRO</strong> ha sido creada exitosamente.</p>
<p style="color:#aaa;line-height:1.6;">Ya puedes acceder a todas las herramientas de análisis técnico, calculadoras de opciones, y seguimiento de rendimiento.</p>
<div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin:24px 0;">
<p style="color:#888;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">¿Qué puedes hacer?</p>
<p style="color:#aaa;margin:6px 0;">📊 Calculadora de posición y riesgo</p>
<p style="color:#aaa;margin:6px 0;">🔔 Alertas de precio en tiempo real</p>
<p style="color:#aaa;margin:6px 0;">📈 Análisis de opciones y estrategias</p>
<p style="color:#aaa;margin:6px 0;">🎯 Seguimiento de rendimiento</p>
</div>
<a href="https://tradingcalculator.pro/dashboard" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Ir al Dashboard →</a>
"""
    await _send_email(to_email, "¡Bienvenido a Trading Calculator PRO!", _email_html(body))

async def _send_subscription_confirmation_email(to_email: str, name: str, plan_name: str, plan_price: float, subscription_end: str) -> None:
    end_str = ""
    try:
        end_dt = datetime.fromisoformat(subscription_end.replace("Z", "+00:00"))
        end_str = end_dt.strftime("%d/%m/%Y")
    except Exception:
        end_str = subscription_end
    body = f"""
<h2 style="color:#fff;margin-top:0;">¡Suscripción activada! 🚀</h2>
<p style="color:#aaa;line-height:1.6;">Hola <strong style="color:#fff;">{name}</strong>, tu suscripción <strong style="color:#00E676;">{plan_name}</strong> está activa.</p>
<div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin:24px 0;">
<p style="color:#888;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Detalles de tu plan</p>
<p style="color:#aaa;margin:6px 0;">Plan: <strong style="color:#fff;">{plan_name}</strong></p>
<p style="color:#aaa;margin:6px 0;">Importe: <strong style="color:#00E676;">€{plan_price:.2f}</strong></p>
<p style="color:#aaa;margin:6px 0;">Válido hasta: <strong style="color:#fff;">{end_str}</strong></p>
</div>
<p style="color:#aaa;line-height:1.6;">Ahora tienes acceso completo a todas las funcionalidades premium.</p>
<a href="https://tradingcalculator.pro/dashboard" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Ir al Dashboard →</a>
"""
    await _send_email(to_email, f"Suscripción {plan_name} activada — Trading Calculator PRO", _email_html(body))

async def _send_payment_failed_email(to_email: str, name: str, attempt: int) -> None:
    note = "Tu acceso premium puede ser suspendido pronto." if attempt >= 2 else "Por favor actualiza tu método de pago."
    body = f"""
<h2 style="color:#fff;margin-top:0;">⚠️ Pago fallido</h2>
<p style="color:#aaa;line-height:1.6;">Hola <strong style="color:#fff;">{name}</strong>, no hemos podido procesar el pago de tu suscripción (intento {attempt}).</p>
<p style="color:#aaa;line-height:1.6;">{note}</p>
<div style="background:#1a0a0a;border:1px solid #5a1a1a;border-radius:8px;padding:20px;margin:24px 0;">
<p style="color:#ff6b6b;margin:0;">Para mantener tu acceso premium, actualiza tu método de pago lo antes posible.</p>
</div>
<a href="https://tradingcalculator.pro/settings" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Actualizar método de pago →</a>
"""
    await _send_email(to_email, "⚠️ Pago fallido — Trading Calculator PRO", _email_html(body))

async def _send_subscription_cancelled_email(to_email: str, name: str) -> None:
    body = f"""
<h2 style="color:#fff;margin-top:0;">Suscripción cancelada</h2>
<p style="color:#aaa;line-height:1.6;">Hola <strong style="color:#fff;">{name}</strong>, tu suscripción a Trading Calculator PRO ha sido cancelada.</p>
<p style="color:#aaa;line-height:1.6;">Tu acceso premium ha sido desactivado. Puedes reactivarlo en cualquier momento.</p>
<a href="https://tradingcalculator.pro/pricing" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:24px;">Reactivar suscripción →</a>
"""
    await _send_email(to_email, "Suscripción cancelada — Trading Calculator PRO", _email_html(body))

async def _send_password_reset_email(to_email: str, name: str, reset_url: str) -> None:
    body = f"""
<h2 style="color:#fff;margin-top:0;">Restablecer contraseña</h2>
<p style="color:#aaa;line-height:1.6;">Hola <strong style="color:#fff;">{name}</strong>, hemos recibido una solicitud para restablecer tu contraseña.</p>
<p style="color:#aaa;line-height:1.6;">Haz clic en el botón a continuación. Este enlace expira en <strong style="color:#fff;">1 hora</strong>.</p>
<a href="{reset_url}" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:24px;">Restablecer contraseña →</a>
<p style="color:#555;font-size:12px;margin-top:24px;">Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
<p style="color:#555;font-size:12px;">O copia este enlace en tu navegador:<br/><span style="color:#00E676;">{reset_url}</span></p>
"""
    await _send_email(to_email, "Restablecer contraseña — Trading Calculator PRO", _email_html(body))


@api_router.post("/alerts/send-email")
async def send_alert_email(request: EmailAlertRequest, user: dict = Depends(require_user)):
    """Send email notification for triggered alert. Authenticated users only —
    a stranger should not be able to relay emails through our SendGrid sender.
    Also enforce that the recipient matches the caller (no arbitrary recipients)."""
    if request.email.lower() != user["email"].lower():
        raise HTTPException(status_code=403, detail="Solo puedes enviarte alertas a ti mismo")
    if not SENDGRID_API_KEY:
        return {"status": "skipped", "message": "SendGrid not configured"}
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=request.email,
            subject=f"🚨 Alerta de Precio: {request.symbol}",
            html_content=f"""
            <html>
            <body style="font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: #2a2a2a; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #00E676;">Trading Calculator PRO</h1>
                    <h2>⚡ Alerta de Precio Activada</h2>
                    <div style="background: #333; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Símbolo:</strong> {request.symbol}</p>
                        <p><strong>Precio Actual:</strong> ${request.currentPrice:,.2f}</p>
                        <p><strong>Precio Objetivo:</strong> ${request.targetPrice:,.2f}</p>
                        <p><strong>Condición:</strong> {request.condition}</p>
                    </div>
                    <p style="color: #888;">Esta alerta fue configurada en Trading Calculator PRO</p>
                </div>
            </body>
            </html>
            """
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        return {"status": "sent", "code": response.status_code}
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return {"status": "error", "message": str(e)}

# ============= MONTE CARLO SIMULATION =============

def _simulate_one_mc_path(
    initial: float, num_trades: int, win_rate: float,
    avg_win: float, avg_loss: float, rng: secrets.SystemRandom,
) -> Dict[str, Any]:
    """Simulate one full equity curve and its max drawdown."""
    balance = initial
    curve = [balance]
    peak = balance
    max_dd = 0.0
    for _ in range(num_trades):
        balance += avg_win if rng.random() < win_rate else avg_loss
        curve.append(balance)
        if balance > peak:
            peak = balance
        dd = (peak - balance) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
    return {"final": balance, "curve": curve, "max_dd_pct": max_dd * 100}


def _summarize_mc_runs(initial: float, finals: List[float], drawdowns: List[float]) -> Dict[str, Any]:
    """Compute percentile/risk-of-ruin statistics from a batch of MC final balances."""
    finals_sorted = sorted(finals)
    n = len(finals_sorted)
    return {
        "initialCapital": initial,
        "avgFinalBalance": round(sum(finals_sorted) / n, 2),
        "percentile5": round(finals_sorted[int(n * 0.05)], 2),
        "percentile50": round(finals_sorted[int(n * 0.50)], 2),
        "percentile95": round(finals_sorted[int(n * 0.95)], 2),
        "riskOfRuin": round(sum(1 for b in finals_sorted if b <= 0) / n * 100, 2),
        "avgMaxDrawdown": round(sum(drawdowns) / len(drawdowns), 2),
        "profitProbability": round(sum(1 for b in finals_sorted if b > initial) / n * 100, 2),
    }


@api_router.post("/monte-carlo")
async def run_monte_carlo(request: dict, user: dict = Depends(require_user)) -> Dict[str, Any]:
    """Run Monte Carlo simulation based on trading statistics."""
    if not check_premium(user):
        raise HTTPException(status_code=403, detail="Función premium requerida")

    win_rate = request.get("winRate", 50) / 100
    avg_win = request.get("avgWin", 100)
    avg_loss = request.get("avgLoss", -50)
    initial = request.get("initialCapital", 10000)
    num_trades = request.get("numTrades", 100)
    num_simulations = request.get("numSimulations", 1000)

    rng = secrets.SystemRandom()
    finals: List[float] = []
    drawdowns: List[float] = []
    curves: List[List[float]] = []
    for _ in range(num_simulations):
        path = _simulate_one_mc_path(initial, num_trades, win_rate, avg_win, avg_loss, rng)
        finals.append(path["final"])
        drawdowns.append(path["max_dd_pct"])
        if len(curves) < 100:  # keep first 100 paths for charting
            curves.append(path["curve"])

    return {"simulations": curves[:50], "statistics": _summarize_mc_runs(initial, finals, drawdowns)}

# ============= BACKTESTING =============

def _simulate_backtest_trades(
    n: int, initial_balance: float, win_rate: float,
    take_profit_pct: float, stop_loss_pct: float, leverage: float,
    rng: secrets.SystemRandom,
) -> Dict[str, Any]:
    """Run a single synthetic backtest pass, return trades list + summary fields."""
    trades: List[Dict[str, Any]] = []
    balance = initial_balance
    wins = 0
    losses = 0
    peak = balance
    max_drawdown = 0.0

    for i in range(n):
        is_win = rng.random() < win_rate
        if is_win:
            wins += 1
            pnl = balance * (take_profit_pct / 100) * leverage
        else:
            losses += 1
            pnl = -balance * (stop_loss_pct / 100) * leverage
        balance += pnl
        if balance > peak:
            peak = balance
        drawdown = (peak - balance) / peak * 100 if peak > 0 else 0
        if drawdown > max_drawdown:
            max_drawdown = drawdown
        trades.append({
            "trade_num": i + 1,
            "type": "LONG" if rng.random() > 0.5 else "SHORT",
            "result": "WIN" if is_win else "LOSS",
            "pnl": round(pnl, 2),
            "balance": round(balance, 2),
        })
    return {"trades": trades, "balance": balance, "wins": wins, "losses": losses,
            "max_drawdown": max_drawdown}


def _run_real_backtest(
    symbol: str,
    strategy: str,
    days: int,
    initial_capital: float,
    take_profit_pct: float,
    stop_loss_pct: float,
    leverage: float,
) -> Dict[str, Any]:
    """REAL backtest using historical data from yfinance.
    Strategies supported:
      - SMA Crossover (10/30)
      - RSI 14 (oversold<30 long / overbought>70 short)
      - Buy & Hold
    Returns: {trades, balance, wins, losses, max_drawdown, equity_curve}.
    """
    import yfinance as yf
    import pandas as pd

    # Pick yfinance symbol — auto-add -USD for bare crypto tickers
    yf_sym = symbol
    if not any(c in symbol for c in ["-", "=", "^", "."]):
        if symbol.upper() in ("BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK", "LTC", "MATIC"):
            yf_sym = f"{symbol.upper()}-USD"
    period_str = f"{max(days, 30)}d" if days <= 730 else "2y"
    interval = "1d" if days >= 30 else "1h"

    hist = yf.Ticker(yf_sym).history(period=period_str, interval=interval)
    if hist.empty or len(hist) < 30:
        # Fall back to BTC-USD if symbol not found
        hist = yf.Ticker("BTC-USD").history(period=period_str, interval=interval)

    closes = hist["Close"].astype(float).tolist()
    times = [int(t.timestamp()) for t in hist.index]
    if len(closes) < 30:
        raise HTTPException(status_code=400, detail="No hay datos históricos suficientes para este símbolo")

    # ── Generate entry signals depending on strategy ──
    signals: List[int] = [0] * len(closes)  # 1=long, -1=short, 0=flat
    s_lower = strategy.lower().replace("_", " ")

    if "rsi" in s_lower:
        period_rsi = 14
        gains, losses = [], []
        for i in range(1, len(closes)):
            diff = closes[i] - closes[i - 1]
            gains.append(max(diff, 0)); losses.append(max(-diff, 0))
        rsi: List[Optional[float]] = [None] * len(closes)
        for i in range(period_rsi, len(closes)):
            avg_gain = sum(gains[i - period_rsi:i]) / period_rsi
            avg_loss = sum(losses[i - period_rsi:i]) / period_rsi or 1e-9
            rs = avg_gain / avg_loss
            rsi[i] = 100 - 100 / (1 + rs)
        for i in range(len(closes)):
            r = rsi[i]
            if r is None:
                continue
            if r < 30:
                signals[i] = 1
            elif r > 70:
                signals[i] = -1
    elif "buy" in s_lower or "hold" in s_lower:
        signals[0] = 1  # enter long once, hold forever
    else:
        # Default: SMA Crossover 10/30
        short_w, long_w = 10, 30
        for i in range(long_w, len(closes)):
            sma_s = sum(closes[i - short_w:i]) / short_w
            sma_l = sum(closes[i - long_w:i]) / long_w
            sma_s_prev = sum(closes[i - short_w - 1:i - 1]) / short_w
            sma_l_prev = sum(closes[i - long_w - 1:i - 1]) / long_w
            if sma_s_prev <= sma_l_prev and sma_s > sma_l:
                signals[i] = 1
            elif sma_s_prev >= sma_l_prev and sma_s < sma_l:
                signals[i] = -1

    # ── Simulate trades with TP/SL ──
    balance = float(initial_capital)
    equity: List[float] = [balance]
    trades: List[Dict[str, Any]] = []
    peak = balance
    max_dd = 0.0
    in_pos = False
    side = 0  # 1 long, -1 short
    entry_price = 0.0
    entry_idx = 0
    risk_per_trade = 0.02  # 2% risk per trade
    wins, losses = 0, 0

    for i, price in enumerate(closes):
        if not in_pos and signals[i] != 0 and i < len(closes) - 1:
            in_pos = True
            side = signals[i]
            entry_price = price
            entry_idx = i
            continue
        if in_pos:
            move_pct = ((price - entry_price) / entry_price) * 100 * side * leverage
            should_exit = (
                move_pct >= take_profit_pct or
                move_pct <= -stop_loss_pct or
                signals[i] == -side or          # opposite signal
                i == len(closes) - 1            # close on last bar
            )
            if should_exit:
                pnl = balance * risk_per_trade * (move_pct / max(stop_loss_pct, 0.01))
                pnl = max(min(pnl, balance * risk_per_trade * (take_profit_pct / max(stop_loss_pct, 0.01))),
                          -balance * risk_per_trade)
                balance += pnl
                if pnl > 0:
                    wins += 1
                else:
                    losses += 1
                trades.append({
                    "id": str(uuid.uuid4()),
                    "side": "LONG" if side == 1 else "SHORT",
                    "entry_time": times[entry_idx],
                    "exit_time": times[i],
                    "entry_price": round(entry_price, 6),
                    "exit_price": round(price, 6),
                    "move_pct": round(move_pct, 2),
                    "pnl": round(pnl, 2),
                    "balance": round(balance, 2),
                })
                in_pos = False
                side = 0
        peak = max(peak, balance)
        dd = ((peak - balance) / peak * 100) if peak > 0 else 0
        max_dd = max(max_dd, dd)
        equity.append(round(balance, 2))

    return {
        "trades": trades,
        "balance": balance,
        "wins": wins,
        "losses": losses,
        "max_drawdown": max_dd,
        "equity_curve": equity,
    }


@api_router.post("/backtest")
async def run_backtest(request: dict, user: dict = Depends(require_user)) -> Dict[str, Any]:
    if not check_premium(user):
        raise HTTPException(status_code=403, detail="Función premium requerida")

    strategy = request.get("strategy", "SMA Crossover")
    initial_capital = float(request.get("initial_capital", 10000))
    take_profit = float(request.get("take_profit", 5))
    stop_loss = float(request.get("stop_loss", 2))
    leverage = float(request.get("leverage", 1))
    symbol = (request.get("symbol") or "BTC-USD").upper()
    days = int(request.get("days", 180))

    try:
        sim = _run_real_backtest(
            symbol=symbol,
            strategy=strategy,
            days=days,
            initial_capital=initial_capital,
            take_profit_pct=take_profit,
            stop_loss_pct=stop_loss,
            leverage=leverage,
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"backtest error: {e}")
        raise HTTPException(status_code=500, detail=f"Error ejecutando backtest: {e}")

    final = sim["balance"]
    n = len(sim["trades"])
    wins, losses = sim["wins"], sim["losses"]
    roi = ((final - initial_capital) / initial_capital) * 100
    profit_factor = round((wins * take_profit) / (losses * stop_loss), 2) if losses > 0 else 0.0

    return {
        "id": str(uuid.uuid4()),
        "symbol": symbol,
        "strategy": strategy,
        "days": days,
        "initial_capital": initial_capital,
        "final_balance": round(final, 2),
        "total_trades": n,
        "wins": wins,
        "losses": losses,
        "win_rate": round(wins / n * 100, 2) if n else 0.0,
        "roi": round(roi, 2),
        "max_drawdown": round(sim["max_drawdown"], 2),
        "profit_factor": profit_factor,
        "trades": sim["trades"][-30:],
        "equity_curve": sim["equity_curve"],
        "data_source": "yfinance",
    }

# ============= CALCULATIONS =============

@api_router.post("/calculations")
async def save_calculation(calc: dict, user: dict = Depends(require_user)):
    calculation = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "calculator_type": calc.get("calculator_type"),
        "inputs": calc.get("inputs", {}),
        "results": calc.get("results", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.calculations.insert_one(calculation)
    return {"id": calculation["id"], "message": "Cálculo guardado"}

@api_router.get("/calculations")
async def get_calculations(user: dict = Depends(require_user), limit: int = 50):
    calculations = await db.calculations.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return calculations

@api_router.delete("/calculations/{calc_id}")
async def delete_calculation(calc_id: str, user: dict = Depends(require_user)):
    result = await db.calculations.delete_one({"id": calc_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")
    return {"message": "Cálculo eliminado correctamente"}

# ============= PAYMENT ROUTES =============

@api_router.get("/plans")
async def get_plans():
    return SUBSCRIPTION_PLANS

_PAYMENT_METHODS_MAP = {
    "stripe": ["card"],
    "card":   ["card"],
    "sepa":   ["sepa_debit"],
    "klarna": ["klarna"],
}


def _build_pending_transaction(
    user: dict, plan_id: str, plan: dict, payment_method: str
) -> Dict[str, Any]:
    """Build the pending payment_transactions document (no Stripe fields yet)."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "plan_id": plan_id,
        "amount": plan["price"],
        "currency": plan["currency"],
        "payment_method": payment_method,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def _create_stripe_session(
    plan: dict, payment_method: str, success_url: str, cancel_url: str,
    metadata: Dict[str, str], origin_url: str,
) -> Any:
    """Create a Stripe Checkout session using the plan's Stripe price ID."""
    import asyncio as _asyncio
    runtime_key = await get_setting("stripe_secret_key") or STRIPE_API_KEY
    stripe.api_key = runtime_key

    mode = "payment" if plan.get("interval") == "lifetime" else "subscription"
    payment_methods = _PAYMENT_METHODS_MAP.get(payment_method, ["card"])

    # Idempotency key prevents duplicate sessions if the client retries on network error
    idempotency_key = f"checkout-{metadata.get('user_id', 'anon')}-{metadata.get('plan_id', 'unknown')}-{metadata.get('transaction_id', secrets.token_hex(8))}"
    session = await _asyncio.get_event_loop().run_in_executor(
        None,
        lambda: stripe.checkout.Session.create(
            payment_method_types=payment_methods,
            line_items=[{"price": plan["stripe_price_id"], "quantity": 1}],
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            idempotency_key=idempotency_key,
        ),
    )
    # Expose .session_id so callers don't need changing
    session.session_id = session.id
    return session


@api_router.post("/checkout/create")
async def create_checkout(request: dict, user: dict = Depends(require_user)) -> Dict[str, Any]:
    plan_id = request.get("plan_id")
    payment_method = request.get("payment_method", "stripe")
    origin_url = request.get("origin_url", "")

    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan no válido")

    # Klarna is only available for the lifetime one-time plan
    if payment_method == "klarna" and not plan.get("klarna"):
        raise HTTPException(
            status_code=400,
            detail="Klarna solo está disponible para el plan De Por Vida (€500 pago único)"
        )

    transaction = _build_pending_transaction(user, plan_id, plan, payment_method)

    if payment_method in _PAYMENT_METHODS_MAP:
        session = await _create_stripe_session(
            plan,
            payment_method,
            success_url=f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin_url}/payment/cancel",
            metadata={
                "user_id": user["id"],
                "plan_id": plan_id,
                "transaction_id": transaction["id"],
            },
            origin_url=origin_url,
        )
        transaction["session_id"] = session.session_id
        transaction["checkout_url"] = session.url

    await db.payment_transactions.insert_one(transaction)

    return {
        "transaction_id": transaction["id"],
        "checkout_url": transaction.get("checkout_url"),
        "session_id": transaction.get("session_id"),
    }

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(require_user)):
    """
    Obtiene el estado de una sesión de pago de Stripe
    """
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    return {
        "transaction_id": transaction.get("id"),
        "payment_status": transaction.get("status", "pending"),
        "plan_id": transaction.get("plan_id"),
        "amount": transaction.get("amount"),
        "currency": transaction.get("currency"),
        "created_at": transaction.get("created_at")
    }

def _stripe_session_ids(session_id: str) -> Dict[str, Optional[str]]:
    """Retrieve Stripe customer & subscription IDs for a paid session, with safe fallback."""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {"customer": session.customer, "subscription": session.subscription}
    except Exception as e:
        logging.error(f"Error retrieving Stripe session: {e}")
        return {"customer": None, "subscription": None}


async def _activate_paid_subscription(
    user_id: str, plan_id: str, plan: dict, transaction_id: Optional[str], session_id: str,
) -> None:
    """Mark user premium and the matching transaction as paid."""
    subscription_end = datetime.now(timezone.utc) + timedelta(days=plan["days"])
    update_data: Dict[str, Any] = {
        "subscription_plan": plan_id,
        "subscription_end": subscription_end.isoformat(),
        "is_premium": True,
    }
    ids = _stripe_session_ids(session_id)
    if ids["customer"]:
        update_data["stripe_customer_id"] = ids["customer"]
    if ids["subscription"]:
        update_data["stripe_subscription_id"] = ids["subscription"]
    await db.users.update_one({"id": user_id}, {"$set": update_data})

    if transaction_id:
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
        )

    # Send subscription confirmation email
    try:
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "name": 1})
        if user_doc:
            import asyncio as _asyncio
            _asyncio.create_task(_send_subscription_confirmation_email(
                to_email=user_doc["email"],
                name=user_doc.get("name", ""),
                plan_name=plan["name"],
                plan_price=plan["price"],
                subscription_end=subscription_end.isoformat(),
            ))
    except Exception as _e:
        logging.warning(f"[email] subscription confirmation email failed: {_e}")


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request) -> Dict[str, str]:
    """Handles all Stripe webhook events:
    - checkout.session.completed     → activate paid subscription (+ credit referrer)
    - customer.subscription.deleted  → revoke premium
    - invoice.payment_failed         → mark past_due, revoke after 3 attempts
    - customer.subscription.updated  → sync status changes
    """
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    host_url = str(request.base_url).rstrip("/")
    runtime_key = await get_setting("stripe_secret_key") or STRIPE_API_KEY
    stripe.api_key = runtime_key

    # Try to parse a generic Stripe event (for the new event types)
    raw_event_type = ""
    raw_event = None
    webhook_secret = (await get_setting("stripe_webhook_secret")) or os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret or not signature:
        logging.error("[stripe-webhook] Missing webhook secret or signature — request rejected")
        raise HTTPException(status_code=400, detail="Webhook signature required")

    try:
        raw_event = stripe.Webhook.construct_event(body, signature, webhook_secret)
        raw_event_type = raw_event.get("type", "")
    except stripe.error.SignatureVerificationError as e:
        logging.error(f"[stripe-webhook] Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except Exception as e:
        logging.error(f"[stripe-webhook] Parse error: {e}")
        raise HTTPException(status_code=400, detail="Webhook parse error")

    # ── Log every Stripe event to stripe_webhook_logs ──
    if raw_event:
        try:
            _data_obj = raw_event.get("data", {}).get("object", {})
            await db.stripe_webhook_logs.insert_one({
                "id": raw_event.get("id", secrets.token_hex(8)),
                "type": raw_event_type,
                "amount": _data_obj.get("amount_total") or _data_obj.get("amount_due"),
                "customer": _data_obj.get("customer"),
                "created": datetime.now(timezone.utc).isoformat(),
                "status": "ok",
            })
        except Exception:
            pass

    # ── Handle subscription lifecycle events directly via Stripe SDK ──
    if raw_event and raw_event_type in (
        "customer.subscription.deleted",
        "invoice.payment_failed",
        "customer.subscription.updated",
    ):
        try:
            data_obj = raw_event["data"]["object"]
            customer_id = data_obj.get("customer")
            if raw_event_type == "customer.subscription.deleted" and customer_id:
                await db.users.update_one(
                    {"stripe_customer_id": customer_id},
                    {"$set": {
                        "is_premium": False,
                        "subscription_plan": None,
                        "subscription_end": None,
                        "subscription_status": "canceled",
                        "stripe_subscription_id": None,
                        "subscription_canceled_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                logging.info(f"[stripe-webhook] subscription deleted for {customer_id}")
                try:
                    _u = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0, "email": 1, "name": 1})
                    if _u:
                        import asyncio as _asyncio
                        _asyncio.create_task(_send_subscription_cancelled_email(_u["email"], _u.get("name", "")))
                except Exception:
                    pass
            elif raw_event_type == "invoice.payment_failed" and customer_id:
                attempt = int(data_obj.get("attempt_count", 1) or 1)
                update: Dict[str, Any] = {"subscription_status": "past_due"}
                if attempt >= 3:
                    update.update({"is_premium": False, "subscription_plan": None, "subscription_status": "unpaid"})
                    logging.warning(f"[stripe-webhook] payment failed {attempt}x for {customer_id} → premium revoked")
                await db.users.update_one({"stripe_customer_id": customer_id}, {"$set": update})
                try:
                    _u = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0, "email": 1, "name": 1})
                    if _u:
                        import asyncio as _asyncio
                        _asyncio.create_task(_send_payment_failed_email(_u["email"], _u.get("name", ""), attempt))
                except Exception:
                    pass
            elif raw_event_type == "customer.subscription.updated" and customer_id:
                status = data_obj.get("status")
                if status:
                    is_active = status in ("active", "trialing")
                    await db.users.update_one(
                        {"stripe_customer_id": customer_id},
                        {"$set": {"subscription_status": status, "is_premium": is_active}},
                    )
            return {"status": "received", "event": raw_event_type}
        except Exception as e:
            logging.error(f"[stripe-webhook] subscription event error: {e}")
            return {"status": "error"}

    # ── Handle checkout.session.completed via native Stripe SDK ──
    if raw_event and raw_event_type == "checkout.session.completed":
        try:
            data_obj = raw_event["data"]["object"]
            if data_obj.get("payment_status") != "paid":
                return {"status": "received"}

            meta = data_obj.get("metadata") or {}
            user_id = meta.get("user_id")
            plan_id = meta.get("plan_id")
            plan = SUBSCRIPTION_PLANS.get(plan_id) if plan_id else None
            if not (user_id and plan_id and plan):
                logging.warning(f"[stripe-webhook] checkout.session.completed missing metadata: {meta}")
                return {"status": "received"}

            await _activate_paid_subscription(
                user_id=user_id,
                plan_id=plan_id,
                plan=plan,
                transaction_id=meta.get("transaction_id"),
                session_id=data_obj.get("id", ""),
            )
            try:
                from referrals import credit_referrer_for_payment
                await credit_referrer_for_payment(
                    referee_user_id=user_id,
                    plan_id=plan_id,
                    plan_amount=float(plan.get("price", 0)),
                    plan_currency=plan.get("currency", "EUR"),
                    transaction_id=meta.get("transaction_id"),
                )
            except Exception as e:
                logging.warning(f"[stripe-webhook] referral credit error: {e}")
            return {"status": "received"}
        except Exception as e:
            logging.error(f"[stripe-webhook] checkout.session.completed error: {e}")
            return {"status": "error"}

    return {"status": "received"}

# ============= SUBSCRIPTION MANAGEMENT ROUTES =============

@api_router.get("/subscriptions/current")
async def get_current_subscription(user: dict = Depends(require_user)):
    """Get current user's subscription details from Stripe"""
    try:
        # Get user's stripe_customer_id
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        
        if not user_doc or not user_doc.get("stripe_customer_id"):
            return {
                "has_subscription": False,
                "is_premium": user_doc.get("is_premium", False) if user_doc else False,
                "subscription_plan": user_doc.get("subscription_plan") if user_doc else None
            }
        
        # Get subscriptions from Stripe
        subscriptions = stripe.Subscription.list(
            customer=user_doc["stripe_customer_id"],
            status="all",
            limit=1
        )
        
        if not subscriptions.data:
            return {
                "has_subscription": False,
                "is_premium": user_doc.get("is_premium", False),
                "subscription_plan": user_doc.get("subscription_plan")
            }
        
        sub = subscriptions.data[0]
        
        return {
            "has_subscription": True,
            "subscription_id": sub.id,
            "status": sub.status,
            "plan_id": user_doc.get("subscription_plan"),
            "current_period_start": sub.current_period_start,
            "current_period_end": sub.current_period_end,
            "cancel_at_period_end": sub.cancel_at_period_end,
            "canceled_at": sub.canceled_at,
            "trial_end": sub.trial_end,
            "is_premium": sub.status in ["active", "trialing"]
        }
    except Exception as e:
        logging.error(f"Error fetching subscription: {e}")
        return {
            "has_subscription": False,
            "is_premium": user.get("is_premium", False)
        }

@api_router.post("/subscriptions/cancel")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    user: dict = Depends(require_user)
):
    """Cancel user's subscription"""
    try:
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        
        if not user_doc or not user_doc.get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No subscription found")
        
        # Get active subscription
        subscriptions = stripe.Subscription.list(
            customer=user_doc["stripe_customer_id"],
            status="active",
            limit=1
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscriptions.data[0]
        
        if request.immediate:
            # Cancel immediately
            stripe.Subscription.delete(sub.id)
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"is_premium": False, "subscription_plan": None}}
            )
            return {"message": "Subscription canceled immediately", "canceled": True}
        else:
            # Cancel at period end
            stripe.Subscription.modify(
                sub.id,
                cancel_at_period_end=True
            )
            return {
                "message": "Subscription will be canceled at period end",
                "canceled": False,
                "cancel_at": sub.current_period_end
            }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail="Error canceling subscription")

@api_router.post("/subscriptions/resume")
async def resume_subscription(user: dict = Depends(require_user)):
    """Resume a canceled subscription"""
    try:
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        
        if not user_doc or not user_doc.get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No subscription found")
        
        # Get subscription set to cancel
        subscriptions = stripe.Subscription.list(
            customer=user_doc["stripe_customer_id"],
            status="active",
            limit=1
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscriptions.data[0]
        
        if not sub.cancel_at_period_end:
            return {"message": "Subscription is not set to cancel", "resumed": False}
        
        # Resume by removing cancel_at_period_end
        stripe.Subscription.modify(
            sub.id,
            cancel_at_period_end=False
        )
        
        return {"message": "Subscription resumed successfully", "resumed": True}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error resuming subscription: {e}")
        raise HTTPException(status_code=500, detail="Error resuming subscription")

@api_router.post("/subscriptions/change-plan-legacy")
async def change_plan_legacy(
    request: ChangePlanRequest,
    user: dict = Depends(require_user)
):
    """[Legacy stub] superseded by /subscriptions/change-plan from missing_apis.py
    which performs a real Stripe proration. Kept for backwards-compat tests."""
    if request.new_plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    new_plan = SUBSCRIPTION_PLANS[request.new_plan_id]
    return {
        "message": "Use POST /api/subscriptions/change-plan (real Stripe proration upgrade/downgrade)",
        "requested_plan": request.new_plan_id,
        "requested_plan_price": new_plan["price"],
        "requested_plan_currency": new_plan["currency"],
    }

@api_router.post("/billing/create-portal-session")
async def create_portal_session(request: dict, user: dict = Depends(require_user)):
    """Create Stripe Customer Portal session"""
    try:
        return_url = request.get("return_url", "")
        
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        
        if not user_doc or not user_doc.get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No Stripe customer found")
        
        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=user_doc["stripe_customer_id"],
            return_url=return_url
        )
        
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating portal session: {e}")
        raise HTTPException(status_code=500, detail="Error creating portal session")

@api_router.get("/billing/history")
async def get_billing_history(user: dict = Depends(require_user)):
    """Get user's billing history/invoices"""
    try:
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        
        if not user_doc or not user_doc.get("stripe_customer_id"):
            return {"invoices": []}
        
        # Get invoices from Stripe
        invoices = stripe.Invoice.list(
            customer=user_doc["stripe_customer_id"],
            limit=10
        )
        
        return {
            "invoices": [
                {
                    "id": inv.id,
                    "amount": inv.amount_paid / 100,  # Convert from cents
                    "currency": inv.currency.upper(),
                    "status": inv.status,
                    "created": inv.created,
                    "invoice_pdf": inv.invoice_pdf,
                    "hosted_invoice_url": inv.hosted_invoice_url
                }
                for inv in invoices.data
            ]
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error fetching billing history: {e}")
        return {"invoices": []}

# ============= ROOT ROUTES =============

# ============= USER STATE PERSISTENCE ROUTES =============

@api_router.post("/user-states/save")
async def save_user_state(request: dict, user: dict = Depends(require_user)):
    """
    Save user state for calculators, charts, etc.
    Body: { "state_id": "percentage_calculator", "state": {...} }
    """
    try:
        state_id = request.get("state_id")
        state_data = request.get("state")
        
        if not state_id:
            raise HTTPException(status_code=400, detail="state_id is required")
        
        # Upsert the state
        now = datetime.now(timezone.utc)
        await db.user_states.update_one(
            {"user_id": user["id"], "state_id": state_id},
            {"$set": {
                "user_id": user["id"],
                "state_id": state_id,
                "state": state_data,
                "last_updated": now.isoformat(),
                # TTL: state is auto-deleted 90 days after last update.
                "expires_at": now + timedelta(days=90),
            }},
            upsert=True
        )
        
        return {"success": True, "message": "State saved"}
    except Exception as e:
        logging.error(f"Error saving state: {e}")
        raise HTTPException(status_code=500, detail="Error saving state")

@api_router.get("/user-states/get/{state_id}")
async def get_user_state(state_id: str, user: dict = Depends(require_user)):
    """Get saved state for a specific calculator/component"""
    try:
        state_doc = await db.user_states.find_one(
            {"user_id": user["id"], "state_id": state_id},
            {"_id": 0}
        )
        
        if not state_doc:
            return {"state": None}
        
        return {"state": state_doc.get("state"), "last_updated": state_doc.get("last_updated")}
    except Exception as e:
        logging.error(f"Error getting state: {e}")
        return {"state": None}

@api_router.delete("/user-states/delete/{state_id}")
async def delete_user_state(state_id: str, user: dict = Depends(require_user)):
    """Delete a specific saved state"""
    try:
        result = await db.user_states.delete_one(
            {"user_id": user["id"], "state_id": state_id}
        )
        
        return {"success": True, "deleted": result.deleted_count > 0}
    except Exception as e:
        logging.error(f"Error deleting state: {e}")
        raise HTTPException(status_code=500, detail="Error deleting state")

@api_router.delete("/user-states/reset-all")
async def reset_all_user_states(user: dict = Depends(require_user)):
    """Delete ALL saved states for the user"""
    try:
        result = await db.user_states.delete_many({"user_id": user["id"]})
        
        return {"success": True, "deleted_count": result.deleted_count}
    except Exception as e:
        logging.error(f"Error resetting states: {e}")
        raise HTTPException(status_code=500, detail="Error resetting states")

@api_router.get("/user-states/list")
async def list_user_states(user: dict = Depends(require_user)):
    """List all saved states for debugging"""
    try:
        states = await db.user_states.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        
        return {"states": states}
    except Exception as e:
        logging.error(f"Error listing states: {e}")
        return {"states": []}


@api_router.get("/")
async def root():
    return {"message": "Trading Calculator PRO API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    if db._pool is None:
        return {"status": "healthy", "db": "unavailable"}
    try:
        async with db._pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "healthy", "db": "ok"}
    except Exception as e:
        logging.error(f"[health] DB check failed: {e}")
        return {"status": "healthy", "db": f"error: {e}"}

# ============= OPTIONS CALCULATOR ROUTES (merged from OPTIONS app) =============

class OptionLegInput(BaseModel):
    type: str  # "call", "put", "stock"
    action: str  # "buy", "sell"
    quantity: Optional[int] = Field(default=1, alias="qty")
    qty: Optional[int] = None
    strike: float
    premium: Optional[float] = 0
    iv: Optional[float] = 0.3
    daysToExpiry: Optional[int] = 30

    class Config:
        populate_by_name = True

    def get_qty(self):
        return self.quantity or self.qty or 1


class PayoffRequest(BaseModel):
    legs: List[OptionLegInput]
    stockPrice: float
    priceRange: Optional[float] = 0.35
    daysToChart: Optional[int] = 30
    feePerContract: Optional[float] = 0.0     # broker fee per option contract (e.g., 0.65)
    dividendYield: Optional[float] = 0.0      # continuous yield q (e.g., 0.005)


class GreeksRequest(BaseModel):
    legs: List[OptionLegInput]
    stockPrice: float
    dividendYield: Optional[float] = 0.0


class PnlAttributionRequest(BaseModel):
    legs: List[OptionLegInput]
    stockPriceInitial: float
    stockPriceFinal: float
    daysElapsed: int = 1
    ivChangeAbs: float = 0.0  # +0.05 = +5 IV points
    initialDaysToExpiry: int = 30
    dividendYield: Optional[float] = 0.0


class AssignmentRequest(BaseModel):
    legs: List[OptionLegInput]
    stockPriceAtExpiry: float


def _legs_to_dicts(legs: List[OptionLegInput]) -> List[Dict[str, Any]]:
    """Convert a list of OptionLegInput pydantic models into the dict shape
    consumed by options_math (calculate_payoff/greeks/etc).
    Centralised to avoid per-endpoint duplication.
    """
    out: List[Dict[str, Any]] = []
    for leg in legs:
        qty = leg.get_qty()
        out.append({
            "type": leg.type,
            "action": leg.action,
            "quantity": qty,
            "qty": qty,
            "strike": leg.strike,
            "premium": leg.premium or 0,
            "iv": leg.iv or 0.3,
            "daysToExpiry": leg.daysToExpiry or 30,
        })
    return out


def _payoff_summary(
    legs_dicts: List[Dict[str, Any]],
    points: List[Dict[str, float]],
    fee_per_contract: float,
) -> Dict[str, Any]:
    """Compute payoff summary stats from raw points + legs."""
    expiry_pnls = [p["pnlAtExpiry"] for p in points]
    max_profit = max(expiry_pnls)
    max_loss = min(expiry_pnls)
    net_premium = 0.0
    total_fees = 0.0
    for leg in legs_dicts:
        if leg["type"] == "stock":
            continue
        qty = leg.get("quantity", leg.get("qty", 1))
        mult = -1 if leg["action"] == "buy" else 1
        net_premium += leg.get("premium", 0) * mult * qty * 100
        total_fees += qty * fee_per_contract
    roi = (max_profit / abs(net_premium) * 100) if net_premium != 0 else 0
    return {
        "maxProfit": round(max_profit, 2),
        "maxLoss": round(max_loss, 2),
        "netPremium": round(net_premium, 2),
        "totalFees": round(total_fees, 2),
        "roi": round(roi, 1),
        "isMaxProfitUnlimited": max_profit > 5000000,
    }


@api_router.get("/stock/{symbol}")
async def opt_get_stock(symbol: str):
    try:
        data = get_stock_data(symbol)
    except Exception as e:
        logging.error(f"Error getting stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    try:
        now = datetime.now(timezone.utc)
        await db.stock_cache.update_one(
            {"symbol": data["symbol"]},
            {"$set": {
                **data,
                "cached_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
            }},
            upsert=True
        )
    except Exception as e:
        logging.warning(f"Failed to cache stock data for {symbol}: {e}")
    return data


def _classify_symbol(sym: str) -> dict:
    """Classify a yfinance symbol into a user-friendly category + clean label."""
    s = sym.upper()
    if s.startswith("^"):
        index_names = {
            "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "Nasdaq Composite",
            "^RUT": "Russell 2000", "^VIX": "VIX Volatility", "^FTSE": "FTSE 100",
            "^GDAXI": "DAX", "^FCHI": "CAC 40", "^N225": "Nikkei 225",
            "^HSI": "Hang Seng", "^STOXX50E": "Euro Stoxx 50", "^STI": "STI Singapore",
        }
        return {"category": "indices", "name": index_names.get(s, s)}
    if s.endswith("=X"):
        return {"category": "forex", "name": s.replace("=X", "")}
    if s.endswith("=F"):
        comm_names = {
            "GC=F": "Gold", "SI=F": "Silver", "CL=F": "Crude Oil (WTI)",
            "BZ=F": "Brent Crude", "NG=F": "Natural Gas", "HG=F": "Copper",
            "PL=F": "Platinum", "PA=F": "Palladium", "ZC=F": "Corn",
            "ZW=F": "Wheat", "ZS=F": "Soybeans", "KC=F": "Coffee",
            "CC=F": "Cocoa", "SB=F": "Sugar", "CT=F": "Cotton",
        }
        return {"category": "commodities", "name": comm_names.get(s, s)}
    if s.endswith("-USD"):
        crypto_names = {
            "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum", "SOL-USD": "Solana",
            "BNB-USD": "Binance Coin", "XRP-USD": "Ripple", "ADA-USD": "Cardano",
            "DOGE-USD": "Dogecoin", "AVAX-USD": "Avalanche", "DOT-USD": "Polkadot",
            "LINK-USD": "Chainlink", "LTC-USD": "Litecoin", "MATIC-USD": "Polygon",
            "TRX-USD": "TRON", "ATOM-USD": "Cosmos", "NEAR-USD": "NEAR",
            "APT-USD": "Aptos", "ARB-USD": "Arbitrum", "OP-USD": "Optimism",
            "INJ-USD": "Injective", "SUI-USD": "Sui", "TIA-USD": "Celestia",
        }
        return {"category": "crypto", "name": crypto_names.get(s, s.replace("-USD", ""))}
    etfs = {
        "SPY", "QQQ", "IWM", "DIA", "VOO", "VTI", "VT", "VEA", "VWO", "EFA",
        "EEM", "AGG", "BND", "TLT", "SHY", "IEF", "GLD", "SLV", "GDX", "GDXJ",
        "USO", "UNG", "DBC", "DBA", "URA", "REMX", "ARKK", "ARKG", "ARKF",
        "ARKW", "SOXL", "TQQQ", "SQQQ", "TMF", "TZA", "FAS", "FAZ", "UVXY",
        "VXX", "SVXY", "XLF", "XLK", "XLE", "XLV", "XLY", "XLP", "XLI", "XLB",
        "XLU", "XLRE", "XLC", "XBI", "SMH", "SOXX", "KWEB", "FXI", "EWZ", "EWJ",
        "INDA", "MCHI", "EWG", "EWQ", "EWU", "TAN", "ICLN", "LIT", "JETS",
        "HACK", "BOTZ", "CLOU", "FINX", "PAVE", "ITA", "XAR", "IBB", "IGV",
        "VNQ", "VUG", "VTV", "VIG", "DVY", "SCHD", "MOAT", "QUAL", "MTUM",
    }
    if s in etfs:
        return {"category": "etfs", "name": s}
    return {"category": "stocks", "name": s}


@api_router.get("/tickers/search")
async def opt_search_tickers(q: str = ""):
    results = search_tickers(q)
    return {
        "results": [
            {"symbol": sym, **get_stock_data(sym)}
            for sym in results[:15]
        ]
    }


@api_router.get("/tickers/universal-search")
async def universal_search_tickers(q: str = "", limit: int = 30):
    """Lightweight universal search — returns categorized symbols WITHOUT live prices.

    Used by the calculator UniversalAssetSearch component which has its own
    crypto price store. Avoids the 5–15s latency of fetching yfinance per ticker.
    """
    capped_limit = max(1, min(50, limit))
    results = search_tickers(q)[:capped_limit]
    return {
        "results": [
            {"symbol": sym, **_classify_symbol(sym)}
            for sym in results
        ]
    }


@api_router.get("/options/expirations/{symbol}")
async def opt_get_expirations(symbol: str):
    stock = get_stock_data(symbol)
    expirations = get_available_expirations(symbol)
    if not expirations:
        expirations = generate_expirations()
    return {"stock": stock, "expirations": expirations}


@api_router.get("/options/chain/{symbol}")
async def opt_get_options_chain(symbol: str, expiration_idx: int = 3):
    stock = get_stock_data(symbol)
    expirations = get_available_expirations(symbol)
    if not expirations:
        expirations = generate_expirations()
    if expiration_idx >= len(expirations):
        expiration_idx = min(3, len(expirations) - 1)
    expiration = expirations[expiration_idx]
    chain = get_options_chain_real(symbol, expiration["date"])
    if not chain:
        chain = generate_options_chain(stock["price"], expiration["daysToExpiry"])
    else:
        # Enrich real chain from yfinance with computed Greeks (yfinance doesn't return them)
        from options_math import delta as _d, gamma_val as _g, theta_val as _th, vega_val as _v
        T = max(expiration["daysToExpiry"], 1) / 365
        r = 0.0525
        for item in chain:
            K = item["strike"]
            for side in ("call", "put"):
                leg = item.get(side, {})
                iv = leg.get("iv") or 0.3
                if iv <= 0:
                    iv = 0.3
                try:
                    leg["delta"] = round(_d(stock["price"], K, T, r, iv, side), 4)
                    leg["gamma"] = round(_g(stock["price"], K, T, r, iv), 6)
                    leg["theta"] = round(_th(stock["price"], K, T, r, iv, side), 4)
                    leg["vega"] = round(_v(stock["price"], K, T, r, iv), 4)
                except (ValueError, ZeroDivisionError):
                    leg["delta"] = 0.0
                    leg["gamma"] = 0.0
                    leg["theta"] = 0.0
                    leg["vega"] = 0.0
                # Ensure mid is present
                if "mid" not in leg or leg.get("mid") is None:
                    leg["mid"] = round(((leg.get("bid") or 0) + (leg.get("ask") or 0)) / 2, 2)
    return {"stock": stock, "expiration": expiration, "chain": chain}


@api_router.get("/options/iv-surface/{symbol}")
async def opt_get_iv_surface(symbol: str, max_expirations: int = 8):
    stock = get_stock_data(symbol)
    expirations = get_available_expirations(symbol)
    if not expirations:
        expirations = generate_expirations()
    expirations = expirations[:max_expirations]
    surface_data = []
    all_strikes = set()
    for exp in expirations:
        chain = get_options_chain_real(symbol, exp["date"])
        if not chain:
            chain = generate_options_chain(stock["price"], exp["daysToExpiry"])
        exp_data = {
            "date": exp["date"],
            "label": exp["label"],
            "daysToExpiry": exp["daysToExpiry"],
            "ivData": []
        }
        for item in chain:
            strike = item["strike"]
            all_strikes.add(strike)
            exp_data["ivData"].append({
                "strike": float(strike),
                "call_iv": item["call"]["iv"],
                "put_iv": item["put"]["iv"],
                "avg_iv": (item["call"]["iv"] + item["put"]["iv"]) / 2,
            })
        surface_data.append(exp_data)
    sorted_strikes = sorted(list(all_strikes))
    atm_strike = min(sorted_strikes, key=lambda x: abs(x - stock["price"])) if sorted_strikes else 0
    return {
        "stock": stock,
        "strikes": sorted_strikes,
        "atm_strike": atm_strike,
        "expirations": surface_data,
    }


@api_router.post("/calculate/payoff")
async def opt_calculate_payoff(request: PayoffRequest) -> Dict[str, Any]:
    try:
        fee = request.feePerContract or 0.0
        legs_dicts = _legs_to_dicts(request.legs)
        points = calculate_payoff(
            legs_dicts,
            request.stockPrice,
            request.priceRange or 0.35,
            request.daysToChart or 30,
            fee_per_contract=fee,
            q=request.dividendYield or 0.0,
        )
        return {
            "points": points,
            "breakEvens": find_break_evens(points),
            "stats": _payoff_summary(legs_dicts, points, fee),
        }
    except Exception as e:
        logging.error(f"Payoff calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/calculate/greeks")
async def opt_calculate_greeks(request: GreeksRequest) -> Dict[str, Any]:
    try:
        legs_dicts = _legs_to_dicts(request.legs)
        return calculate_greeks(legs_dicts, request.stockPrice, q=request.dividendYield or 0.0)
    except Exception as e:
        logging.error(f"Greeks calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/calculate/pnl-attribution")
async def opt_pnl_attribution(request: PnlAttributionRequest) -> Dict[str, Any]:
    """Decompose post-trade P&L into Δ/Γ/Θ/ν contributions."""
    try:
        legs_dicts = _legs_to_dicts(request.legs)
        T0 = max(request.initialDaysToExpiry, 1) / 365
        T1 = max(request.initialDaysToExpiry - request.daysElapsed, 0) / 365
        return calculate_pnl_attribution(
            legs_dicts,
            S0=request.stockPriceInitial,
            S1=request.stockPriceFinal,
            T0=T0,
            T1=T1,
            IV_change=request.ivChangeAbs or 0.0,
            q=request.dividendYield or 0.0,
        )
    except Exception as e:
        logging.error(f"PnL attribution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/calculate/assignment")
async def opt_assignment(request: AssignmentRequest) -> Dict[str, Any]:
    """Simulate exercise/assignment at expiry given a final stock price."""
    try:
        legs_dicts = _legs_to_dicts(request.legs)
        return simulate_assignment(legs_dicts, request.stockPriceAtExpiry)
    except Exception as e:
        logging.error(f"Assignment simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Strategy Optimizer ---
class OptimizeRequest(BaseModel):
    symbol: str
    sentiment: str  # very_bullish, bullish, neutral, bearish, very_bearish
    targetPrice: float
    budget: float = 10000
    expirationIdx: int = 3
    mode: str = "max_return"  # max_return | max_chance
    maxResults: int = 8


@api_router.post("/optimize")
async def optimize_options_strategy(req: OptimizeRequest):
    try:
        from options_optimize import optimize_strategies
        stock = get_stock_data(req.symbol)
        expirations = get_available_expirations(req.symbol) or generate_expirations()
        idx = max(0, min(req.expirationIdx, len(expirations) - 1))
        expiration = expirations[idx]
        chain = get_options_chain_real(req.symbol, expiration["date"])
        if not chain:
            chain = generate_options_chain(stock["price"], expiration["daysToExpiry"])

        results = optimize_strategies(
            symbol=req.symbol,
            sentiment=req.sentiment,
            target_price=req.targetPrice,
            budget=req.budget,
            chain=chain,
            spot=stock["price"],
            days_to_expiry=expiration["daysToExpiry"],
            expiration_label=expiration["fullLabel"],
            mode=req.mode,
            max_results=req.maxResults,
        )
        return {
            "stock": stock,
            "expiration": expiration,
            "target": {
                "price": req.targetPrice,
                "budget": req.budget,
                "sentiment": req.sentiment,
                "mode": req.mode,
            },
            "results": results,
        }
    except Exception as e:
        logging.error(f"Optimize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/options/earnings/{symbol}")
async def get_next_earnings(symbol: str):
    """Next earnings date from yfinance (used to warn about IV crush)."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        cal = None
        try:
            cal = ticker.calendar
        except Exception:
            cal = None
        earnings_date = None
        if cal is not None:
            if hasattr(cal, "to_dict"):
                data = cal.to_dict()
                dates = data.get("Earnings Date", {}) if isinstance(data, dict) else {}
                if dates:
                    first = next(iter(dates.values()), None)
                    if first:
                        earnings_date = str(first)[:10]
            elif isinstance(cal, dict):
                ed = cal.get("Earnings Date")
                if ed:
                    earnings_date = str(ed[0] if isinstance(ed, list) else ed)[:10]
        return {"symbol": symbol.upper(), "nextEarnings": earnings_date}
    except Exception as e:
        logging.warning(f"earnings lookup failed for {symbol}: {e}")
        return {"symbol": symbol.upper(), "nextEarnings": None}


class SavedLeg(BaseModel):
    type: str
    action: str
    quantity: int = 1
    strike: float
    premium: float = 0
    iv: Optional[float] = 0.3
    daysToExpiry: Optional[int] = 30


class SavePositionRequest(BaseModel):
    name: str
    symbol: str
    legs: List[SavedLeg]
    expiration: Optional[str] = None
    notes: Optional[str] = ""


@api_router.post("/options/positions/save")
async def save_position(req: SavePositionRequest, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    position = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": req.name,
        "symbol": req.symbol.upper(),
        "legs": [leg.model_dump() for leg in req.legs],
        "expiration": req.expiration,
        "notes": req.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.saved_positions.insert_one(position)
    return {**{k: v for k, v in position.items() if k != "_id"}}


@api_router.get("/options/positions")
async def list_positions(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    cursor = db.saved_positions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    positions = await cursor.to_list(length=100)
    return {"positions": positions}


@api_router.delete("/options/positions/{position_id}")
async def delete_position(position_id: str, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    result = await db.saved_positions.delete_one({"id": position_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Position not found")
    return {"status": "deleted", "id": position_id}


@api_router.get("/options/positions/portfolio-greeks")
async def portfolio_greeks(user=Depends(get_current_user)):
    """Aggregate Greeks across ALL saved positions using current spot prices."""
    if not user:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    cursor = db.saved_positions.find({"user_id": user["id"]}, {"_id": 0})
    positions = await cursor.to_list(length=100)
    agg = {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0, "rho": 0.0}
    count_by_symbol = {}
    enriched = []
    for pos in positions:
        try:
            stock = get_stock_data(pos["symbol"])
            legs_dicts = []
            for leg in pos.get("legs", []):
                legs_dicts.append({
                    "type": leg["type"],
                    "action": leg["action"],
                    "quantity": leg.get("quantity", 1),
                    "qty": leg.get("quantity", 1),
                    "strike": leg["strike"],
                    "premium": leg.get("premium", 0),
                    "iv": leg.get("iv", 0.3) or 0.3,
                    "daysToExpiry": leg.get("daysToExpiry", 30),
                })
            g = calculate_greeks(legs_dicts, stock["price"])
            for k in agg:
                agg[k] += float(g.get(k, 0) or 0)
            count_by_symbol[pos["symbol"]] = count_by_symbol.get(pos["symbol"], 0) + 1
            enriched.append({
                "id": pos["id"],
                "name": pos["name"],
                "symbol": pos["symbol"],
                "currentPrice": stock["price"],
                "greeks": g,
                "legsCount": len(legs_dicts),
                "expiration": pos.get("expiration"),
            })
        except Exception as e:
            logging.warning(f"skipping position {pos.get('id')} in aggregation: {e}")
    return {
        "aggregated": {k: round(v, 4) for k, v in agg.items()},
        "positionCount": len(positions),
        "symbols": count_by_symbol,
        "positions": enriched,
    }


# ========== P1 FEATURES: IV Rank & Unusual Options Activity ==========
def _compute_realized_vol_series(hist) -> Optional[Any]:
    """Return the rolling-20d annualised realised-vol series (or None if not enough data)."""
    import numpy as np
    closes = hist["Close"].dropna()
    log_returns = np.log(closes / closes.shift(1)).dropna()
    rolling_vol = log_returns.rolling(window=20).std() * np.sqrt(252)
    rolling_vol = rolling_vol.dropna()
    if len(rolling_vol) < 10:
        return None
    return rolling_vol


def _fetch_atm_iv_proxy(symbol: str, spot: float) -> Optional[float]:
    """Return current ATM IV (avg of call+put) from the 4th available expiration, if any."""
    try:
        exps = get_available_expirations(symbol)
        if not exps:
            return None
        chain = get_options_chain_real(symbol, exps[min(3, len(exps) - 1)]["date"])
        if not chain:
            return None
        atm = min(chain, key=lambda c: abs(c["strike"] - spot))
        ivs = [v for v in [atm.get("call", {}).get("iv"), atm.get("put", {}).get("iv")] if v and v > 0]
        return sum(ivs) / len(ivs) if ivs else None
    except Exception as e:
        logging.warning(f"IV rank ATM IV fetch failed: {e}")
        return None


def _iv_rank_recommendation(iv_rank: float) -> str:
    """Map an IV rank score to a semantic recommendation key."""
    if iv_rank >= 60:
        return "sell_premium"
    if iv_rank <= 30:
        return "buy_premium"
    return "neutral"


@api_router.get("/options/iv-rank/{symbol}")
async def get_iv_rank(symbol: str) -> Dict[str, Any]:
    """Compute IV Rank & Percentile from realized volatility (1y window)."""
    try:
        import yfinance as yf
        hist = yf.Ticker(symbol).history(period="1y")
        if hist.empty or len(hist) < 30:
            return {"symbol": symbol.upper(), "available": False}

        rolling_vol = _compute_realized_vol_series(hist)
        if rolling_vol is None:
            return {"symbol": symbol.upper(), "available": False}

        spot = float(hist["Close"].iloc[-1])
        current_iv = _fetch_atm_iv_proxy(symbol, spot)

        iv_high = float(rolling_vol.max())
        iv_low = float(rolling_vol.min())
        iv_now = current_iv if current_iv else float(rolling_vol.iloc[-1])

        iv_range = iv_high - iv_low
        iv_rank = ((iv_now - iv_low) / iv_range * 100) if iv_range > 0.001 else 50.0
        iv_rank = max(0, min(100, iv_rank))
        iv_percentile = float((rolling_vol < iv_now).sum() / len(rolling_vol) * 100)

        return {
            "symbol": symbol.upper(),
            "available": True,
            "ivCurrent": round(iv_now, 4),
            "ivHigh52w": round(iv_high, 4),
            "ivLow52w": round(iv_low, 4),
            "ivRank": round(iv_rank, 1),
            "ivPercentile": round(iv_percentile, 1),
            "recommendation": _iv_rank_recommendation(iv_rank),
        }
    except Exception as e:
        logging.error(f"IV rank error for {symbol}: {e}")
        return {"symbol": symbol.upper(), "available": False, "error": str(e)}


def _build_unusual_row(symbol: str, side: str, row: Dict[str, Any], opt: Dict[str, Any],
                       exp: Dict[str, Any], stock: Dict[str, Any], ratio: float) -> Dict[str, Any]:
    """Construct one normalized unusual-options row."""
    moneyness_pct = ((row["strike"] - stock["price"]) / stock["price"]) * 100
    is_itm = (side == "call" and row["strike"] < stock["price"]) or \
             (side == "put"  and row["strike"] > stock["price"])
    return {
        "symbol": symbol.upper(),
        "type": side,
        "strike": row["strike"],
        "expiration": exp["fullLabel"],
        "daysToExpiry": exp["daysToExpiry"],
        "volume": opt.get("volume", 0) or 0,
        "openInterest": opt.get("openInterest", 0) or 0,
        "ratio": round(ratio, 2),
        "iv": round(opt.get("iv", 0) or 0, 4),
        "premium": opt.get("mid", 0),
        "bid": opt.get("bid"),
        "ask": opt.get("ask"),
        "last": opt.get("last"),
        "moneynessPct": round(moneyness_pct, 2),
        "isITM": is_itm,
        "estNotional": round((opt.get("volume", 0) or 0) * (opt.get("mid", 0) or 0) * 100, 0),
    }


def _scan_chain_for_unusual(symbol: str, chain: List[Dict[str, Any]], exp: Dict[str, Any],
                            stock: Dict[str, Any], min_ratio: float, min_volume: int) -> List[Dict[str, Any]]:
    """Walk one chain (single expiry) and return the rows that pass the filters."""
    rows: List[Dict[str, Any]] = []
    for row in chain:
        for side in ("call", "put"):
            opt = row.get(side, {})
            vol = opt.get("volume", 0) or 0
            oi = opt.get("openInterest", 0) or 0
            if vol < min_volume:
                continue
            ratio = vol / max(oi, 1)
            if ratio < min_ratio:
                continue
            rows.append(_build_unusual_row(symbol, side, row, opt, exp, stock, ratio))
    return rows


@api_router.get("/options/unusual/{symbol}")
async def get_unusual_options(symbol: str, min_ratio: float = 2.0, min_volume: int = 100) -> Dict[str, Any]:
    """Detect unusual options activity (volume >> open interest) across the 5 nearest expiries."""
    try:
        stock = get_stock_data(symbol)
        expirations = get_available_expirations(symbol) or generate_expirations()

        all_unusual: List[Dict[str, Any]] = []
        for exp in expirations[:5]:
            chain = get_options_chain_real(symbol, exp["date"])
            if not chain:
                continue
            all_unusual.extend(_scan_chain_for_unusual(symbol, chain, exp, stock, min_ratio, min_volume))

        all_unusual.sort(key=lambda x: (x["ratio"], x["estNotional"]), reverse=True)
        return {
            "symbol": symbol.upper(),
            "stock": stock,
            "totalFound": len(all_unusual),
            "filters": {"minRatio": min_ratio, "minVolume": min_volume},
            "results": all_unusual[:50],
        }
    except Exception as e:
        logging.error(f"Unusual options error for {symbol}: {e}")
        return {"symbol": symbol.upper(), "error": str(e), "results": []}


# ========== P2 FEATURES: AI Trade Coach, Market-wide Flow ==========
class AITradeAnalysisRequest(BaseModel):
    symbol: str
    stockPrice: float
    legs: List[dict]
    stats: dict  # {maxProfit, maxLoss, pop, roi, rr, capitalRequired, isMaxLossUnlimited}
    greeks: Optional[dict] = None
    ivRank: Optional[float] = None
    daysToExpiry: Optional[int] = 30
    userBalance: Optional[float] = None


def _format_legs_for_prompt(legs: List[Dict[str, Any]]) -> List[str]:
    """Render a list of trade legs as human-readable bullet strings."""
    out: List[str] = []
    for leg in legs:
        if leg.get("type") == "stock":
            out.append(f"{leg['action'].upper()} {leg.get('quantity', 100)} acciones @ ${leg.get('strike')}")
        else:
            out.append(
                f"{leg['action'].upper()} {leg.get('quantity', 1)}x {leg['type'].upper()} Strike ${leg['strike']} "
                f"@ ${leg.get('premium', 0):.2f} (IV {(leg.get('iv', 0.3) * 100):.0f}%)"
            )
    return out


def _build_ai_trade_prompt(req: "AITradeAnalysisRequest") -> str:
    """Compose the markdown prompt sent to Claude. Pure / side-effect free."""
    legs_lines = _format_legs_for_prompt(req.legs)
    greeks_str = ""
    if req.greeks:
        greeks_str = (
            f"\nGreeks: Delta={req.greeks.get('delta', 0):.3f} Gamma={req.greeks.get('gamma', 0):.4f} "
            f"Theta={req.greeks.get('theta', 0):.3f} Vega={req.greeks.get('vega', 0):.3f}"
        )
    iv_str = f"\nIV Rank: {req.ivRank:.0f}%" if req.ivRank is not None else ""
    balance_str = f"\nCapital disponible del trader: ${req.userBalance}" if req.userBalance else ""

    max_profit_str = "Ilimitado" if req.stats.get("isMaxProfitUnlimited") else f"${req.stats.get('maxProfit', 0)}"
    max_loss_str = "Ilimitado" if req.stats.get("isMaxLossUnlimited") else f"${req.stats.get('maxLoss', 0)}"

    return f"""Actúa como un coach de trading de opciones experto y conciso. Analiza esta operación:

Subyacente: {req.symbol} @ ${req.stockPrice:.2f}
Vencimiento: {req.daysToExpiry}d

Legs:
{chr(10).join(['  - ' + leg for leg in legs_lines])}

Métricas:
- Máx. Beneficio: {max_profit_str}
- Máx. Pérdida: {max_loss_str}
- POP: {req.stats.get('pop', '—')}%
- ROI: {req.stats.get('roi', '—')}%
- R/R: {req.stats.get('rr', '—')}
- Capital requerido: ${req.stats.get('capitalRequired', 0)}{greeks_str}{iv_str}{balance_str}

Proporciona tu análisis en ESPAÑOL con EXACTAMENTE esta estructura (Markdown):

**✅ Puntos Fuertes**
- (2-3 bullets concretos)

**⚠️ Riesgos Principales**
- (2-3 bullets concretos)

**💡 Mejoras Sugeridas**
- (2-3 acciones accionables específicas: strikes distintos, ajustar contratos, hedge, rolar, etc.)

**📊 Veredicto**
Una frase final recomendando ENTRAR / AJUSTAR / EVITAR y por qué.

Sé directo, profesional y práctico. No repitas los números que ya tiene el trader — analiza el SIGNIFICADO. Máximo 250 palabras totales."""


@api_router.post("/options/ai-analyze")
async def ai_analyze_trade(req: AITradeAnalysisRequest) -> Dict[str, Any]:
    """AI-powered options trade coach using Claude via Anthropic SDK."""
    try:
        import anthropic as _anthropic
        import asyncio as _asyncio
        api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI key not configured")

        client = _anthropic.Anthropic(api_key=api_key)
        prompt = _build_ai_trade_prompt(req)
        message = await _asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=1024,
                system=(
                    "Eres un coach de trading de opciones experto con 15+ años de experiencia "
                    "en volatility trading. Respondes en español, directo, profesional, y basado en datos."
                ),
                messages=[{"role": "user", "content": prompt}],
            ),
        )
        return {"analysis": message.content[0].text, "model": "claude-sonnet-4-5"}
    except _anthropic.APIError as e:
        logging.error(f"AI analyze API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")
    except Exception as e:
        logging.error(f"AI analyze error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")


# Popular tickers scanned by Market-Wide Flow
MARKET_FLOW_TICKERS = [
    "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "NVDA", "TSLA", "META",
    "AMZN", "GOOGL", "AMD", "COIN", "MARA", "PLTR", "NFLX", "BA", "JPM",
    "GME", "AMC", "SOFI", "RIVN", "F", "UBER",
]


def _build_market_flow_row(sym: str, side: str, row: Dict[str, Any], opt: Dict[str, Any],
                           exp: Dict[str, Any], stock: Dict[str, Any], ratio: float) -> Dict[str, Any]:
    """Slimmer flow row used by the market-wide scan (skips bid/ask/last)."""
    vol = opt.get("volume", 0) or 0
    return {
        "symbol": sym, "stockPrice": stock["price"],
        "type": side, "strike": row["strike"],
        "expiration": exp["fullLabel"], "daysToExpiry": exp["daysToExpiry"],
        "volume": vol, "openInterest": opt.get("openInterest", 0) or 0,
        "ratio": round(ratio, 2),
        "iv": round(opt.get("iv", 0) or 0, 4),
        "premium": opt.get("mid", 0),
        "estNotional": round(vol * (opt.get("mid", 0) or 0) * 100, 0),
        "moneynessPct": round(((row["strike"] - stock["price"]) / stock["price"]) * 100, 2),
    }


def _scan_chain_for_flow(sym: str, chain: List[Dict[str, Any]], exp: Dict[str, Any],
                         stock: Dict[str, Any], min_ratio: float, min_volume: int) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for row in chain:
        for side in ("call", "put"):
            opt = row.get(side, {})
            vol = opt.get("volume", 0) or 0
            oi = opt.get("openInterest", 0) or 0
            if vol < min_volume:
                continue
            ratio = vol / max(oi, 1)
            if ratio < min_ratio:
                continue
            rows.append(_build_market_flow_row(sym, side, row, opt, exp, stock, ratio))
    return rows


def _scan_ticker_flow(sym: str, min_ratio: float, min_volume: int) -> List[Dict[str, Any]]:
    """Scan one ticker's 2 nearest expiries; return any unusual flow rows or [] on error."""
    try:
        stock = get_stock_data(sym)
        expirations = get_available_expirations(sym) or []
        rows: List[Dict[str, Any]] = []
        for exp in expirations[:2]:  # 2 nearest expirations for speed
            chain = get_options_chain_real(sym, exp["date"])
            if not chain:
                continue
            rows.extend(_scan_chain_for_flow(sym, chain, exp, stock, min_ratio, min_volume))
        return rows
    except Exception as e:
        logging.warning(f"market-flow skipping {sym}: {e}")
        return []


@api_router.get("/options/market-flow")
async def market_wide_flow(min_ratio: float = 3.0, min_volume: int = 300, max_results: int = 30) -> Dict[str, Any]:
    """Scan popular tickers for unusual options activity (market-wide flow)."""
    try:
        all_flow: List[Dict[str, Any]] = []
        for sym in MARKET_FLOW_TICKERS:
            all_flow.extend(_scan_ticker_flow(sym, min_ratio, min_volume))
        all_flow.sort(key=lambda x: x["estNotional"], reverse=True)
        return {
            "scannedTickers": len(MARKET_FLOW_TICKERS),
            "totalFound": len(all_flow),
            "results": all_flow[:max_results],
        }
    except Exception as e:
        logging.error(f"Market flow error: {e}")
        return {"error": str(e), "results": []}


# ========== EDUCATION: Live Pattern Detector ==========
def _yfinance_to_ohlc_rows(symbol: str, period: str = "3mo", interval: str = "1d") -> List[Dict[str, Any]]:
    """Fetch historical OHLC from Yahoo Finance and shape it for the detector."""
    import yfinance as yf
    hist = yf.Ticker(symbol).history(period=period, interval=interval)
    if hist.empty:
        return []
    rows: List[Dict[str, Any]] = []
    for idx, row in hist.iterrows():
        rows.append({
            "date": idx.strftime("%Y-%m-%d"),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
        })
    return rows


@api_router.get("/education/pattern-scan/{symbol}")
async def education_pattern_scan(
    symbol: str, period: str = "3mo", interval: str = "1d", limit: int = 30,
) -> Dict[str, Any]:
    """Scan real OHLC for the given ticker and return canonical candlestick
    pattern detections (educational view)."""
    sym = symbol.upper().strip()
    try:
        rows = _yfinance_to_ohlc_rows(sym, period=period, interval=interval)
        if not rows:
            return {"symbol": sym, "rowsScanned": 0, "totalDetections": 0, "detections": []}
        detections = detect_all_patterns(rows)
        # Most recent first, capped at `limit`.
        detections.reverse()
        return {
            "symbol": sym,
            "period": period,
            "interval": interval,
            "rowsScanned": len(rows),
            "totalDetections": len(detections),
            "detections": detections[:limit],
        }
    except Exception as e:
        logging.error(f"Pattern scan error for {sym}: {e}")
        return {"symbol": sym, "error": str(e), "detections": []}


# ============================================================
# PERFORMANCE — Trade Journal & Analytics
# ============================================================

class TradeIn(BaseModel):
    """Payload for creating/updating a trade."""
    symbol: str
    side: str = Field(..., pattern="^(long|short)$")
    setup: Optional[str] = ""
    entry_price: float
    exit_price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    quantity: float
    entry_date: Optional[str] = None
    exit_date: Optional[str] = None
    status: Optional[str] = None  # open | closed | sl_hit | tp_hit
    account_balance: Optional[float] = 0
    fees: Optional[float] = 0
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    emotion: Optional[int] = None  # 1..5
    screenshot_urls: Optional[List[str]] = []


def _enrich_trade(trade: dict, prev_trades: Optional[List[dict]] = None) -> dict:
    """Compute pnl + errors. Output is JSON-safe (no _id)."""
    enriched = compute_trade_pnl(trade)
    enriched["errors"] = detect_errors(enriched, prev_trades=prev_trades)
    enriched.pop("_id", None)
    return enriched


@api_router.post("/performance/trades")
async def perf_create_trade(payload: TradeIn, user: dict = Depends(require_user)):
    user_id = user["id"]
    prev = await trades_for_user(db, user_id, limit=50)
    doc = make_trade_doc(payload.model_dump(), user_id)
    enriched = _enrich_trade(doc, prev_trades=prev)
    # Strip computed read-only fields before persisting (keep stored doc minimal)
    to_store = {k: v for k, v in enriched.items() if k not in ("_id",)}
    await db.trades.insert_one(to_store)
    return enriched


class BulkTradesIn(BaseModel):
    """Payload for bulk importing trades (CSV import)."""
    trades: List[TradeIn]


@api_router.post("/performance/trades/bulk")
async def perf_bulk_create_trades(
    payload: BulkTradesIn,
    user: dict = Depends(require_user),
):
    """Import multiple trades at once. Returns imported count + any rejected rows.

    Each row is enriched and saved individually so a single bad row doesn't
    block the rest of the import.
    """
    user_id = user["id"]
    imported, failed = [], []
    # Fetch once; don't re-fetch inside the loop.
    prev = await trades_for_user(db, user_id, limit=100)
    for i, payload_item in enumerate(payload.trades):
        try:
            doc = make_trade_doc(payload_item.model_dump(), user_id)
            enriched = _enrich_trade(doc, prev_trades=prev)
            to_store = {k: v for k, v in enriched.items() if k not in ("_id",)}
            await db.trades.insert_one(to_store)
            imported.append(enriched)
            # Append to prev so revenge-trade detection sees the just-imported row
            prev.append(enriched)
        except Exception as exc:  # noqa: BLE001 — surface per-row failure
            failed.append({"row": i + 1, "error": str(exc)})
    return {
        "imported": len(imported),
        "failed": failed,
        "trades": imported,
    }


@api_router.get("/performance/trades")
async def perf_list_trades(
    user: dict = Depends(require_user),
    limit: int = 100,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
):
    query: Dict[str, Any] = {"user_id": user["id"]}
    if status:
        query["status"] = status
    if symbol:
        query["symbol"] = symbol.upper()
    cursor = db.trades.find(query, {"_id": 0}).sort("entry_date", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    # Re-enrich on each fetch so updates to detection rules apply retroactively
    enriched_rows = []
    seen: List[dict] = []
    for t in reversed(rows):  # chronological order for prev_trades context
        enriched_rows.append(_enrich_trade(t, prev_trades=list(seen)))
        seen.append(enriched_rows[-1])
    enriched_rows.reverse()
    return {"trades": enriched_rows, "count": len(enriched_rows)}


@api_router.get("/performance/trades/{trade_id}")
async def perf_get_trade(trade_id: str, user: dict = Depends(require_user)):
    t = await db.trades.find_one(
        {"id": trade_id, "user_id": user["id"]},
        {"_id": 0},
    )
    if not t:
        raise HTTPException(status_code=404, detail="Trade not found")
    prev = await trades_for_user(db, user["id"], limit=50)
    return _enrich_trade(t, prev_trades=prev)


@api_router.put("/performance/trades/{trade_id}")
async def perf_update_trade(trade_id: str, payload: TradeIn, user: dict = Depends(require_user)):
    existing = await db.trades.find_one(
        {"id": trade_id, "user_id": user["id"]},
        {"_id": 0},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Trade not found")

    updates = payload.model_dump(exclude_unset=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    # If exit_price now set and status omitted, mark closed
    if updates.get("exit_price") is not None and not updates.get("status"):
        updates["status"] = "closed"

    merged = {**existing, **updates}
    prev = [t for t in await trades_for_user(db, user["id"], limit=50)
            if t.get("id") != trade_id]
    enriched = _enrich_trade(merged, prev_trades=prev)
    enriched.pop("_id", None)

    await db.trades.update_one(
        {"id": trade_id, "user_id": user["id"]},
        {"$set": enriched},
    )
    return enriched


@api_router.delete("/performance/trades/{trade_id}")
async def perf_delete_trade(trade_id: str, user: dict = Depends(require_user)):
    res = await db.trades.delete_one({"id": trade_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"ok": True}


@api_router.get("/performance/analytics")
async def performance_analytics(user: dict = Depends(require_user)):
    rows = await trades_for_user(db, user["id"], limit=1000)
    # Re-enrich to get fresh errors and pnl
    enriched: List[dict] = []
    seen: List[dict] = []
    for t in reversed(rows):
        e = _enrich_trade(t, prev_trades=list(seen))
        enriched.append(e)
        seen.append(e)
    enriched.reverse()
    analytics = compute_analytics(enriched)
    insights = generate_insights(analytics)
    return {"analytics": analytics, "insights": insights}


# ============= ADMIN PANEL =============

def _serialize_admin_user(u: dict) -> dict:
    """Strip internal fields from a user document for admin views."""
    return {
        "id": u.get("id"),
        "email": u.get("email"),
        "name": u.get("name"),
        "auth_provider": u.get("auth_provider", "password"),
        "is_premium": check_premium(u),
        "is_admin": bool(u.get("is_admin")),
        "subscription_plan": u.get("subscription_plan"),
        "subscription_end": u.get("subscription_end"),
        "subscription_status": u.get("subscription_status"),  # active, canceled, past_due …
        "stripe_customer_id": u.get("stripe_customer_id"),
        "stripe_subscription_id": u.get("stripe_subscription_id"),
        "preferred_locale": u.get("preferred_locale"),
        "created_at": u.get("created_at"),
        "last_payment_amount": u.get("last_payment_amount"),
        "last_payment_at": u.get("last_payment_at"),
    }


@api_router.get("/admin/users")
async def admin_list_users(
    admin: dict = Depends(require_admin),
    q: Optional[str] = None,                     # email/name search
    plan: Optional[str] = None,                  # monthly|quarterly|annual|lifetime|none
    status: Optional[str] = None,                # active|canceled|expired|none
    provider: Optional[str] = None,              # password|google
    locale: Optional[str] = None,                # es|en|de|...
    limit: int = 200,
    skip: int = 0,
):
    """Paged, filterable user list for the /admin panel."""
    query: Dict[str, Any] = {}

    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"name":  {"$regex": q, "$options": "i"}},
        ]
    if plan:
        query["subscription_plan"] = None if plan == "none" else plan
    if provider:
        # Treat missing field as "password" for legacy users.
        query["auth_provider"] = provider if provider != "password" else {"$in": ["password", None]}
    if locale:
        query["preferred_locale"] = locale

    cursor = db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = [_serialize_admin_user(u) async for u in cursor]

    if status:
        # Apply status as a Python-side filter because `is_premium` is a derived check.
        def _matches(u):
            sub_end = u.get("subscription_end")
            if status == "active":
                return u["is_premium"]
            if status == "canceled":
                return u.get("subscription_status") == "canceled"
            if status == "expired":
                return (sub_end is not None) and not u["is_premium"]
            if status == "none":
                return u.get("subscription_plan") is None
            return True
        users = [u for u in users if _matches(u)]

    total = await db.users.count_documents(query)
    return {"users": users, "total": total, "skip": skip, "limit": limit}


@api_router.get("/admin/users.csv")
async def admin_export_users_csv(admin: dict = Depends(require_admin)):
    """Export the full user list as CSV (one row per user)."""
    import csv
    import io
    cursor = db.users.find({}, {"_id": 0, "password": 0})
    rows = [_serialize_admin_user(u) async for u in cursor]

    cols = [
        "email", "name", "auth_provider", "is_premium", "is_admin",
        "subscription_plan", "subscription_end", "subscription_status",
        "stripe_customer_id", "preferred_locale", "created_at",
        "last_payment_amount", "last_payment_at",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

    from fastapi.responses import Response
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tcp-users.csv"'},
    )


@api_router.get("/admin/metrics")
async def admin_metrics(admin: dict = Depends(require_admin)):
    """Aggregate KPIs for the admin overview header."""
    pipeline_plan = [
        {"$group": {"_id": "$subscription_plan", "count": {"$sum": 1}}}
    ]
    pipeline_locale = [
        {"$group": {"_id": "$preferred_locale", "count": {"$sum": 1}}}
    ]
    by_plan, by_locale = [], []
    async for r in db.users.aggregate(pipeline_plan):
        by_plan.append({"plan": r["_id"] or "free", "count": r["count"]})
    async for r in db.users.aggregate(pipeline_locale):
        by_locale.append({"locale": r["_id"] or "es", "count": r["count"]})

    total = await db.users.count_documents({})
    free  = await db.users.count_documents({"subscription_plan": None})
    premium = total - free

    # MRR (rough — uses plan price ÷ months)
    plan_mrr = {"monthly": 9.99, "quarterly": 19.99 / 3, "annual": 79.99 / 12, "lifetime": 0}
    mrr = 0.0
    for r in by_plan:
        mrr += plan_mrr.get(r["plan"], 0) * r["count"]

    # New users last 30 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    new_30d = await db.users.count_documents({"created_at": {"$gte": cutoff}})

    return {
        "total_users":   total,
        "premium_users": premium,
        "free_users":    free,
        "mrr_usd":       round(mrr, 2),
        "new_users_30d": new_30d,
        "by_plan":       by_plan,
        "by_locale":     by_locale,
    }


class AdminPromoteRequest(BaseModel):
    email: EmailStr
    is_admin: bool = True


@api_router.post("/admin/promote")
async def admin_promote_user(request: Request, payload: AdminPromoteRequest, admin: dict = Depends(require_admin)):
    """Toggle is_admin flag for any user (only callable by an existing admin)."""
    target = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    result = await db.users.update_one(
        {"email": payload.email.lower()},
        {"$set": {"is_admin": payload.is_admin}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await log_admin_action(
        admin=admin,
        action="user.promote" if payload.is_admin else "user.demote",
        target_type="user",
        target_id=target["id"],
        target_email=target["email"],
        details={"is_admin_before": bool(target.get("is_admin")), "is_admin_after": payload.is_admin},
        request=request,
    )
    return {"email": payload.email, "is_admin": payload.is_admin}


# ============= ADMIN — REAL USER CRUD =============

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    subscription_plan: Optional[str] = None       # monthly|quarterly|annual|lifetime|None
    is_premium: bool = False
    is_admin: bool = False
    subscription_end: Optional[str] = None        # ISO date string


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    subscription_plan: Optional[str] = None       # use empty string "" or "none" to clear
    is_premium: Optional[bool] = None
    is_admin: Optional[bool] = None
    subscription_end: Optional[str] = None
    subscription_status: Optional[str] = None     # active|canceled|past_due|expired|None
    preferred_locale: Optional[str] = None


class AdminPasswordReset(BaseModel):
    new_password: str


def _normalize_plan(plan: Optional[str]) -> Optional[str]:
    """Convert UI-friendly empty/none to actual MongoDB value."""
    if plan in (None, "", "none", "free"):
        return None
    if plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail=f"Plan inválido: {plan}")
    return plan


def _compute_subscription_end(plan: Optional[str], explicit_end: Optional[str]) -> Optional[str]:
    """If admin sets a plan but no end-date, derive a reasonable end-of-period."""
    if explicit_end:
        return explicit_end
    if plan is None:
        return None
    if plan == "lifetime":
        return None
    days = SUBSCRIPTION_PLANS.get(plan, {}).get("days", 30)
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


@api_router.post("/admin/users", response_model=dict)
async def admin_create_user(request: Request, payload: AdminUserCreate, admin: dict = Depends(require_admin)):
    """Create a new user from the admin panel (full control over plan / premium / admin)."""
    email_lc = payload.email.lower()
    existing = await db.users.find_one({"email": email_lc})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    plan = _normalize_plan(payload.subscription_plan)
    sub_end = _compute_subscription_end(plan, payload.subscription_end)
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email_lc,
        "password": hash_password(payload.password),
        "name": payload.name,
        "subscription_plan": plan,
        "subscription_end": sub_end,
        "subscription_status": "active" if plan else None,
        "is_premium": bool(payload.is_premium or plan == "lifetime"),
        "is_admin": bool(payload.is_admin),
        "auth_provider": "password",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by_admin": admin.get("email"),
    }
    await db.users.insert_one(user)
    await log_admin_action(
        admin=admin,
        action="user.create",
        target_type="user",
        target_id=user_id,
        target_email=email_lc,
        details={
            "plan": plan, "is_premium": user["is_premium"], "is_admin": user["is_admin"],
            "name": payload.name,
        },
        request=request,
    )
    return {"ok": True, "user": _serialize_admin_user(user)}


@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(request: Request, user_id: str, payload: AdminUserUpdate, admin: dict = Depends(require_admin)):
    """Update editable fields of a user."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    updates: Dict[str, Any] = {}

    if payload.name is not None:
        updates["name"] = payload.name

    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != user["email"]:
            clash = await db.users.find_one({"email": new_email, "id": {"$ne": user_id}})
            if clash:
                raise HTTPException(status_code=400, detail="Ese email ya está en uso por otro usuario")
            updates["email"] = new_email

    if payload.subscription_plan is not None:
        plan = _normalize_plan(payload.subscription_plan)
        updates["subscription_plan"] = plan
        # Derive end-date if plan changed and admin didn't pass an explicit one.
        if payload.subscription_end is None:
            updates["subscription_end"] = _compute_subscription_end(plan, None)

    if payload.subscription_end is not None:
        updates["subscription_end"] = payload.subscription_end or None

    if payload.subscription_status is not None:
        updates["subscription_status"] = payload.subscription_status or None

    if payload.is_premium is not None:
        updates["is_premium"] = bool(payload.is_premium)

    if payload.is_admin is not None:
        updates["is_admin"] = bool(payload.is_admin)

    if payload.preferred_locale is not None:
        updates["preferred_locale"] = payload.preferred_locale or None

    if not updates:
        return {"ok": True, "user": _serialize_admin_user(user), "message": "Sin cambios"}

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by_admin"] = admin.get("email")

    await db.users.update_one({"id": user_id}, {"$set": updates})
    fresh = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    await log_admin_action(
        admin=admin,
        action="user.update",
        target_type="user",
        target_id=user_id,
        target_email=fresh.get("email", ""),
        details={"changed_fields": list(updates.keys()), "after": {
            k: fresh.get(k) for k in (
                "name", "email", "subscription_plan", "subscription_end",
                "subscription_status", "is_premium", "is_admin",
            )
        }},
        request=request,
    )
    return {"ok": True, "user": _serialize_admin_user(fresh)}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(request: Request, user_id: str, admin: dict = Depends(require_admin)):
    """Hard-delete a user. Self-delete and demo-delete are blocked for safety."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="No puedes borrarte a ti mismo")
    if user.get("email") == DEMO_EMAIL:
        raise HTTPException(status_code=400, detail="No se puede borrar el usuario demo")

    await db.users.delete_one({"id": user_id})
    # Best-effort cascade (ignore if collections don't exist)
    for coll in ("calculations", "trades", "journal_entries", "alerts", "transactions"):
        try:
            await db[coll].delete_many({"user_id": user_id})
        except Exception:
            pass
    await log_admin_action(
        admin=admin,
        action="user.delete",
        target_type="user",
        target_id=user_id,
        target_email=user.get("email", ""),
        details={
            "plan": user.get("subscription_plan"),
            "is_premium": bool(user.get("is_premium")),
            "is_admin": bool(user.get("is_admin")),
        },
        request=request,
    )
    return {"ok": True, "deleted_id": user_id, "email": user.get("email")}


@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(request: Request, user_id: str, payload: AdminPasswordReset, admin: dict = Depends(require_admin)):
    """Force-set a new password for any user."""
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hash_password(payload.new_password),
            "auth_provider": "password",
            "password_reset_at": datetime.now(timezone.utc).isoformat(),
            "password_reset_by": admin.get("email"),
        }},
    )
    # Revoke all existing sessions of that user (security: old tokens stop working).
    await _revoke_all_tokens_for_user(user_id)
    await log_admin_action(
        admin=admin,
        action="user.reset_password",
        target_type="user",
        target_id=user_id,
        target_email=user.get("email", ""),
        details={"sessions_revoked": True},
        request=request,
    )
    return {"ok": True, "email": user.get("email")}


# ============= ADMIN — APP SETTINGS (Google APIs etc.) =============
# Stored in `app_settings` collection as a single doc with `_id: "global"`.
# Admin can edit all keys; the public projection (non-secret) is read by the
# SPA at boot to dynamically load GA4/GTM/AdSense/Bing/GSC scripts WITHOUT
# rebuilding the frontend. Secrets (Stripe/PayPal/Coinbase keys, OAuth client
# secrets, SendGrid) are read at runtime by their respective code paths.

# Public keys → exposed via /api/public/settings (no auth needed).
PUBLIC_SETTING_KEYS = (
    # Google
    "google_client_id",
    "ga4_measurement_id",
    "gtm_id",
    "gsc_verification",
    "adsense_publisher_id",
    "bing_verification",
    # Stripe
    "stripe_publishable_key",
    # PayPal
    "paypal_client_id",
    "paypal_mode",                # "sandbox" | "live"
    # Misc
    "trustpilot_business_id",
    "clarity_project_id",
)

# Secret keys → admin-only, never sent to the SPA bus.
SECRET_SETTING_KEYS = (
    "google_client_secret",
    "stripe_secret_key",
    "stripe_webhook_secret",
    "paypal_client_secret",
    "coinbase_api_key",
    "sendgrid_api_key",
)

ALL_SETTING_KEYS = PUBLIC_SETTING_KEYS + SECRET_SETTING_KEYS

# Map each setting → env var that should be used as fallback when the DB doc
# doesn't define it. Lets admin "see what's actually active" before saving.
_SETTING_ENV_FALLBACK: Dict[str, str] = {
    "google_client_id":       "GOOGLE_CLIENT_ID",
    "google_client_secret":   "GOOGLE_CLIENT_SECRET",
    "ga4_measurement_id":     "REACT_APP_GA4_MEASUREMENT_ID",
    "gtm_id":                 "REACT_APP_GTM_ID",
    "gsc_verification":       "REACT_APP_GSC_VERIFICATION",
    "adsense_publisher_id":   "REACT_APP_ADSENSE_PUBLISHER_ID",
    "bing_verification":      "REACT_APP_BING_VERIFICATION",
    "stripe_publishable_key": "STRIPE_PUBLISHABLE_KEY",
    "stripe_secret_key":      "STRIPE_API_KEY",
    "stripe_webhook_secret":  "STRIPE_WEBHOOK_SECRET",
    "paypal_client_id":       "PAYPAL_CLIENT_ID",
    "paypal_client_secret":   "PAYPAL_CLIENT_SECRET",
    "paypal_mode":            "PAYPAL_MODE",
    "coinbase_api_key":       "COINBASE_API_KEY",
    "sendgrid_api_key":       "SENDGRID_API_KEY",
    "trustpilot_business_id": "REACT_APP_TRUSTPILOT_BUSINESS_ID",
    "clarity_project_id":     "REACT_APP_CLARITY_PROJECT_ID",
}


class AdminSettingsUpdate(BaseModel):
    # Google
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    ga4_measurement_id: Optional[str] = None
    gtm_id: Optional[str] = None
    gsc_verification: Optional[str] = None
    adsense_publisher_id: Optional[str] = None
    bing_verification: Optional[str] = None
    # Stripe
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    # PayPal
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    paypal_mode: Optional[str] = None
    # Crypto / email / misc
    coinbase_api_key: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    trustpilot_business_id: Optional[str] = None
    clarity_project_id: Optional[str] = None


async def _load_settings_doc() -> Dict[str, Any]:
    doc = await db.app_settings.find_one({"_id": "global"}) or {}
    doc.pop("_id", None)
    return doc


async def get_setting(key: str) -> str:
    """Public helper: DB value first, env var fallback. Returns "" if both empty."""
    doc = await _load_settings_doc()
    return (doc.get(key) or os.environ.get(_SETTING_ENV_FALLBACK.get(key, ""), "") or "")


def _mask_secret(val: str) -> str:
    """Show only the last 4 chars of a secret so admin can verify it without re-exposing."""
    if not val:
        return ""
    if len(val) <= 4:
        return "•" * len(val)
    return "•" * (len(val) - 4) + val[-4:]


@api_router.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(require_admin)):
    """Full settings doc (admin-only). Secrets are masked but a `*_set` flag tells admin
    whether each secret has a value, so they can choose to overwrite or leave it."""
    doc = await _load_settings_doc()

    out: Dict[str, Any] = {}
    flags: Dict[str, bool] = {}
    for k in PUBLIC_SETTING_KEYS:
        out[k] = doc.get(k) or os.environ.get(_SETTING_ENV_FALLBACK.get(k, ""), "") or ""
    for k in SECRET_SETTING_KEYS:
        raw = doc.get(k) or os.environ.get(_SETTING_ENV_FALLBACK.get(k, ""), "") or ""
        out[k] = _mask_secret(raw)            # masked value for display
        flags[f"{k}_set"] = bool(raw)

    out.update(flags)
    out["updated_at"] = doc.get("updated_at")
    out["updated_by"] = doc.get("updated_by")
    return out


@api_router.put("/admin/settings")
async def admin_update_settings(request: Request, payload: AdminSettingsUpdate, admin: dict = Depends(require_admin)):
    """Upsert global app settings. Only fields explicitly sent are updated.

    For secret fields, an empty string ("") = "leave unchanged". Use a sentinel
    "__CLEAR__" to actually wipe a secret. This protects against the UI sending
    masked values back accidentally.
    """
    incoming = payload.model_dump(exclude_unset=True)
    cleaned: Dict[str, Any] = {}
    rejected: List[str] = []

    for k, v in incoming.items():
        if isinstance(v, str):
            v = v.strip()

        if k in SECRET_SETTING_KEYS:
            if v == "__CLEAR__":
                cleaned[k] = None                                # explicit wipe
            elif not v:
                continue                                          # ignore empty (don't overwrite)
            elif v.startswith("•"):
                continue                                          # ignore re-submitted mask
            elif "•" in v or "\u2022" in v:
                # Defensive guard: secret contains bullet chars mid-value (likely
                # the frontend appended typing after a mask). Refuse rather than
                # save a corrupted credential.
                rejected.append(k)
                continue
            else:
                cleaned[k] = v
        else:
            cleaned[k] = v or None

    if rejected:
        raise HTTPException(
            status_code=400,
            detail=(
                "Estos secretos llegaron con el carácter de mask (•) dentro del valor. "
                "Limpia el campo en el formulario y escribe el valor completo otra vez: "
                + ", ".join(rejected)
            ),
        )

    cleaned["updated_at"] = datetime.now(timezone.utc).isoformat()
    cleaned["updated_by"] = admin.get("email")

    await db.app_settings.update_one(
        {"_id": "global"},
        {"$set": cleaned},
        upsert=True,
    )
    # Don't leak secret values to the audit log; just record which fields changed.
    safe_change_summary = {}
    for k, v in cleaned.items():
        if k in SECRET_SETTING_KEYS:
            safe_change_summary[k] = "[redacted]" if v else "[cleared]"
        elif k not in ("updated_at", "updated_by"):
            safe_change_summary[k] = v
    await log_admin_action(
        admin=admin,
        action="settings.update",
        target_type="app_settings",
        target_id="global",
        details={"changed_fields": safe_change_summary},
        request=request,
    )
    return await admin_get_settings(admin)


@api_router.get("/public/settings")
async def public_settings():
    """Non-sensitive subset, readable by anyone (frontend boot uses this)."""
    doc = await _load_settings_doc()
    return {k: (doc.get(k) or "") for k in PUBLIC_SETTING_KEYS}


# ============= ADMIN — AUDIT LOG VIEW =============

@api_router.get("/admin/audit-log")
async def admin_get_audit_log(
    admin: dict = Depends(require_admin),
    limit: int = 100,
    skip: int = 0,
    action: Optional[str] = None,
    target_email: Optional[str] = None,
    admin_email: Optional[str] = None,
):
    """Paginated, filterable view of every recorded admin action."""
    limit = max(1, min(int(limit), 500))
    skip = max(0, int(skip))
    q: Dict[str, Any] = {}
    if action:
        q["action"] = action
    if target_email:
        q["target_email"] = target_email.lower()
    if admin_email:
        q["admin_email"] = admin_email.lower()

    total = await db.admin_audit_log.count_documents(q)
    cursor = (
        db.admin_audit_log.find(q, {"_id": 0})
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    # Normalize datetime → ISO so the frontend can display it.
    for r in rows:
        ts = r.get("timestamp")
        if isinstance(ts, datetime):
            r["timestamp"] = ts.isoformat()
    return {"total": total, "limit": limit, "skip": skip, "rows": rows}


# ── IMPERSONATE ──────────────────────────────────────────────────────────────
@api_router.post("/admin/impersonate/{user_id}")
async def admin_impersonate(request: Request, user_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": target["id"],
        "jti": secrets.token_hex(16),
        "iat": now,
        "exp": now + timedelta(hours=1),
        "impersonated_by": admin["email"],
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    await log_admin_action(request, admin, "user.impersonate", target, {"impersonated_by": admin["email"]})
    return {"token": token, "user": {k: v for k, v in target.items() if k != "password_hash"}}


# ── REVENUE ANALYTICS ────────────────────────────────────────────────────────
@api_router.get("/admin/revenue")
async def admin_revenue(admin: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)

    # MRR history — last 6 months from payment_transactions
    mrr_history = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        total = 0.0
        async for tx in db.payment_transactions.find({
            "status": "paid",
            "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()},
        }, {"amount": 1}):
            total += float(tx.get("amount") or 0)
        mes_label = month_start.strftime("%b")
        mrr_history.append({"mes": mes_label, "mrr": round(total, 2)})

    # Total paid users per plan → LTV approximation
    ltv: Dict[str, float] = {}
    for plan_id, plan in SUBSCRIPTION_PLANS.items():
        count = await db.payment_transactions.count_documents({"plan_id": plan_id, "status": "paid"})
        ltv[plan_id] = round(plan["price"] * max(count, 1) / max(count, 1), 2)  # price × 1 = one payment avg

    # Churn: users who had premium and no longer do (cancelled last 30 days)
    churn_count = await db.users.count_documents({
        "subscription_status": {"$in": ["canceled", "past_due", "unpaid"]},
        "subscription_canceled_at": {"$gte": (now - timedelta(days=30)).isoformat()},
    })
    premium_30d_ago = await db.users.count_documents({"is_premium": True}) + churn_count
    churn_rate = round((churn_count / max(premium_30d_ago, 1)) * 100, 1)

    # Conversion: new users last 30 days who became premium
    new_30d = await db.users.count_documents({
        "created_at": {"$gte": (now - timedelta(days=30)).isoformat()}
    })
    new_premium_30d = await db.users.count_documents({
        "created_at": {"$gte": (now - timedelta(days=30)).isoformat()},
        "is_premium": True,
    })
    conversion_rate = round((new_premium_30d / max(new_30d, 1)) * 100, 1)

    return {
        "mrr_history": mrr_history,
        "churn_rate": churn_rate,
        "conversion_rate": conversion_rate,
        "ltv": ltv,
    }


# ── USAGE ANALYTICS ──────────────────────────────────────────────────────────
@api_router.get("/admin/usage")
async def admin_usage(admin: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)

    # Calculator usage from calculations collection
    pipeline = [
        {"$group": {"_id": "$calculator_type", "usos": {"$sum": 1}}},
        {"$sort": {"usos": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "name": "$_id", "usos": 1}},
    ]
    calc_usage = await db.calculations.aggregate(pipeline).to_list(10)

    # Active users: distinct user_ids in calculations in last day/week/month
    dau = await db.calculations.distinct("user_id", {
        "created_at": {"$gte": (now - timedelta(days=1)).isoformat()}
    })
    wau = await db.calculations.distinct("user_id", {
        "created_at": {"$gte": (now - timedelta(days=7)).isoformat()}
    })
    mau = await db.calculations.distinct("user_id", {
        "created_at": {"$gte": (now - timedelta(days=30)).isoformat()}
    })

    return {
        "calc_usage": calc_usage,
        "active_users": {"day": len(dau), "week": len(wau), "month": len(mau)},
    }


# ── COUPONS ──────────────────────────────────────────────────────────────────
@api_router.get("/admin/coupons")
async def admin_list_coupons(admin: dict = Depends(require_admin)):
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return coupons


@api_router.post("/admin/coupons")
async def admin_create_coupon(request: Request, payload: dict = Body(...), admin: dict = Depends(require_admin)):
    code = (payload.get("id") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Código requerido")
    existing = await db.coupons.find_one({"id": code})
    if existing:
        raise HTTPException(status_code=409, detail="Código ya existe")
    coupon = {
        "id": code,
        "discount": float(payload.get("discount", 0)),
        "type": payload.get("type", "percent"),
        "uses": 0,
        "max_uses": int(payload["max_uses"]) if payload.get("max_uses") else None,
        "expires": payload.get("expires") or None,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["email"],
    }
    await db.coupons.insert_one(coupon)
    return {k: v for k, v in coupon.items() if k != "_id"}


@api_router.post("/admin/coupons/{coupon_id}/toggle")
async def admin_toggle_coupon(coupon_id: str, admin: dict = Depends(require_admin)):
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupón no encontrado")
    new_state = not coupon.get("active", True)
    await db.coupons.update_one({"id": coupon_id}, {"$set": {"active": new_state}})
    return {"id": coupon_id, "active": new_state}


# ── FEATURE FLAGS ─────────────────────────────────────────────────────────────
_DEFAULT_FLAGS = [
    {"id": "ai_coach",      "label": "AI Coach",           "desc": "Análisis de operaciones con IA",   "plans": "Annual / Lifetime", "enabled": True},
    {"id": "backtest",      "label": "Backtest histórico", "desc": "Datos reales yfinance",            "plans": "Premium+",          "enabled": True},
    {"id": "ws_alerts",     "label": "Alertas tiempo real","desc": "WebSocket push notifications",     "plans": "All Premium",       "enabled": True},
    {"id": "excel_export",  "label": "Export Excel",       "desc": "Performance en Excel",             "plans": "All",               "enabled": False},
    {"id": "referrals",     "label": "Sistema Referidos",  "desc": "Wallet + leaderboard",             "plans": "All",               "enabled": True},
    {"id": "options_suite", "label": "Suite Opciones",     "desc": "Black-Scholes, Kelly, Greeks",     "plans": "Premium+",          "enabled": True},
]

@api_router.get("/admin/feature-flags")
async def admin_list_flags(admin: dict = Depends(require_admin)):
    flags = []
    for default in _DEFAULT_FLAGS:
        stored = await db.feature_flags.find_one({"id": default["id"]}, {"_id": 0})
        flags.append(stored if stored else default)
    return flags


@api_router.patch("/admin/feature-flags/{flag_id}")
async def admin_update_flag(flag_id: str, payload: dict = Body(...), admin: dict = Depends(require_admin)):
    enabled = bool(payload.get("enabled", False))
    default = next((f for f in _DEFAULT_FLAGS if f["id"] == flag_id), None)
    if not default:
        raise HTTPException(status_code=404, detail="Flag no encontrado")
    await db.feature_flags.update_one(
        {"id": flag_id},
        {"$set": {**default, "enabled": enabled, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"id": flag_id, "enabled": enabled}


# ── STRIPE WEBHOOK LOGS ───────────────────────────────────────────────────────
@api_router.get("/admin/webhooks")
async def admin_webhook_logs(limit: int = 20, admin: dict = Depends(require_admin)):
    logs = await db.stripe_webhook_logs.find({}, {"_id": 0}).sort("created", -1).limit(limit).to_list(limit)
    return logs


@api_router.post("/admin/webhooks/{event_id}/retry")
async def admin_retry_webhook(event_id: str, admin: dict = Depends(require_admin)):
    log = await db.stripe_webhook_logs.find_one({"id": event_id})
    if not log:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    # Mark as retry-requested; actual retry requires Stripe Dashboard or separate job
    await db.stripe_webhook_logs.update_one(
        {"id": event_id},
        {"$set": {"retry_requested_at": datetime.now(timezone.utc).isoformat(), "retry_by": admin["email"]}}
    )
    return {"status": "retry_queued", "id": event_id}


# Include router and setup middleware
# ─────────────────────────────────────────────────────────────────────
# Register extended API modules at module level so all routes are
# included into the main app via `app.include_router(api_router)`.
# Indexes & WebSocket poller are bootstrapped in @app.on_event("startup").
# ─────────────────────────────────────────────────────────────────────
try:
    from missing_apis import register as register_missing_apis
    from referrals import register as register_referrals
    from realtime_alerts import register as register_realtime_alerts

    register_missing_apis(api_router, db, {
        "require_user": require_user,
        "check_premium": check_premium,
        "SUBSCRIPTION_PLANS": SUBSCRIPTION_PLANS,
        "hash_password": hash_password,
        "SENDGRID_API_KEY": SENDGRID_API_KEY,
        "SENDER_EMAIL": SENDER_EMAIL,
        "STRIPE_API_KEY": STRIPE_API_KEY,
        "get_setting": get_setting,
    })
    register_referrals(api_router, db, {
        "require_user": require_user,
        "require_admin": require_admin,
    })
    register_realtime_alerts(api_router, db, {
        "decode_token": decode_token,
    })
    logging.info("✅ Extended modules registered into api_router (module-level)")
except Exception as _e:
    logging.error(f"Module-level extended modules registration error: {_e}", exc_info=True)

try:
    from admin_routes import build_admin_router
    api_router.include_router(
        build_admin_router(
            db=db,
            require_admin_dep=require_admin,
            subscription_plans=SUBSCRIPTION_PLANS,
            log_admin_action_fn=log_admin_action,
        ),
        prefix="/admin",
    )
    logging.info("✅ admin_routes feature endpoints registered (maintenance, campaigns, churn, cohorts, referrals/leaderboard, plans, i18n, errors, rate-limits, gdpr-exports)")
except Exception as _e:
    logging.error(f"admin_routes registration error: {_e}", exc_info=True)

app.include_router(api_router)

_cors_origins_raw = os.environ.get('CORS_ORIGINS', 'https://tradingcalculator.pro')
if _cors_origins_raw == '*':
    logging.warning(
        "[SECURITY] CORS_ORIGINS is wildcard (*) — set CORS_ORIGINS=https://yourdomain.com in production."
    )
_cors_origins = _cors_origins_raw.split(',')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

_FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://tradingcalculator.pro')

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "script-src 'self'; "
            "connect-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            f"frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        # Only set HSTS on HTTPS (avoids breaking local dev)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        from realtime_alerts import stop_poller
        stop_poller()
    except Exception:
        pass
    await db.close()
