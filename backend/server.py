from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import asyncpg
import asyncio
import json as _json_module
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import Any, Dict, List, Optional, Tuple
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import secrets
import hashlib
import time
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
    implied_volatility,
    year_fraction,
    option_price,
)
from stock_data import (
    COINGECKO_SYMBOL_TO_ID,
    get_stock_data,
    search_tickers,
    generate_expirations,
    get_options_chain_real,
    get_available_expirations,
    get_cached_meta,
    get_ohlc_history,
)
from candle_patterns import detect_all_patterns, PATTERN_META, get_pattern_catalog
from price_action import detect_structure
import timeframes
from performance import (
    compute_trade_pnl,
    detect_errors,
    compute_analytics,
    generate_insights,
    trades_for_user,
    make_trade_doc,
    sort_trades_chronologically,
)
from trading_plan import (
    activate_plan,
    compliance_report,
    count_trades_under_version,
    get_active_plan,
    get_draft_plan,
    list_plan_versions,
    save_draft,
)
from market_rates import get_risk_free_rate, get_risk_free_info

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


def _literal_regex(text: str) -> str:
    """Convierte texto de un buscador en un patrón que lo busca TAL CUAL.

    Lo que teclea alguien en una caja de búsqueda es texto, no una expresión
    regular. Al pasarlo crudo a los operadores `~`/`~*` de PostgreSQL, buscar
    ``"Rodríguez (padre)"`` —o un simple ``(``— aborta la consulta entera con
    *invalid regular expression: parentheses () not balanced* y la petición
    acaba en 500. Escapando los metacaracteres, el paréntesis vuelve a ser un
    paréntesis y la búsqueda hace lo que el usuario espera: subcadena literal.
    """
    return _re_module.escape(text or "")


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
            if not _SAFE_FIELD_RE.match(self._sort_field):
                raise ValueError(f"Invalid sort field name: {self._sort_field!r}")
            dir_str = "DESC" if self._sort_dir == -1 else "ASC"
            # ISO date strings sort correctly as text
            order = f"ORDER BY (data->>'{self._sort_field}') {dir_str} NULLS LAST"

        limit_clause = f"LIMIT {int(self._limit_val)}" if self._limit_val is not None else ""
        offset_clause = f"OFFSET {int(self._skip_val)}" if self._skip_val else ""

        sql = f"SELECT data FROM {self._table} {where} {order} {limit_clause} {offset_clause}".strip()
        return sql, params

    @staticmethod
    def _apply_projection(docs: list, projection) -> list:
        if not projection:
            return docs
        exclusions = {k for k, v in projection.items() if v == 0}
        inclusions = {k for k, v in projection.items() if v == 1 and k != "_id"}
        if inclusions:
            # Inclusion projection: keep only specified keys, then remove any exclusions
            return [{k: d[k] for k in inclusions if k in d and k not in exclusions} for d in docs]
        if exclusions:
            return [{k: v for k, v in d.items() if k not in exclusions} for d in docs]
        return docs

    async def to_list(self, length=None):
        sql, params = self._build_query()
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
        result = [_deserialize(r["data"]) for r in rows]
        result = self._apply_projection(result, self._projection)
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

    if "$unset" in update_dict:
        for k in update_dict["$unset"]:
            result.pop(k, None)

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

    def _require_pool(self):
        """Raise a proper HTTP 503 (not AttributeError) when the DB pool is not ready.
        HTTPException is caught by FastAPI's ExceptionMiddleware which sits *inside*
        CORSMiddleware, so the 503 response still carries CORS headers.  An unhandled
        AttributeError would be caught by the outermost ServerErrorMiddleware and would
        return a plain 500 with no CORS headers — causing a spurious "CORS error" in
        the browser even though the real problem is the database connection."""
        if self._pool is None:
            raise HTTPException(
                status_code=503,
                detail="El servidor está iniciando, intenta de nuevo en unos segundos.",
            )

    # --- Motor-compatible methods ---

    async def find_one(self, filter_dict: dict, projection=None):
        """SELECT … WHERE <clause> LIMIT 1.  Supports complex MongoDB filter operators."""
        self._require_pool()
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
        doc = _deserialize(row["data"])
        if projection:
            [doc] = _Cursor._apply_projection([doc], projection)
        return doc

    def find(self, filter_dict: dict = None, projection=None):
        """Return a lazy _Cursor (supports .sort/.limit/.skip/.to_list/async for)."""
        self._require_pool()
        return _Cursor(self._pool, self._name, filter_dict or {}, projection)

    async def insert_one(self, document: dict):
        """INSERT into the table. Ignores _id field."""
        self._require_pool()
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
        self._require_pool()
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

    async def find_one_and_update(self, filter_dict: dict, update_dict: dict,
                                  *, upsert: bool = False, return_document: bool = True):
        """Atomically find one matching row, apply the update operators and return
        the document — Mongo's find_one_and_update. Uses SELECT ... FOR UPDATE inside
        a transaction so concurrent callers can't both claim the same row (needed by
        the PayPal capture's pending→capturing claim). Returns the updated doc
        (return_document=True) or the pre-update doc (False); None if no match and
        not upsert.
        """
        self._require_pool()
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                if filter_dict:
                    where, params, _ = _build_where_clause(filter_dict)
                    if where:
                        row = await conn.fetchrow(
                            f"SELECT _key, data FROM {self._name} WHERE {where} LIMIT 1 FOR UPDATE",
                            *params,
                        )
                    else:
                        row = await conn.fetchrow(
                            f"SELECT _key, data FROM {self._name} LIMIT 1 FOR UPDATE")
                else:
                    row = await conn.fetchrow(
                        f"SELECT _key, data FROM {self._name} LIMIT 1 FOR UPDATE")

                if row:
                    existing = _deserialize(row["data"])
                    merged = _apply_update_operators(existing, update_dict)
                    await conn.execute(
                        f"UPDATE {self._name} SET data = $1::jsonb WHERE _key = $2",
                        _serialize(merged), row["_key"],
                    )
                    return merged if return_document else existing

                if upsert:
                    new_doc = {k: v for k, v in filter_dict.items() if not k.startswith("$")}
                    new_doc = _apply_update_operators(new_doc, update_dict)
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
                    return new_doc

                return None

    async def delete_one(self, filter_dict: dict):
        """DELETE one matching row."""
        self._require_pool()
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
        self._require_pool()
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
        self._require_pool()
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

    def aggregate(self, pipeline: list):
        """
        Minimal aggregate support for the patterns actually used in this codebase:
        - $group by a field with $sum: 1 → returns distinct values with counts
        - $sort, $limit, $project

        NOTE: intentionally a *sync* method that returns an async-iterable cursor,
        mirroring Motor/PyMongo semantics. Callers use it as
        `async for r in db.x.aggregate(...)` or `await db.x.aggregate(...).to_list()`.
        Declaring it `async def` would return a coroutine and break both call styles.
        """
        return _AggCursor(self._pool, self._name, pipeline)

    async def distinct(self, field: str, filter_dict: dict = None):
        """Return distinct values of a JSONB field, optionally filtered."""
        self._require_pool()
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
        """Execute the pipeline. GROUP+COUNT pipelines are pushed to SQL to avoid OOM."""
        match_filter = {}
        group_id_field = None
        group_stage = None
        sum_field = None
        sort_spec = None
        limit_n = None
        project_spec = None

        for stage in self._pipeline:
            if "$match" in stage:
                match_filter = stage["$match"]
            elif "$group" in stage:
                group_stage = stage["$group"]
                group_id_field = group_stage.get("_id")
                for k, v in group_stage.items():
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

        # The SQL push-down below emits COUNT(*), so it is ONLY correct for the
        # simple "group by $field, one {$sum: 1}" count case (admin usage/metrics).
        # Anything else — _id: None, several accumulators, $first, or $sum of a
        # field — must be grouped in Python (handled in the fallback) or columns
        # would be dropped / computed as a wrong COUNT.
        _accs = [(k, v) for k, v in group_stage.items() if k != "_id"] if group_stage else []
        is_simple_count = (
            isinstance(group_id_field, str) and group_id_field.startswith("$")
            and len(_accs) == 1
            and _accs[0][1] == {"$sum": 1}
        )

        # Push GROUP BY + ORDER BY + LIMIT to SQL for the simple count-by-$field case
        if is_simple_count:
            field_name = group_id_field[1:]
            if not _SAFE_FIELD_RE.match(field_name):
                raise ValueError(f"Unsafe group field: {field_name!r}")
            count_col = sum_field or "count"
            if not _SAFE_FIELD_RE.match(count_col):
                raise ValueError(f"Unsafe accumulator name: {count_col!r}")

            where_clause, params, _ = _build_where_clause(match_filter) if match_filter else ("", [], 0)
            where_sql = f"WHERE {where_clause}" if where_clause else ""

            order_parts = []
            if sort_spec:
                for sf, sd in sort_spec.items():
                    if sf not in ("_id", count_col) and not _SAFE_FIELD_RE.match(sf):
                        raise ValueError(f"Unsafe sort field: {sf!r}")
                    col = f"data->>'{sf}'" if sf not in ("_id", count_col) else (
                        f"data->>'{field_name}'" if sf == "_id" else count_col
                    )
                    order_parts.append(f"{col} {'DESC' if sd == -1 else 'ASC'}")
            order_sql = f"ORDER BY {', '.join(order_parts)}" if order_parts else ""
            limit_sql = f"LIMIT {int(limit_n)}" if limit_n is not None else ""

            sql = (
                f"SELECT data->>'{field_name}' AS _id, COUNT(*) AS {count_col} "
                f"FROM {self._table} {where_sql} "
                f"GROUP BY data->>'{field_name}' {order_sql} {limit_sql}"
            )
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(sql, *params)
            result_docs = [{
                "_id": r["_id"],
                count_col: int(r[count_col]),
            } for r in rows]

            # $project on the small aggregated result
            if project_spec:
                result_docs = self._apply_project(result_docs, project_spec)
            return result_docs

        # Fallback: fetch docs (with optional WHERE), then process in Python
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

        # $group in Python — the SQL push-down above only covers the simple count.
        # Supports _id: None | constant | "$field", and $sum / $first / $max / $min
        # accumulators (operand may be a constant or a "$field" reference).
        if group_stage is not None:
            id_spec = group_stage.get("_id")

            def _grp_key(d):
                if isinstance(id_spec, str) and id_spec.startswith("$"):
                    return d.get(id_spec[1:])
                return id_spec  # None or a constant

            def _operand(av, key, d):
                val = av[key]
                return d.get(val[1:]) if isinstance(val, str) and val.startswith("$") else val

            groups: dict = {}
            order: list = []
            for d in docs:
                gk = _grp_key(d)
                hk = gk if isinstance(gk, (str, int, float, bool, type(None))) else str(gk)
                if hk not in groups:
                    groups[hk] = {"_id": gk}
                    order.append(hk)
                    for ak, av in _accs:
                        groups[hk][ak] = 0 if isinstance(av, dict) and "$sum" in av else None
                for ak, av in _accs:
                    if not isinstance(av, dict):
                        continue
                    if "$sum" in av:
                        operand = av["$sum"]
                        if isinstance(operand, str) and operand.startswith("$"):
                            groups[hk][ak] += float(d.get(operand[1:]) or 0)
                        else:
                            groups[hk][ak] += operand or 0
                    elif "$first" in av:
                        if groups[hk][ak] is None:
                            groups[hk][ak] = _operand(av, "$first", d)
                    elif "$max" in av:
                        v = _operand(av, "$max", d)
                        if v is not None and (groups[hk][ak] is None or v > groups[hk][ak]):
                            groups[hk][ak] = v
                    elif "$min" in av:
                        v = _operand(av, "$min", d)
                        if v is not None and (groups[hk][ak] is None or v < groups[hk][ak]):
                            groups[hk][ak] = v
            result_docs = [groups[k] for k in order]
        else:
            result_docs = docs

        # Sort (default-arg capture avoids late-binding closure bug)
        if sort_spec:
            for sort_field, sort_dir in reversed(list(sort_spec.items())):
                if sort_field == "_id":
                    result_docs.sort(key=lambda d, _sf="_id": (d.get(_sf) or ""), reverse=(sort_dir == -1))
                else:
                    result_docs.sort(key=lambda d, _sf=sort_field: (d.get(_sf) or 0), reverse=(sort_dir == -1))

        # Limit
        if limit_n is not None:
            result_docs = result_docs[:limit_n]

        if project_spec:
            result_docs = self._apply_project(result_docs, project_spec)

        return result_docs

    @staticmethod
    def _apply_project(docs: list, project_spec: dict) -> list:
        """Apply a $project stage (renames, includes, excludes) to a list of dicts."""
        new_docs = []
        for doc in docs:
            new_doc: dict = {}
            has_inclusion = any(
                v == 1 or (isinstance(v, str) and v.startswith("$"))
                for v in project_spec.values()
            )
            if has_inclusion:
                for k, v in project_spec.items():
                    if isinstance(v, str) and v.startswith("$"):
                        new_doc[k] = doc.get(v[1:])
                    elif v == 1 and k in doc:
                        new_doc[k] = doc[k]
            else:
                # pure exclusion
                exclude = {k for k, v in project_spec.items() if v == 0}
                new_doc = {k: v for k, v in doc.items() if k not in exclude}
            new_docs.append(new_doc)
        return new_docs

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

        # Bound every connection attempt so a slow/unreachable DB can never hang the
        # whole startup. If asyncpg blocked indefinitely, uvicorn would never finish
        # "application startup", Cloud Run's startup probe would fail, the new revision
        # would be rejected, and the previous (buggy) revision would keep serving — i.e.
        # deploys would silently never go live. timeout=10 makes create_pool give up fast,
        # and command_timeout caps individual queries.
        if is_unix_socket and host_param:
            # Cloud SQL via Unix socket — SSL not applicable on socket connections
            self._pool = await asyncpg.create_pool(
                f"{clean_url}?host={host_param}",
                min_size=5, max_size=20, timeout=10, command_timeout=30,
            )
        else:
            import ssl as _ssl
            ssl_ctx = _ssl.create_default_context()
            self._pool = await asyncpg.create_pool(
                clean_url, ssl=ssl_ctx, min_size=5, max_size=20,
                timeout=10, command_timeout=30,
            )

    async def create_all_tables(self):
        """Create tables for all well-known collections upfront."""
        known = [
            "users", "trades", "calculations", "alerts", "portfolio",
            "password_resets", "revoked_tokens", "user_revocations",
            "user_states", "stock_cache", "payment_transactions",
            "stripe_webhook_logs", "admin_audit_log", "app_settings",
            "webhook_health",  # last webhook seen per provider (M-41)
            "saved_positions", "coupons", "feature_flags",
            # Extended modules
            "referrals", "referral_redemptions",
            "affiliates", "affiliate_payout_runs", "affiliate_payout_lines",
            "affiliate_payout_requests",
            "password_reset_tokens", "email_verification_tokens",
            # Admin panel features (queried/written in admin_routes.py — must
            # exist upfront, since Collection methods don't auto-create tables)
            "email_campaigns", "gdpr_exports", "error_logs",
            "churn_surveys", "rate_limit_violations",
            # Product usage analytics (admin heatmap of most-viewed pages/sections)
            "usage_events",
            # Versioned trading plans — the source of truth for each user's own
            # risk thresholds (see trading_plan.py). Must be listed here: the
            # comment above is load-bearing, Collection does not auto-create.
            "trading_plans",
        ]
        for name in known:
            coll = self.__getattr__(name)
            await coll._ensure_table()

        # Expression indexes on frequently-queried fields (idempotent)
        async with self._pool.acquire() as conn:
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users ((data->>'email'))")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_id ON users ((data->>'id'))")
            for tbl in ("trades", "calculations", "alerts", "saved_positions",
                        "trading_plans"):
                await conn.execute(
                    f"CREATE INDEX IF NOT EXISTS idx_{tbl}_user_id ON {tbl} ((data->>'user_id'))"
                )
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens ((data->>'jti'))"
            )
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions ((data->>'user_id'))"
            )
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_usage_events_ts ON usage_events ((data->>'ts'))"
            )

    async def close(self):
        if self._pool:
            await self._pool.close()


# Global db object (pool is None until startup_event runs)
db = Database()

_DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Captures why the DB failed to connect at startup (surfaced via /api/health for
# remote diagnosis without leaking credentials). None == no error recorded yet.
_db_init_error: Optional[str] = None


def _db_url_shape() -> str:
    """Describe the DATABASE_URL format WITHOUT leaking credentials, for diagnostics."""
    if not _DATABASE_URL:
        return "unset"
    try:
        scheme = _DATABASE_URL.split("://", 1)[0]
        is_socket = "?host=/" in _DATABASE_URL
        has_cloudsql = "/cloudsql/" in _DATABASE_URL
        has_at = "@" in _DATABASE_URL
        # netloc host part between @ and the path/query, masked
        host_hint = "socket" if is_socket else "tcp"
        return f"{scheme}|{host_hint}|cloudsql={has_cloudsql}|creds={has_at}"
    except Exception:
        return "unparseable"


def _cloudsql_diag() -> dict:
    """Inspect the /cloudsql mount to tell a name mismatch apart from a missing socket.
    The instance connection name (project:region:instance) is not a credential, so it's
    safe to surface for diagnosis. Compares the path DATABASE_URL expects against what
    Cloud Run actually mounted."""
    import os as _os
    info: dict = {}
    # What host path does DATABASE_URL ask asyncpg to use?
    expected = None
    if "?host=" in _DATABASE_URL:
        expected = _DATABASE_URL.split("?host=", 1)[1].split("&", 1)[0]
        info["expected_host"] = expected
        info["expected_socket_exists"] = _os.path.exists(
            _os.path.join(expected, ".s.PGSQL.5432")
        )
    # What did Cloud Run actually mount under /cloudsql ?
    try:
        info["cloudsql_dir"] = sorted(_os.listdir("/cloudsql"))[:10]
    except FileNotFoundError:
        info["cloudsql_dir"] = "/cloudsql does not exist (Cloud SQL connection not mounted)"
    except Exception as e:
        info["cloudsql_dir"] = f"error listing: {type(e).__name__}"
    return info

# JWT Configuration
# 🔒 SECURITY: JWT_SECRET must be set via environment variable
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    _is_dev = os.environ.get('ENVIRONMENT', 'production').lower() in ('development', 'dev', 'local')
    if _is_dev:
        import secrets as sec
        JWT_SECRET = sec.token_urlsafe(32)
        print("⚠️  WARNING: Using auto-generated JWT_SECRET in dev mode. Set JWT_SECRET for production!")
    else:
        raise RuntimeError(
            "JWT_SECRET environment variable is required in production. "
            "Set it to a strong random secret (e.g. openssl rand -hex 32)."
        )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 1        # Access token: 1 hour
JWT_REFRESH_EXPIRATION_DAYS = 7 # Refresh token: 7 days

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
if not STRIPE_API_KEY:
    logging.warning("⚠️  STRIPE_API_KEY not set — payment endpoints will fail")
stripe.api_key = STRIPE_API_KEY

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'alerts@tradingcalculatorpro.com')

# Demo User (siempre tiene acceso PRO completo)
DEMO_EMAIL = os.environ.get('DEMO_EMAIL', "demo@btccalc.pro")
_demo_pw = os.environ.get('DEMO_PASSWORD')
if not _demo_pw:
    if os.environ.get('ENVIRONMENT', 'production').lower() in ('development', 'dev', 'local'):
        _demo_pw = "12345678"  # convenience default for local dev only
    else:
        # Production without an explicit DEMO_PASSWORD: seed the demo account with an
        # unguessable random password so it can't be logged into the backend with a
        # known credential. The frontend demo experience bypasses the backend entirely
        # (lib/store.js), so this does not affect it.
        import secrets as _sec_demo
        _demo_pw = _sec_demo.token_urlsafe(24)
DEMO_PASSWORD = _demo_pw

# Comma-separated list of emails that are always treated as admin regardless of DB value.
# Set ADMIN_EMAILS env var in Cloud Run — no database change needed.
_ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}

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
#  CORS — must be registered first so every response gets headers
# ============================================================
_CORS_ORIGINS = [
    "https://tradingcalculatorpro.com",
    "https://www.tradingcalculatorpro.com",
]
# Localhost only in non-production (dev) — add via CORS_ORIGINS env var in staging
if os.environ.get("ENVIRONMENT", "production") != "production":
    _CORS_ORIGINS += ["http://localhost:3000", "http://localhost:5173"]
_extra = os.environ.get("CORS_ORIGINS", "")
for _o in _extra.split(","):
    _o = _o.strip()
    if _o and _o not in _CORS_ORIGINS:
        _CORS_ORIGINS.append(_o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# ============================================================
#  URL origin validation helper (prevents open redirect attacks)
# ============================================================
_ALLOWED_ORIGINS_SET: set = set()

def _get_allowed_origins() -> set:
    """Lazy-build the set from _CORS_ORIGINS so it picks up runtime additions."""
    if not _ALLOWED_ORIGINS_SET:
        _ALLOWED_ORIGINS_SET.update(_CORS_ORIGINS)
    return _ALLOWED_ORIGINS_SET

def _validate_origin_url(url: str, field: str = "origin_url") -> str:
    """Raise HTTP 400 if the URL's origin is not in the CORS allowlist."""
    if not url:
        raise HTTPException(status_code=400, detail=f"{field} is required")
    from urllib.parse import urlparse
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in _get_allowed_origins():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field}: '{origin}' is not an allowed origin",
        )
    return url

# ============================================================
#  Rate limiting (slowapi) — applied to brute-force-prone routes
# ============================================================

# How many proxies we sit behind. Cloud Run (direct) = 1: its front end appends
# the real peer as the LAST entry of X-Forwarded-For. Put an HTTPS load balancer
# in front and it becomes 2. Counting from the RIGHT is what makes this
# unspoofable: a client can prepend fake IPs, it cannot append past the proxy.
TRUSTED_PROXY_HOPS = max(1, int(os.environ.get("TRUSTED_PROXY_HOPS", "1")))

# Admins must carry a second factor. Only a non-production environment may opt
# out (so a fresh local DB isn't locked out of its own panel); in production the
# env var is ignored on purpose — it must not be possible to disable this by
# setting a variable on the service.
ADMIN_2FA_OPTIONAL = (
    os.environ.get("ENVIRONMENT", "production").lower() in ("development", "dev", "local")
    and os.environ.get("ADMIN_2FA_OPTIONAL", "true").lower() != "false"
)


def _real_client_ip(request: Optional[Request]) -> str:
    """Client IP as seen by our outermost trusted proxy.

    uvicorn runs without --forwarded-allow-ips, so `request.client.host` is the
    Cloud Run front end for EVERY request — using it as a rate-limit key puts the
    whole planet in one bucket (register was 3/hour globally). Read the header
    ourselves instead.
    """
    if request is None:
        return ""
    fwd = request.headers.get("x-forwarded-for") or ""
    parts = [p.strip() for p in fwd.split(",") if p.strip()]
    if parts:
        idx = len(parts) - TRUSTED_PROXY_HOPS
        return parts[idx] if 0 <= idx < len(parts) else parts[0]
    return request.client.host if request.client else ""


def _rate_limit_key(request: Request) -> str:
    return _real_client_ip(request) or get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key, default_limits=[])
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": f"Demasiados intentos, espera un momento. Límite: {exc.detail}"},
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all: log full traceback internally, return generic 500 to caller.
    Prevents stack traces / file paths leaking to external clients in production."""
    from fastapi.responses import JSONResponse
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logging.exception(f"[500] Unhandled exception on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Inténtalo de nuevo o contacta soporte."},
    )


app.add_middleware(SlowAPIMiddleware)

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
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
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

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


async def _yf_history_async(symbol: str, **history_kwargs):
    """Fetch yfinance price history WITHOUT blocking the event loop.

    yfinance uses synchronous HTTP, so calling Ticker(...).history() directly
    inside an async endpoint stalls every other request handled by the same
    worker (Cloud Run runs up to `concurrency` requests on one event loop).
    Offload it to a thread, mirroring hash_password_async / verify_password_async.
    """
    import asyncio as _asyncio
    import yfinance as yf
    loop = _asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: yf.Ticker(symbol).history(**history_kwargs))


def _hash_token(token: str) -> str:
    """SHA-256 hash a one-time token before storing it in the DB."""
    return hashlib.sha256(token.encode()).hexdigest()


# ============================================================
#  JWT (with revocable tokens via `jti` blacklist)
# ============================================================
def create_token(user_id: str, email: str) -> str:
    """Issue a short-lived access JWT (1 h) with a unique jti."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "email": email,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, email: str) -> str:
    """Issue a long-lived refresh JWT (7 days). Must never be used as an access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "email": email,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS),
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
            "expires_at": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS + 1),
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


def _extract_token_from_request(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Cookie first (httpOnly, XSS-safe), Authorization header as fallback."""
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    if credentials and credentials.credentials:
        return credentials.credentials
    return None


# Cookie settings for httpOnly token (cross-origin SPA on GitHub Pages + Cloud Run)
_COOKIE_KWARGS: dict = {
    "key": "access_token",
    "httponly": True,
    "secure": True,           # HTTPS only
    "samesite": "none",       # required for cross-origin (github.io → cloud run)
    "path": "/api",
    "max_age": JWT_EXPIRATION_HOURS * 3600,
}


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(**_COOKIE_KWARGS, value=access_token)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/api/auth/refresh",   # only sent to the refresh endpoint
        max_age=JWT_REFRESH_EXPIRATION_DAYS * 86400,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/api", samesite="none", secure=True)
    response.delete_cookie("refresh_token", path="/api/auth/refresh", samesite="none", secure=True)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    token = _extract_token_from_request(request, credentials)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if await _is_token_revoked(payload) or await _is_user_session_revoked(payload):
            return None
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None


async def require_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    token = _extract_token_from_request(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token de acceso requerido")
    if await _is_token_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión revocada (logout)")
    if await _is_user_session_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión expirada por cambio de contraseña")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


async def require_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Gate-keeper for admin-only endpoints. Returns the admin user."""
    token = _extract_token_from_request(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token de acceso requerido")
    if await _is_token_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión revocada (logout)")
    if await _is_user_session_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión expirada por cambio de contraseña")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    # Honor ADMIN_EMAILS as well as the DB flag, so enforcement matches what
    # /auth/login and /auth/me already report. Without this, an ADMIN_EMAILS
    # admin sees the panel (frontend trusts the is_admin in the login response)
    # but every /admin/* call returns 403 → empty panel.
    if not (user.get("is_admin") or user.get("email", "").lower() in _ADMIN_EMAILS):
        raise HTTPException(status_code=403, detail="Acceso restringido")

    # Second factor is MANDATORY for admins. An admin session can impersonate
    # users, move subscriptions and read the whole customer base, so a stolen
    # password must not be enough. Per-user TOTP already existed but nothing
    # required it here.
    #
    # 428 (not 403) so the frontend can tell "you may not" apart from "you must
    # finish setting this up" and send the admin to Settings instead of a dead
    # end. Escape hatch for local development only.
    if not user.get("totp_enabled") and not ADMIN_2FA_OPTIONAL:
        raise HTTPException(
            status_code=428,
            detail="Los administradores deben activar la verificación en dos pasos "
                   "(Ajustes → Seguridad) antes de usar el panel.",
        )
    return user


# ============================================================
#  ADMIN AUDIT LOG  (every admin write goes through here)
# ============================================================
def _client_ip(request: Optional[Request]) -> str:
    # Same trusted-hop logic as the rate limiter: taking parts[0] let anyone
    # forge the IP recorded in the admin audit log by sending their own header.
    return _real_client_ip(request)


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


async def require_premium(user: dict = Depends(require_user)) -> dict:
    """Auth + suscripción activa. Bloquea a todo cliente sin pago vigente
    (403 → el frontend redirige a /pricing). El trial de 7 días SÍ cuenta como
    premium (is_premium=True mientras dura). La cuenta demo también pasa."""
    if not check_premium(user):
        raise HTTPException(status_code=403, detail="Suscripción requerida")
    return user


# ── Retención de datos tras impago ──────────────────────────────────────
# Al dejar de pagar se marca `premium_lapsed_at`; los datos se conservan
# DATA_RETENTION_DAYS (90 por defecto) y luego se purgan en el arranque.
DATA_RETENTION_DAYS = int(os.environ.get("DATA_RETENTION_DAYS", "90"))
# Colecciones con datos personales del usuario (NO se borra la cuenta en sí,
# para que pueda volver a suscribirse; solo sus datos de trading).
_USER_DATA_COLLECTIONS = (
    "trades", "calculations", "alerts", "saved_positions", "portfolio",
    "user_states", "journal_entries",
)


def _lapse_stamp(existing: dict) -> str:
    """Devuelve la marca de lapso: conserva la previa si ya existe (no reinicia
    el reloj de los 3 meses ante eventos repetidos), o `now` si es nueva."""
    prev = (existing or {}).get("premium_lapsed_at")
    return prev if prev else datetime.now(timezone.utc).isoformat()


def _retention_cutoff_iso(now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    return (now - timedelta(days=DATA_RETENTION_DAYS)).isoformat()


async def purge_lapsed_user_data(database, now: Optional[datetime] = None) -> int:
    """Borra los DATOS de trading (no la cuenta) de los usuarios que llevan más
    de DATA_RETENTION_DAYS sin pago. Idempotente (marca `data_purged_at`).

    Candidatos = quienes tienen `premium_lapsed_at` o `subscription_end`
    anteriores al corte. Se excluye lifetime, quien vuelva a ser premium
    (check_premium), y quien ya fue purgado. Devuelve nº de usuarios purgados.
    """
    now = now or datetime.now(timezone.utc)
    cutoff = _retention_cutoff_iso(now)
    seen: Dict[str, dict] = {}
    for field in ("premium_lapsed_at", "subscription_end"):
        try:
            rows = await database.users.find(
                {field: {"$lt": cutoff}},
                {"_id": 0, "id": 1, "email": 1, "is_premium": 1, "subscription_plan": 1,
                 "subscription_end": 1, "premium_lapsed_at": 1, "data_purged_at": 1},
            ).to_list(length=100000)
        except Exception:
            rows = []
        for u in rows:
            seen[u["id"]] = u

    purged = 0
    for u in seen.values():
        if u.get("data_purged_at"):
            continue  # ya purgado
        if u.get("subscription_plan") == "lifetime":
            continue
        if check_premium(u):
            continue  # volvió a pagar / sigue vigente
        for coll in _USER_DATA_COLLECTIONS:
            try:
                await database[coll].delete_many({"user_id": u["id"]})
            except Exception:
                pass
        await database.users.update_one(
            {"id": u["id"]},
            {"$set": {"data_purged_at": now.isoformat()}},
        )
        purged += 1
    return purged

# ============= STARTUP - Create Demo User =============

@app.on_event("startup")
async def startup_event():
    """Initialise asyncpg pool, create tables, seed demo user."""

    # ── Connect to PostgreSQL ────────────────────────────────────────────
    global _db_init_error
    _db_ready = False
    if not _DATABASE_URL:
        _db_init_error = "DATABASE_URL env var is not set"
        logging.error("DATABASE_URL env var is not set — database will not work")
    else:
        # Retry a few times with backoff: on Cloud Run the Cloud SQL unix socket is
        # provided by a sidecar that may not be ready the instant startup runs, which
        # surfaces as FileNotFoundError on the socket path. Since startup runs only once,
        # a single early failure would otherwise leave the DB down for the whole
        # container lifetime.
        for _attempt in range(1, 6):
            try:
                await asyncio.wait_for(db.init_pool(_DATABASE_URL), timeout=15)
                await asyncio.wait_for(db.create_all_tables(), timeout=20)
                logging.info("PostgreSQL pool initialised and tables ensured")
                _db_ready = True
                _db_init_error = None
                break
            except asyncio.TimeoutError:
                _db_init_error = "TimeoutError: DB connection/bring-up exceeded timeout"
                logging.error(f"DB init attempt {_attempt}/5 timed out", exc_info=True)
            except Exception as e:
                _db_init_error = f"{type(e).__name__}: {e}"
                logging.error(f"DB init attempt {_attempt}/5 failed: {e}", exc_info=True)
            if _attempt < 5:
                await asyncio.sleep(2 * _attempt)  # 2s, 4s, 6s, 8s

    if not _db_ready:
        logging.warning("Skipping post-startup DB tasks — database not available")
        return

    # ── Seed demo user ───────────────────────────────────────────────────
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if not existing:
        demo_user = {
            "id": "demo-user-001",
            "email": DEMO_EMAIL,
            "password": await hash_password_async(DEMO_PASSWORD),
            "name": "Demo Trader",
            "subscription_plan": "lifetime",
            "subscription_end": None,
            "is_premium": True,
            # Demo is a non-admin showcase account. Admin access is granted via the
            # ADMIN_EMAILS env var on a real login, never through this seeded account.
            "is_admin": False,
            "auth_provider": "password",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(demo_user)
        logging.info("Demo user created: %s (premium, non-admin)", DEMO_EMAIL)
    else:
        # Idempotent self-heal: keep demo on lifetime premium and NOT admin.
        patch: Dict[str, Any] = {}
        if existing.get("is_admin"):
            patch["is_admin"] = False  # Demo must never be admin (use ADMIN_EMAILS instead)
        if existing.get("subscription_plan") != "lifetime":
            patch["subscription_plan"] = "lifetime"
        if not existing.get("auth_provider"):
            patch["auth_provider"] = "password"
        if patch:
            await db.users.update_one({"email": DEMO_EMAIL}, {"$set": patch})
            logging.info("Demo user patched: %s", patch)

    # ── Purge expired JWT revocations (safe: expired tokens can't be used anyway) ─
    try:
        expired_cutoff = datetime.now(timezone.utc).isoformat()
        result = await db.revoked_tokens.delete_many({"expires_at": {"$lt": expired_cutoff}})
        logging.info("[startup] Purged %d expired revoked_tokens", result.deleted_count)
    except Exception as e:
        logging.warning("[startup] Could not purge revoked_tokens: %s", e)

    # ── Purge old usage_events (retain ~120 days for the admin heatmap) ──
    try:
        ue_cutoff = (datetime.now(timezone.utc) - timedelta(days=120)).isoformat()
        ue_res = await db.usage_events.delete_many({"ts": {"$lt": ue_cutoff}})
        logging.info("[startup] Purged %d old usage_events", ue_res.deleted_count)
    except Exception as e:
        logging.warning("[startup] Could not purge usage_events: %s", e)

    # ── Retención: purgar datos de clientes sin pago > DATA_RETENTION_DAYS ──
    try:
        purged = await purge_lapsed_user_data(db)
        if purged:
            logging.info("[startup] Retención: purgados los datos de %d usuario(s) sin pago > %d días",
                         purged, DATA_RETENTION_DAYS)
    except Exception as e:
        logging.warning("[startup] Retención/purga falló: %s", e)

    # ── Extended modules ─────────────────────────────────────────────────
    try:
        from missing_apis import ensure_missing_api_indexes
        from referrals import ensure_referral_indexes
        from affiliate_program import ensure_affiliate_indexes
        from realtime_alerts import start_poller

        await ensure_missing_api_indexes(db)
        await ensure_referral_indexes(db)
        await ensure_affiliate_indexes(db)
        start_poller()
        logging.info("✅ Extended modules: indexes ensured & WS poller started")
    except Exception as e:
        logging.error(f"Extended modules startup error: {e}", exc_info=True)

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=dict)
@limiter.limit("3/hour")
async def register(request: Request, response: Response, user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="No se pudo completar el registro. Verifica tus datos.")
    
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
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    try:
        import asyncio as _asyncio
        _asyncio.create_task(_send_welcome_email(user_data.email, user_data.name))
        _asyncio.create_task(_send_email_verification(user_id, user_data.email, user_data.name))
    except Exception:
        pass

    token = create_token(user_id, user_data.email)
    refresh_token = create_refresh_token(user_id, user_data.email)
    _set_auth_cookies(response, token, refresh_token)
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
            "email_verified": False,
        }
    }

@api_router.post("/auth/login", response_model=dict)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not user.get("password") or not await verify_password_async(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Password is correct — if the user enabled 2FA, don't issue a session yet.
    # Return a short-lived pending token; the client must complete /auth/2fa/verify.
    if user.get("totp_enabled"):
        return {"totp_required": True, "pending_token": _create_2fa_pending_token(user["id"], user["email"])}

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_seen": now_iso}, "$inc": {"login_count": 1}},
    )

    token = create_token(user["id"], user["email"])
    refresh_token = create_refresh_token(user["id"], user["email"])
    is_premium = check_premium(user)
    _set_auth_cookies(response, token, refresh_token)

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
            "subscription_status": user.get("subscription_status"),
            "is_premium": is_premium,
            "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
            "auth_provider": user.get("auth_provider", "password"),
            "email_verified": bool(user.get("email_verified", False)),
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
        subs = await asyncio.to_thread(
            stripe.Subscription.list,
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
                {"$set": {"is_premium": False, "subscription_plan": None, "subscription_end": None,
                          "premium_lapsed_at": _lapse_stamp(user)}},
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
        "subscription_status": user.get("subscription_status"),
        "is_premium": is_premium,
        "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
        "auth_provider": user.get("auth_provider", "password"),
        "email_verified": bool(user.get("email_verified", False)),
        "two_factor_enabled": bool(user.get("totp_enabled", False)),
        "picture": user.get("picture"),
        "last_seen": user.get("last_seen"),
        "login_count": user.get("login_count", 0),
    }


@api_router.post("/auth/logout")
async def logout(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Revoke the caller's JWT so it cannot be reused even if leaked. Also clears httpOnly cookies."""
    _clear_auth_cookies(response)
    token = _extract_token_from_request(request, credentials)
    if not token:
        return {"ok": True, "revoked": False}
    try:
        payload = decode_token(token)
    except HTTPException:
        return {"ok": True, "revoked": False}
    await _revoke_token(payload)
    return {"ok": True, "revoked": True}


class TokenRefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


@api_router.post("/auth/refresh")
@limiter.limit("30/minute")
async def refresh_access_token(request: Request, response: Response, body: TokenRefreshRequest) -> Dict[str, Any]:
    """Exchange a valid refresh token for a new access token.
    Reads token from body first, falls back to httpOnly cookie so both paths work.
    The refresh token is rotated (revoked and a fresh one issued) for better security."""
    raw_token = body.refresh_token or request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=401, detail="Refresh token requerido.")
    try:
        payload = jwt.decode(raw_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expirado. Inicia sesión de nuevo.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Refresh token inválido.")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token no es un refresh token.")

    if await _is_token_revoked(payload):
        raise HTTPException(status_code=401, detail="Refresh token revocado. Inicia sesión de nuevo.")

    if await _is_user_session_revoked(payload):
        raise HTTPException(status_code=401, detail="Sesión revocada por cambio de contraseña.")

    user_id = payload.get("user_id")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Refresh token malformado.")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado.")

    # Revoke old refresh token (rotation)
    await _revoke_token(payload)

    new_access = create_token(user_id, email)
    new_refresh = create_refresh_token(user_id, email)
    _set_auth_cookies(response, new_access, new_refresh)

    return {
        "token": new_access,
        "refresh_token": new_refresh,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "picture": user.get("picture"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
            "subscription_status": user.get("subscription_status"),
            "is_premium": check_premium(user),
            "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
            "auth_provider": user.get("auth_provider", "password"),
            "email_verified": bool(user.get("email_verified", False)),
        },
    }


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
    frontend_url = os.environ.get("FRONTEND_URL", "https://tradingcalculatorpro.com")
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
async def verify_magic_link(request: Request, response: Response, body: MagicLinkVerifyRequest):
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
    refresh_token = create_refresh_token(user["id"], user["email"])
    _set_auth_cookies(response, token, refresh_token)
    return {
        # `token` matches /auth/login & /auth/google; `access_token` kept for
        # backwards-compat with the existing MagicPage that reads access_token.
        "token": token,
        "access_token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "picture": user.get("picture"),
            # Honor ADMIN_EMAILS so the admin gets the panel no matter which
            # login method they use (matches /auth/login and /auth/google).
            "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
            "is_premium": check_premium(user),
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


async def _send_email_verification(user_id: str, to_email: str, name: str) -> None:
    """Create a verification token and email a confirmation link on signup.
    Non-blocking; the /auth/verify-email endpoint (missing_apis.py) consumes it."""
    try:
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        await db.email_verification_tokens.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id, "email": to_email, "token": token,
                "used": False, "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        frontend_url = os.environ.get("FRONTEND_URL", "https://tradingcalculatorpro.com")
        verify_url = f"{frontend_url}/verify-email?token={token}"
        if not SENDGRID_API_KEY:
            logging.info(f"[verify-email] DEV MODE — link for {to_email}: {verify_url}")
            return
        import httpx as _httpx
        payload = {
            "personalizations": [{"to": [{"email": to_email, "name": name}]}],
            "from": {"email": SENDER_EMAIL, "name": "Trading Calculator PRO"},
            "subject": "Verifica tu email — Trading Calculator PRO",
            "content": [{"type": "text/html", "value": f"""
<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
  <h2 style="color:#10b981">Trading Calculator PRO</h2>
  <p>Hola {name},</p>
  <p>Confirma tu dirección de email para asegurar tu cuenta. El enlace expira en <strong>24 horas</strong>.</p>
  <a href="{verify_url}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 28px;
     border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Verificar email →</a>
  <p style="color:#888;font-size:12px">Si no creaste esta cuenta, ignora este email.</p>
</div>"""}],
        }
        async with _httpx.AsyncClient(timeout=10) as c:
            await c.post(
                "https://api.sendgrid.com/v3/mail/send", json=payload,
                headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
            )
    except Exception as e:
        logging.warning(f"[verify-email] send error: {e}")


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

    frontend_url = os.environ.get("FRONTEND_URL", "https://tradingcalculatorpro.com")
    reset_url = f"{frontend_url}/reset-password#{reset_token}"
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
        {"$set": {"password": await hash_password_async(body.new_password)}},
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
        {"$set": {"password": await hash_password_async(body.new_password)}},
    )
    # Revoke all existing sessions (force re-login)
    await db.user_revocations.update_one(
        {"user_id": user["id"]},
        {"$set": {"revoked_after": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "message": "Contraseña cambiada correctamente. Por seguridad, vuelve a iniciar sesión."}


# ============= TWO-FACTOR AUTHENTICATION (TOTP) =============

def _create_2fa_pending_token(user_id: str, email: str) -> str:
    """Short-lived (5 min) token proving the password step passed; exchanged at
    /auth/2fa/verify for a real session. Never a valid access/refresh token."""
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"user_id": user_id, "email": email, "type": "2fa_pending",
         "jti": str(uuid.uuid4()), "iat": now, "exp": now + timedelta(minutes=5)},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )


class TotpCodeRequest(BaseModel):
    code: str


class TotpVerifyRequest(BaseModel):
    pending_token: str
    code: str


@api_router.post("/auth/2fa/setup")
@limiter.limit("10/hour")
async def totp_setup(request: Request, user: dict = Depends(require_user)):
    """Generate a pending TOTP secret + provisioning URI. Does NOT enable 2FA
    until the user confirms a code via /auth/2fa/enable."""
    import pyotp
    if user.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="El 2FA ya está activado.")
    secret = pyotp.random_base32()
    await db.users.update_one({"id": user["id"]}, {"$set": {"totp_pending_secret": secret}})
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user["email"], issuer_name="Trading Calculator PRO"
    )
    return {"secret": secret, "otpauth_uri": uri}


@api_router.post("/auth/2fa/enable")
@limiter.limit("10/hour")
async def totp_enable(request: Request, body: TotpCodeRequest, user: dict = Depends(require_user)):
    """Confirm the 6-digit code against the pending secret and enable 2FA."""
    import pyotp
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "totp_pending_secret": 1})
    secret = (doc or {}).get("totp_pending_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Inicia la configuración de 2FA primero.")
    if not pyotp.TOTP(secret).verify(body.code.strip(), valid_window=1):
        raise HTTPException(status_code=400, detail="Código incorrecto. Inténtalo de nuevo.")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"totp_secret": secret, "totp_enabled": True, "totp_pending_secret": None,
                  "totp_enabled_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "message": "2FA activado correctamente."}


@api_router.post("/auth/2fa/disable")
@limiter.limit("10/hour")
async def totp_disable(request: Request, body: TotpCodeRequest, user: dict = Depends(require_user)):
    """Disable 2FA after verifying a current code (proves the user still controls it)."""
    import pyotp
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "totp_secret": 1, "totp_enabled": 1})
    if not (doc or {}).get("totp_enabled"):
        return {"ok": True, "message": "El 2FA no estaba activado."}
    secret = doc.get("totp_secret")
    if not secret or not pyotp.TOTP(secret).verify(body.code.strip(), valid_window=1):
        raise HTTPException(status_code=400, detail="Código incorrecto.")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"totp_enabled": False, "totp_secret": None, "totp_pending_secret": None}},
    )
    return {"ok": True, "message": "2FA desactivado."}


@api_router.post("/auth/2fa/verify")
@limiter.limit("10/minute")
async def totp_verify(request: Request, response: Response, body: TotpVerifyRequest):
    """Complete a 2FA login: exchange the pending token + TOTP code for a session."""
    import pyotp
    try:
        payload = jwt.decode(body.pending_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El desafío de 2FA ha expirado. Inicia sesión de nuevo.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Desafío de 2FA inválido.")
    if payload.get("type") != "2fa_pending":
        raise HTTPException(status_code=401, detail="Token no válido para 2FA.")
    user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    if not user or not user.get("totp_enabled") or not user.get("totp_secret"):
        raise HTTPException(status_code=400, detail="2FA no está activo para esta cuenta.")
    if not pyotp.TOTP(user["totp_secret"]).verify(body.code.strip(), valid_window=1):
        raise HTTPException(status_code=401, detail="Código incorrecto.")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_seen": now_iso}, "$inc": {"login_count": 1}},
    )
    token = create_token(user["id"], user["email"])
    refresh_token = create_refresh_token(user["id"], user["email"])
    _set_auth_cookies(response, token, refresh_token)
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "picture": user.get("picture"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
            "subscription_status": user.get("subscription_status"),
            "is_premium": check_premium(user),
            "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
            "auth_provider": user.get("auth_provider", "password"),
            "email_verified": bool(user.get("email_verified", False)),
            "two_factor_enabled": True,
        },
    }


async def _cancel_stripe_subscriptions_for_user(user_doc: dict) -> None:
    """Best-effort: cancel any active Stripe subscription so a deleted account
    stops being billed. Never raises — GDPR deletion must proceed regardless."""
    customer_id = user_doc.get("stripe_customer_id")
    if not customer_id:
        return
    try:
        stripe.api_key = await get_setting("stripe_secret_key") or STRIPE_API_KEY
        subs = await asyncio.to_thread(
            stripe.Subscription.list, customer=customer_id, status="active", limit=100
        )
        for sub in subs.data:
            try:
                await asyncio.to_thread(stripe.Subscription.delete, sub.id)
                logging.info("[RGPD] Cancelled Stripe subscription %s before account delete", sub.id)
            except Exception as exc:
                logging.error("[RGPD] Failed to cancel Stripe sub %s: %s", sub.id, exc)
    except Exception as exc:
        logging.error("[RGPD] Stripe cancellation lookup failed for %s: %s", customer_id, exc)


@api_router.delete("/auth/account")
@limiter.limit("3/hour")
async def delete_account(request: Request, user: dict = Depends(require_user)):
    """RGPD: permanently delete the authenticated user's account and all data.
    Cancels any active Stripe subscription first so the person is not billed
    after deletion."""
    user_id = user["id"]
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0}) or user

    # 1) Stop future billing before removing the account (best-effort).
    await _cancel_stripe_subscriptions_for_user(user_doc)

    # 2) Delete all user data across every collection that stores a user_id.
    for collection in ["trades", "calculations", "alerts", "portfolio",
                        "user_states", "payment_transactions", "saved_positions",
                        "referrals", "referral_redemptions", "usage_events",
                        "email_verification_tokens", "password_resets",
                        "user_revocations"]:
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
        # find() returns a lazy _Cursor; it must be materialised with .to_list().
        # Awaiting the cursor directly raises (no __await__) and the export would
        # silently return [] — breaking the RGPD data-portability guarantee.
        try:
            return await getattr(db, collection).find(query, {"_id": 0}).to_list(100000)
        except Exception:
            return []

    # NOTE: both /journal/trades and /performance/trades persist into db.trades
    # (there is no separate "performance_trades" collection — see BUG fixed
    # 2026-06-06), so "trades" below already contains the user's full trading
    # journal including performance-module entries. No separate collect() needed.
    #
    # The export must cover everything `delete_account` erases, minus pure
    # security artefacts. Anything the user can have DELETED they must be able
    # to TAKE WITH THEM — exporting less than we delete is exactly the gap
    # GDPR Art. 20 exists to close. Deliberately excluded: email verification
    # tokens, password resets and token revocations (credentials, not personal
    # data, and shipping them out would be a security regression).
    trades           = await collect("trades",           {"user_id": user_id})
    calculations     = await collect("calculations",     {"user_id": user_id})
    alerts           = await collect("alerts",           {"user_id": user_id})
    portfolio        = await collect("portfolio",        {"user_id": user_id})
    saved_positions  = await collect("saved_positions",  {"user_id": user_id})
    user_states      = await collect("user_states",      {"user_id": user_id})
    journal_entries  = await collect("journal_entries",  {"user_id": user_id})
    referrals        = await collect("referrals",        {"user_id": user_id})

    # Billing history is the user's own data, but the raw rows carry gateway
    # internals. Ship the fields a person would actually need for their records.
    raw_payments = await collect("payment_transactions", {"user_id": user_id})
    payments = [
        {k: p.get(k) for k in
         ("id", "amount", "currency", "status", "plan", "provider", "created_at", "paid_at")}
        for p in raw_payments
    ]

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "format_version": 2,
        "profile":          safe_user,
        "trades":           trades,
        "calculations":     calculations,
        "alerts":           alerts,
        "portfolio":        portfolio,
        "saved_positions":  saved_positions,
        "preferences":      user_states,
        "journal_entries":  journal_entries,
        "referrals":        referrals,
        "payments":         payments,
    }

    filename = f"my-data-{user_id[:8]}.json"
    return Response(
        content=_json.dumps(payload, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============= GOOGLE OAUTH =============
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

# .strip() defends against secrets stored with a trailing/leading newline.
# Without it, a stray "\n" makes the OAuth audience mismatch every Google
# token → all "Sign in with Google" logins fail with 401 "Token inválido".
GOOGLE_CLIENT_ID = (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()


class GoogleAuthRequest(BaseModel):
    """Payload sent by the SPA after Google's button returns an ID token."""
    credential: str  # the Google-issued ID token (JWT signed by Google)


@api_router.post("/auth/google")
@limiter.limit("10/minute")
async def google_auth(request: Request, response: Response, payload: GoogleAuthRequest):
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
    is_new_user = user is None   # para atribución de referidos: solo altas nuevas
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
    refresh_token = create_refresh_token(user["id"], user["email"])
    _set_auth_cookies(response, token, refresh_token)
    return {
        "token": token,
        "is_new_user": is_new_user,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
            "subscription_status": user.get("subscription_status"),
            "is_premium": check_premium(user),
            "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
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
                    "ids": ",".join(dict.fromkeys(COINGECKO_SYMBOL_TO_ID.values())),
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
        eur_usd = 0.92
        try:
            fx = await _yf_history_async("EURUSD=X", period="2d")
            if not fx.empty:
                eur_usd = 1 / float(fx["Close"].iloc[-1])
        except Exception:
            pass
        commodity_map = {"gold": "GC=F", "silver": "SI=F", "oil": "CL=F"}
        for label, sym in commodity_map.items():
            try:
                hist = await _yf_history_async(sym, period="2d")
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
                hist = await _yf_history_async(cand, period=period_str, interval=interval)
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
async def create_trade(trade: TradeEntry, user: dict = Depends(require_premium)):
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
async def get_trades(user: dict = Depends(require_premium), limit: int = 100):
    trades = await db.trades.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return trades

class TradeUpdate(BaseModel):
    """Allowed fields for updating a trade — prevents mass-assignment attacks."""
    symbol: Optional[str] = None
    direction: Optional[str] = None
    entryPrice: Optional[float] = None
    exitPrice: Optional[float] = None
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    quantity: Optional[float] = None
    leverage: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    emotion: Optional[int] = None
    screenshot_urls: Optional[List[str]] = None
    exit_date: Optional[str] = None
    fees: Optional[float] = None


@api_router.put("/journal/trades/{trade_id}")
async def update_trade(trade_id: str, updates: TradeUpdate, user: dict = Depends(require_premium)):
    trade = await db.trades.find_one({"id": trade_id, "user_id": user["id"]})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade no encontrado")

    safe_updates = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}

    # Recalculate P&L if closing
    if safe_updates.get("status") == "closed" and safe_updates.get("exitPrice"):
        direction = trade.get("direction", safe_updates.get("direction"))
        entry = trade.get("entryPrice", safe_updates.get("entryPrice"))
        exit_price = safe_updates.get("exitPrice")
        quantity = trade.get("quantity", safe_updates.get("quantity", 1))
        leverage = trade.get("leverage", safe_updates.get("leverage", 1))

        if direction == "long":
            pnl = (exit_price - entry) * quantity * leverage
            roe = ((exit_price - entry) / entry) * 100 * leverage
        else:
            pnl = (entry - exit_price) * quantity * leverage
            roe = ((entry - exit_price) / entry) * 100 * leverage

        safe_updates["pnl"] = round(pnl, 2)
        safe_updates["roe"] = round(roe, 2)

    await db.trades.update_one(
        {"id": trade_id, "user_id": user["id"]},
        {"$set": safe_updates}
    )
    return {"message": "Trade actualizado"}

@api_router.delete("/journal/trades/{trade_id}")
async def journal_delete_trade(trade_id: str, user: dict = Depends(require_premium)):
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
async def get_journal_stats(user: dict = Depends(require_premium)) -> Dict[str, Any]:
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
async def get_portfolio(user: dict = Depends(require_premium)):
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

class PortfolioUpdate(BaseModel):
    """Allowed fields for updating a portfolio asset — prevents mass-assignment attacks."""
    symbol: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[float] = None
    avg_price: Optional[float] = None
    current_price: Optional[float] = None
    notes: Optional[str] = None
    target_allocation: Optional[float] = None


@api_router.put("/portfolio/{asset_id}")
async def update_portfolio_asset(asset_id: str, updates: PortfolioUpdate, user: dict = Depends(require_user)):
    safe_updates = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    result = await db.portfolio.update_one(
        {"id": asset_id, "user_id": user["id"]},
        {"$set": safe_updates}
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
        await asyncio.to_thread(sg.send, message)
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
<p style="margin:8px 0 0;color:#000;opacity:0.7;font-size:14px;">tradingcalculatorpro.com</p>
</td></tr>
<tr><td style="padding:40px;">{body}</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
<p style="color:#555;font-size:12px;margin:0;">© {year} Trading Calculator PRO · Todos los derechos reservados</p>
</td></tr>
</table></td></tr></table>
</body></html>
"""

def _email_html(body_html: str) -> str:
    # {year} is filled dynamically so the footer copyright never goes stale.
    return _EMAIL_BASE.replace("{body}", body_html).replace(
        "{year}", str(datetime.now(timezone.utc).year)
    )

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
<a href="https://tradingcalculatorpro.com/dashboard" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Ir al Dashboard →</a>
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
<a href="https://tradingcalculatorpro.com/dashboard" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Ir al Dashboard →</a>
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
<a href="https://tradingcalculatorpro.com/settings" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Actualizar método de pago →</a>
"""
    await _send_email(to_email, "⚠️ Pago fallido — Trading Calculator PRO", _email_html(body))

async def _send_subscription_cancelled_email(to_email: str, name: str) -> None:
    body = f"""
<h2 style="color:#fff;margin-top:0;">Suscripción cancelada</h2>
<p style="color:#aaa;line-height:1.6;">Hola <strong style="color:#fff;">{name}</strong>, tu suscripción a Trading Calculator PRO ha sido cancelada.</p>
<p style="color:#aaa;line-height:1.6;">Tu acceso premium ha sido desactivado. Puedes reactivarlo en cualquier momento.</p>
<a href="https://tradingcalculatorpro.com/pricing" style="display:inline-block;background:#00E676;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:24px;">Reactivar suscripción →</a>
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
    num_trades = min(int(request.get("numTrades", 100)), 1000)
    num_simulations = min(int(request.get("numSimulations", 1000)), 5000)

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
        # _run_real_backtest does synchronous yfinance I/O + number crunching;
        # run it in a thread so it doesn't block the event loop.
        loop = asyncio.get_event_loop()
        sim = await loop.run_in_executor(
            None,
            lambda: _run_real_backtest(
                symbol=symbol,
                strategy=strategy,
                days=days,
                initial_capital=initial_capital,
                take_profit_pct=take_profit,
                stop_loss_pct=stop_loss,
                leverage=leverage,
            ),
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

# ── PayPal REST API v2 helpers (httpx async) ──────────────────────────────────

def _paypal_base_url(mode: str) -> str:
    return "https://api-m.sandbox.paypal.com" if mode != "live" else "https://api-m.paypal.com"


async def _paypal_access_token(client_id: str, client_secret: str, mode: str) -> str:
    import httpx as _httpx
    async with _httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{_paypal_base_url(mode)}/v1/oauth2/token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json"},
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def _paypal_create_order(
    plan: dict, user_id: str, transaction_id: str, origin_url: str,
    client_id: str, client_secret: str, mode: str,
) -> dict:
    import httpx as _httpx
    token = await _paypal_access_token(client_id, client_secret, mode)
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": transaction_id,
            "custom_id": user_id,
            "amount": {
                "currency_code": plan.get("currency", "EUR").upper(),
                "value": f"{plan['price']:.2f}",
            },
            "description": f"TradingCalculator.Pro — Plan {plan['name']}",
        }],
        "application_context": {
            "return_url": f"{origin_url}/payment/success",
            "cancel_url": f"{origin_url}/payment/cancel",
            "brand_name": "TradingCalculator.Pro",
            "user_action": "PAY_NOW",
        },
    }
    async with _httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{_paypal_base_url(mode)}/v2/checkout/orders",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        return r.json()


async def _paypal_capture_order(order_id: str, client_id: str, client_secret: str, mode: str) -> dict:
    import httpx as _httpx
    token = await _paypal_access_token(client_id, client_secret, mode)
    async with _httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{_paypal_base_url(mode)}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            content=b"{}",
        )
        r.raise_for_status()
        return r.json()


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


# Free-trial length for recurring subscriptions (card collected upfront via
# Stripe Checkout; the card is auto-charged when the trial ends). 0 = no trial.
TRIAL_PERIOD_DAYS = 7


async def _create_stripe_session(
    plan: dict, payment_method: str, success_url: str, cancel_url: str,
    metadata: Dict[str, str], origin_url: str, trial_days: int = 0,
) -> Any:
    """Create a Stripe Checkout session using the plan's Stripe price ID.

    When `trial_days > 0` and the plan is a recurring subscription, the session
    starts a free trial: Checkout still collects the card upfront (we do NOT set
    payment_method_collection='if_required'), and Stripe charges automatically
    when the trial ends.
    """
    import asyncio as _asyncio
    runtime_key = await get_setting("stripe_secret_key") or STRIPE_API_KEY
    stripe.api_key = runtime_key

    mode = "payment" if plan.get("interval") == "lifetime" else "subscription"
    payment_methods = _PAYMENT_METHODS_MAP.get(payment_method, ["card"])

    # Idempotency key prevents duplicate sessions if the client retries on network error
    idempotency_key = f"checkout-{metadata.get('user_id', 'anon')}-{metadata.get('plan_id', 'unknown')}-{metadata.get('transaction_id', secrets.token_hex(8))}"
    session_kwargs: Dict[str, Any] = {
        "payment_method_types": payment_methods,
        "line_items": [{"price": plan["stripe_price_id"], "quantity": 1}],
        "mode": mode,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": metadata,
        "idempotency_key": idempotency_key,
    }
    if mode == "subscription" and trial_days and trial_days > 0:
        session_kwargs["subscription_data"] = {"trial_period_days": int(trial_days)}
    session = await _asyncio.get_event_loop().run_in_executor(
        None,
        lambda: stripe.checkout.Session.create(**session_kwargs),
    )
    # Expose .session_id so callers don't need changing
    session.session_id = session.id
    return session


@api_router.post("/checkout/create")
@limiter.limit("10/hour")
async def create_checkout(request: Request, body: dict, user: dict = Depends(require_user)) -> Dict[str, Any]:
    plan_id = body.get("plan_id")
    payment_method = body.get("payment_method", "stripe")
    origin_url = body.get("origin_url", "")

    _validate_origin_url(origin_url, "origin_url")

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

    if payment_method == "paypal":
        pp_client_id = await get_setting("paypal_client_id") or os.environ.get("PAYPAL_CLIENT_ID", "")
        pp_client_secret = await get_setting("paypal_client_secret") or os.environ.get("PAYPAL_CLIENT_SECRET", "")
        pp_default_mode = "live" if os.environ.get("ENVIRONMENT", "production") == "production" else "sandbox"
        pp_mode = await get_setting("paypal_mode") or os.environ.get("PAYPAL_MODE", pp_default_mode)
        if not pp_client_id or not pp_client_secret:
            raise HTTPException(status_code=503, detail="PayPal no está configurado. Contacta soporte.")
        try:
            order = await _paypal_create_order(
                plan, user["id"], transaction["id"], origin_url,
                pp_client_id, pp_client_secret, pp_mode,
            )
        except Exception as _e:
            logging.error(f"[paypal] create_order error: {_e}")
            raise HTTPException(status_code=502, detail="Error al crear orden PayPal. Inténtalo de nuevo.")
        transaction["paypal_order_id"] = order["id"]
        # approval_url for mobile/fallback redirect
        approval = next((l["href"] for l in order.get("links", []) if l["rel"] == "approve"), None)
        transaction["checkout_url"] = approval

    elif payment_method == "revolut":
        # Revolut Pay via Revolut Merchant API (independent of Stripe). The hosted
        # checkout also shows Apple Pay / Google Pay on eligible devices. Premium is
        # granted in the signature-verified /webhook/revolut callback once settled.
        # (Revolut webhooks are registered once at account level, not per order.)
        from revolut import RevolutError, create_order as _rev_create_order

        rev_api_key = await get_setting("revolut_api_key")
        rev_default_sandbox = os.environ.get("ENVIRONMENT", "production") != "production"
        rev_sandbox = (await get_setting("revolut_sandbox") or str(rev_default_sandbox)).strip().lower() in ("1", "true", "yes", "on")
        if not rev_api_key:
            raise HTTPException(status_code=503, detail="Revolut Pay no está configurado. Contacta soporte.")

        try:
            rev_order = await _rev_create_order(
                api_key=rev_api_key,
                amount=float(plan["price"]),
                currency=plan.get("currency", "EUR"),
                order_id=transaction["id"],
                description=f"TradingCalculator.Pro — Plan {plan['name']}",
                redirect_url=f"{origin_url}/payment/success",
                email=user.get("email"),
                sandbox=rev_sandbox,
            )
        except RevolutError as _e:
            logging.error(f"[revolut] create order error: {_e}")
            raise HTTPException(status_code=502, detail="Error al crear el pago con Revolut. Inténtalo de nuevo.")
        transaction["revolut_order_id"] = rev_order.get("order_id")
        transaction["revolut_sandbox"] = rev_sandbox
        transaction["checkout_url"] = rev_order["checkout_url"]

    elif payment_method in ("nowpayments", "np"):
        # Crypto via NOWPayments (non-custodial: funds settle to your wallet).
        # The hosted invoice URL is returned synchronously; premium is granted in
        # the signature-verified /webhook/nowpayments IPN once the payment settles
        # ('finished'). order_id is our unguessable payment_transactions.id.
        from nowpayments import NowPaymentsError, create_invoice as _np_create_invoice

        np_api_key = await get_setting("nowpayments_api_key")
        np_default_sandbox = os.environ.get("ENVIRONMENT", "production") != "production"
        np_sandbox = (await get_setting("nowpayments_sandbox") or str(np_default_sandbox)).strip().lower() in ("1", "true", "yes", "on")
        if not np_api_key:
            raise HTTPException(status_code=503, detail="Pago con criptomonedas (NOWPayments) no está configurado. Contacta soporte.")

        backend_base = (os.environ.get("BACKEND_PUBLIC_URL", "").strip() or str(request.base_url)).rstrip("/")
        try:
            np_invoice = await _np_create_invoice(
                api_key=np_api_key,
                amount=float(plan["price"]),
                currency=plan.get("currency", "EUR"),
                order_id=transaction["id"],
                description=f"TradingCalculator.Pro — Plan {plan['name']}",
                ipn_callback_url=f"{backend_base}/api/webhook/nowpayments",
                success_url=f"{origin_url}/payment/success",
                cancel_url=f"{origin_url}/payment/cancel",
                sandbox=np_sandbox,
            )
        except NowPaymentsError as _e:
            logging.error(f"[nowpayments] create invoice error: {_e}")
            raise HTTPException(status_code=502, detail="Error al crear el pago con criptomonedas. Inténtalo de nuevo.")
        transaction["nowpayments_invoice_id"] = np_invoice.get("invoice_id")
        transaction["nowpayments_sandbox"] = np_sandbox
        transaction["checkout_url"] = np_invoice["invoice_url"]

    elif payment_method in _PAYMENT_METHODS_MAP:
        # 7-day free trial only for NEW subscribers (never premium, no prior/active
        # Stripe subscription, trial not already used) and only on recurring plans.
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0}) or {}
        trial_eligible = (
            plan.get("interval") != "lifetime"
            and not user_doc.get("is_premium")
            and not user_doc.get("stripe_subscription_id")
            and not user_doc.get("trial_used")
        )
        trial_days = TRIAL_PERIOD_DAYS if trial_eligible else 0
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
            trial_days=trial_days,
        )
        transaction["trial_days"] = trial_days
        transaction["session_id"] = session.session_id
        transaction["checkout_url"] = session.url

    await db.payment_transactions.insert_one(transaction)

    return {
        "transaction_id": transaction["id"],
        "checkout_url": transaction.get("checkout_url"),
        "session_id": transaction.get("session_id"),
        "paypal_order_id": transaction.get("paypal_order_id"),
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

@api_router.post("/paypal/capture/{order_id}")
@limiter.limit("10/hour")
async def paypal_capture_order(
    request: Request, order_id: str, user: dict = Depends(require_user)
) -> Dict[str, Any]:
    """Called by the frontend after the payer approves the PayPal order.
    Captures the payment and activates the subscription."""
    transaction = await db.payment_transactions.find_one(
        {"paypal_order_id": order_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción PayPal no encontrada")
    if transaction.get("status") == "paid":
        return {"status": "already_paid", "plan_id": transaction["plan_id"]}

    # Atomically claim the transaction to prevent double-capture races
    claimed = await db.payment_transactions.find_one_and_update(
        {"id": transaction["id"], "status": "pending"},
        {"$set": {"status": "capturing"}},
    )
    if not claimed:
        return {"status": "already_paid", "plan_id": transaction["plan_id"]}

    pp_client_id = await get_setting("paypal_client_id") or os.environ.get("PAYPAL_CLIENT_ID", "")
    pp_client_secret = await get_setting("paypal_client_secret") or os.environ.get("PAYPAL_CLIENT_SECRET", "")
    pp_default_mode = "live" if os.environ.get("ENVIRONMENT", "production") == "production" else "sandbox"
    pp_mode = await get_setting("paypal_mode") or os.environ.get("PAYPAL_MODE", pp_default_mode)
    if not pp_client_id or not pp_client_secret:
        await db.payment_transactions.update_one({"id": transaction["id"]}, {"$set": {"status": "pending"}})
        raise HTTPException(status_code=503, detail="PayPal no está configurado")

    try:
        capture_result = await _paypal_capture_order(order_id, pp_client_id, pp_client_secret, pp_mode)
    except Exception as _e:
        logging.error(f"[paypal] capture error for {order_id}: {_e}")
        raise HTTPException(status_code=502, detail="Error al capturar pago PayPal. Contacta soporte.")

    capture_status = capture_result.get("status")
    if capture_status != "COMPLETED":
        raise HTTPException(
            status_code=402,
            detail=f"Pago no completado (estado: {capture_status}). Inténtalo de nuevo."
        )

    plan_id = transaction["plan_id"]
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan no válido")

    # Reuse existing subscription activation (no stripe_session_id — pass empty string)
    subscription_end = datetime.now(timezone.utc) + timedelta(days=plan["days"])
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "subscription_plan": plan_id,
            "subscription_end": subscription_end.isoformat(),
            "is_premium": True,
            "paypal_order_id": order_id,
        }},
    )
    await db.payment_transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
    )

    try:
        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "email": 1, "name": 1})
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
        logging.warning(f"[paypal] confirmation email failed: {_e}")

    logging.info(f"[paypal] subscription activated: user={user['id']} plan={plan_id} order={order_id}")
    return {
        "status": "paid",
        "plan_id": plan_id,
        "subscription_end": subscription_end.isoformat(),
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
        "trial_used": True,  # a completed subscription consumes the free-trial eligibility
        # Renueva/reactiva → cancela cualquier lapso y ventana de purga de datos.
        "premium_lapsed_at": None,
        "data_purged_at": None,
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
    await _record_webhook_seen("stripe")
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
                _u_lapse = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0, "premium_lapsed_at": 1})
                await db.users.update_one(
                    {"stripe_customer_id": customer_id},
                    {"$set": {
                        "is_premium": False,
                        "subscription_plan": None,
                        "subscription_end": None,
                        "subscription_status": "canceled",
                        "stripe_subscription_id": None,
                        "subscription_canceled_at": datetime.now(timezone.utc).isoformat(),
                        "premium_lapsed_at": _lapse_stamp(_u_lapse or {}),
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
                    _u_pf = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0, "premium_lapsed_at": 1})
                    update.update({"is_premium": False, "subscription_plan": None, "subscription_status": "unpaid",
                                   "premium_lapsed_at": _lapse_stamp(_u_pf or {})})
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
                    _set: Dict[str, Any] = {"subscription_status": status, "is_premium": is_active}
                    if is_active:
                        _set["premium_lapsed_at"] = None  # reactivado → sin ventana de purga
                    else:
                        _u_up = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0, "premium_lapsed_at": 1})
                        _set["premium_lapsed_at"] = _lapse_stamp(_u_up or {})
                    await db.users.update_one(
                        {"stripe_customer_id": customer_id},
                        {"$set": _set},
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

            # Idempotency: skip if already processed
            session_id_val = data_obj.get("id", "")
            if session_id_val:
                already = await db.payment_transactions.find_one(
                    {"stripe_session_id": session_id_val, "status": "paid"}
                )
                if already:
                    logging.info("[stripe-webhook] checkout already processed: %s", session_id_val)
                    return {"status": "already_processed"}

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


@api_router.post("/webhook/revolut")
async def revolut_webhook(request: Request) -> Dict[str, str]:
    """Revolut Pay payment callback (HMAC-SHA256 signature verified).

    Grants premium once the order completes (event ORDER_COMPLETED). Revolut
    signs the raw body with the webhook *signing secret* (separate from the API
    key); we reject any callback whose signature doesn't verify. Idempotent: a
    re-delivered/out-of-order webhook is a safe no-op. We match the order via our
    merchant_order_ext_ref (= payment_transactions.id), falling back to the
    stored Revolut order id.
    """
    await _record_webhook_seen("revolut")
    from revolut import (
        parse_webhook, verify_webhook, webhook_order_ref,
        webhook_revolut_order_id, webhook_is_paid,
    )

    raw_body = await request.body()
    signing_secret = await get_setting("revolut_webhook_secret")
    if not verify_webhook(
        raw_body,
        request.headers.get("Revolut-Signature"),
        request.headers.get("Revolut-Request-Timestamp"),
        signing_secret,
    ):
        logging.warning("[revolut-webhook] invalid/missing signature — rejected")
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = parse_webhook(raw_body)
    ext_ref = webhook_order_ref(data)
    transaction = None
    if ext_ref:
        transaction = await db.payment_transactions.find_one({"id": ext_ref}, {"_id": 0})
    if not transaction:
        rev_oid = webhook_revolut_order_id(data)
        if rev_oid:
            transaction = await db.payment_transactions.find_one({"revolut_order_id": rev_oid}, {"_id": 0})
    if not transaction:
        logging.warning("[revolut-webhook] unknown order: ext_ref=%s", ext_ref)
        return {"status": "ignored"}

    order_id = transaction["id"]
    if transaction.get("status") == "paid":
        return {"status": "already_processed"}

    if not webhook_is_paid(data):
        # authorised / pending / etc. — record latest event, keep it claimable.
        await db.payment_transactions.update_one(
            {"id": order_id},
            {"$set": {"revolut_last_event": str(data.get("event") or data.get("state") or "")[:40]}},
        )
        return {"status": "received"}

    # Atomically claim the pending transaction to prevent a double grant.
    claimed = await db.payment_transactions.find_one_and_update(
        {"id": order_id, "status": "pending"},
        {"$set": {"status": "capturing"}},
    )
    if not claimed:
        return {"status": "already_processed"}

    plan_id = transaction["plan_id"]
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        logging.error("[revolut-webhook] invalid plan for order %s: %s", order_id, plan_id)
        await db.payment_transactions.update_one({"id": order_id}, {"$set": {"status": "pending"}})
        return {"status": "error"}

    await _activate_paid_subscription(
        user_id=transaction["user_id"],
        plan_id=plan_id,
        plan=plan,
        transaction_id=order_id,
        session_id="",
    )
    try:
        from referrals import credit_referrer_for_payment
        await credit_referrer_for_payment(
            referee_user_id=transaction["user_id"],
            plan_id=plan_id,
            plan_amount=float(plan.get("price", 0)),
            plan_currency=plan.get("currency", "EUR"),
            transaction_id=order_id,
        )
    except Exception as e:
        logging.warning(f"[revolut-webhook] referral credit error: {e}")

    logging.info(
        "[revolut-webhook] subscription activated: user=%s plan=%s order=%s",
        transaction["user_id"], plan_id, order_id,
    )
    return {"status": "received"}


@api_router.post("/webhook/nowpayments")
async def nowpayments_webhook(request: Request) -> Dict[str, str]:
    """NOWPayments crypto IPN callback (HMAC-SHA512 signature verified).

    Grants premium once the payment settles (payment_status == 'finished').
    NOWPayments signs the sorted JSON body with the IPN secret — we reject any
    callback whose signature doesn't verify. Idempotent: a re-delivered or
    out-of-order IPN is a safe no-op. The order_id we send is the (unguessable
    UUID) payment_transactions.id, tying the callback back to the user/plan.
    """
    await _record_webhook_seen("nowpayments")
    from nowpayments import parse_ipn, verify_ipn, ipn_order_id, ipn_is_paid

    raw_body = await request.body()
    ipn_secret = await get_setting("nowpayments_ipn_secret")
    if not verify_ipn(raw_body, request.headers.get("x-nowpayments-sig"), ipn_secret):
        logging.warning("[nowpayments-webhook] invalid/missing IPN signature — rejected")
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = parse_ipn(raw_body)
    order_id = ipn_order_id(data)
    if not order_id:
        logging.warning("[nowpayments-webhook] missing order id in payload: %s", str(data)[:300])
        return {"status": "ignored"}

    transaction = await db.payment_transactions.find_one({"id": order_id}, {"_id": 0})
    if not transaction:
        logging.warning("[nowpayments-webhook] unknown order id: %s", order_id)
        return {"status": "ignored"}
    if transaction.get("status") == "paid":
        return {"status": "already_processed"}

    if not ipn_is_paid(data):
        # waiting / confirming / partially_paid / etc. — record latest, keep claimable.
        await db.payment_transactions.update_one(
            {"id": order_id},
            {"$set": {"nowpayments_last_status": str(data.get("payment_status") or "")[:40]}},
        )
        return {"status": "received"}

    # Atomically claim the pending transaction to prevent a double grant.
    claimed = await db.payment_transactions.find_one_and_update(
        {"id": order_id, "status": "pending"},
        {"$set": {"status": "capturing"}},
    )
    if not claimed:
        return {"status": "already_processed"}

    plan_id = transaction["plan_id"]
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        logging.error("[nowpayments-webhook] invalid plan for order %s: %s", order_id, plan_id)
        await db.payment_transactions.update_one({"id": order_id}, {"$set": {"status": "pending"}})
        return {"status": "error"}

    await _activate_paid_subscription(
        user_id=transaction["user_id"],
        plan_id=plan_id,
        plan=plan,
        transaction_id=order_id,
        session_id="",
    )
    try:
        from referrals import credit_referrer_for_payment
        await credit_referrer_for_payment(
            referee_user_id=transaction["user_id"],
            plan_id=plan_id,
            plan_amount=float(plan.get("price", 0)),
            plan_currency=plan.get("currency", "EUR"),
            transaction_id=order_id,
        )
    except Exception as e:
        logging.warning(f"[nowpayments-webhook] referral credit error: {e}")

    logging.info(
        "[nowpayments-webhook] subscription activated: user=%s plan=%s order=%s",
        transaction["user_id"], plan_id, order_id,
    )
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
        subscriptions = await asyncio.to_thread(
            stripe.Subscription.list,
            customer=user_doc["stripe_customer_id"], status="all", limit=1
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
        subscriptions = await asyncio.to_thread(
            stripe.Subscription.list,
            customer=user_doc["stripe_customer_id"], status="active", limit=1
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscriptions.data[0]
        
        if request.immediate:
            # Cancel immediately
            await asyncio.to_thread(stripe.Subscription.delete, sub.id)
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"is_premium": False, "subscription_plan": None}}
            )
            return {"message": "Subscription canceled immediately", "canceled": True}
        else:
            # Cancel at period end (Netflix-style: keep access until it lapses)
            await asyncio.to_thread(stripe.Subscription.modify, sub.id, cancel_at_period_end=True)
            # Persist the pending cancellation so the UI can warn without hitting Stripe.
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"subscription_cancel_at_period_end": True}}
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
        subscriptions = await asyncio.to_thread(
            stripe.Subscription.list,
            customer=user_doc["stripe_customer_id"], status="active", limit=1
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscriptions.data[0]
        
        if not sub.cancel_at_period_end:
            return {"message": "Subscription is not set to cancel", "resumed": False}
        
        # Resume by removing cancel_at_period_end
        await asyncio.to_thread(stripe.Subscription.modify, sub.id, cancel_at_period_end=False)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"subscription_cancel_at_period_end": False}}
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

        _validate_origin_url(return_url, "return_url")

        user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})

        if not user_doc or not user_doc.get("stripe_customer_id"):
            raise HTTPException(status_code=404, detail="No Stripe customer found")

        # Create portal session
        session = await asyncio.to_thread(
            stripe.billing_portal.Session.create,
            customer=user_doc["stripe_customer_id"], return_url=return_url
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
        invoices = await asyncio.to_thread(
            stripe.Invoice.list,
            customer=user_doc["stripe_customer_id"], limit=10
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
        import re as _re_val
        if not _re_val.match(r'^[a-zA-Z0-9_-]{1,64}$', str(state_id)):
            raise HTTPException(status_code=400, detail="state_id must be alphanumeric (1-64 chars)")
        
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
        raise HTTPException(status_code=503, detail={"status": "degraded", "db": "unavailable"})
    try:
        async with db._pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "healthy", "db": "ok"}
    except Exception as e:
        logging.error(f"[health] DB check failed: {e}")
        raise HTTPException(status_code=503, detail={"status": "degraded", "db": f"error: {e}"})

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
    # Optional early-exercise context. Supplying a dividend and its ex-date lets
    # the response also cover assignment BEFORE expiry, which is the case a
    # European model cannot represent at all.
    dividend: Optional[float] = None
    daysToExDividend: Optional[int] = None
    dividendYield: Optional[float] = 0.0


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
        data = await asyncio.to_thread(get_stock_data, symbol)
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
    # Uncurated symbol: use the name + category Yahoo's search gave us, if any,
    # so e.g. a freshly-searched "AAPL" shows "Apple Inc." instead of just "AAPL".
    meta = get_cached_meta(s)
    if meta:
        return {"category": meta.get("category") or "stocks", "name": meta.get("name") or s}
    return {"category": "stocks", "name": s}


@api_router.get("/tickers/search")
async def opt_search_tickers(q: str = ""):
    # search_tickers + per-symbol get_stock_data are blocking yfinance calls;
    # run the whole build in a thread so the event loop stays free.
    def _search_with_quotes():
        results = search_tickers(q)
        return [
            {"symbol": sym, **get_stock_data(sym)}
            for sym in results[:15]
        ]
    return {"results": await asyncio.to_thread(_search_with_quotes)}


@api_router.get("/tickers/universal-search")
async def universal_search_tickers(q: str = "", limit: int = 30):
    """Lightweight universal search — returns categorized symbols WITHOUT live prices.

    Used by the calculator UniversalAssetSearch component which has its own
    crypto price store. Avoids the 5–15s latency of fetching yfinance per ticker.
    """
    capped_limit = max(1, min(50, limit))
    results = (await asyncio.to_thread(search_tickers, q))[:capped_limit]
    return {
        "results": [
            {"symbol": sym, **_classify_symbol(sym)}
            for sym in results
        ]
    }


@api_router.get("/options/expirations/{symbol}")
async def opt_get_expirations(symbol: str):
    stock = await asyncio.to_thread(get_stock_data, symbol)
    expirations = await asyncio.to_thread(get_available_expirations, symbol)
    if expirations:
        return {"stock": stock, "expirations": expirations, "source": "market"}
    # Yahoo Finance gave us nothing — fall back to mathematically estimated dates,
    # but clearly flag them so the frontend can warn the user they may not be
    # tradeable (not every symbol has weeklies; some dates may fall on holidays).
    return {
        "stock": stock,
        "expirations": generate_expirations(),
        "source": "estimated",
        "warning": "Could not retrieve real expirations. Dates are estimated "
                   "and may not be tradeable.",
    }


def _synthetic_marker(is_synthetic: bool) -> Dict[str, Any]:
    """Uniform flag for any response built on a modelled (not observed) chain.

    Rule for this codebase: a response that contains modelled quotes always says
    so. The frontend keys off `synthetic` to show a warning band; the prose in
    `syntheticWarning` is the fallback for any client that doesn't.
    """
    if not is_synthetic:
        return {"synthetic": False}
    return {
        "synthetic": True,
        "syntheticWarning": (
            "No real options chain is available for this symbol/expiration. "
            "Prices, IV and Greeks below are MODEL ESTIMATES from an assumed "
            "volatility smile, not market quotes; volume and open interest are "
            "unavailable. Use for exploration only — do not trade off these numbers."
        ),
    }


async def _build_chain_for_expiration(
    symbol: str, stock: Dict[str, Any], expiration: Dict[str, Any], r: float
) -> Tuple[List[Dict[str, Any]], bool]:
    """Fetch (or model) one expiration's chain and enrich it with Greeks.

    Returns `(chain, synthetic)`. Extracted so the single- and multi-expiration
    endpoints cannot drift apart: a calendar spread priced from a chain built by
    a second, slightly different code path is a bug waiting to happen.
    """
    chain = await asyncio.to_thread(get_options_chain_real, symbol, expiration["date"])
    synthetic = not chain
    if not chain:
        return generate_options_chain(stock["price"], expiration["daysToExpiry"], r=r), True

    # Enrich real chain from yfinance with computed Greeks (yfinance doesn't return them)
    from options_math import delta as _d, gamma_val as _g, theta_val as _th, vega_val as _v
    T = year_fraction(expiration["daysToExpiry"])
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
    return chain, synthetic


# A calendar needs 2 expirations, a double diagonal 2, a term-structure view a
# handful. The cap exists because each expiration is a separate upstream fetch.
MAX_CHAIN_EXPIRATIONS = 8


def _parse_expiration_idxs(raw: str, count: int) -> List[int]:
    """`"1,3,6"` → `[1, 3, 6]`, clamped to the expirations that exist.

    Silently drops anything unparseable rather than 400-ing: this is a widening
    of an existing endpoint and a stray token should degrade to fewer chains,
    not to no chain at all.
    """
    out: List[int] = []
    for token in (raw or "").split(","):
        token = token.strip()
        if not token:
            continue
        try:
            idx = int(token)
        except ValueError:
            continue
        if 0 <= idx < count and idx not in out:
            out.append(idx)
    return out[:MAX_CHAIN_EXPIRATIONS]


@api_router.get("/options/chain/{symbol}")
async def opt_get_options_chain(
    symbol: str,
    expiration_idx: int = 3,
    expiration_idxs: Optional[str] = None,
):
    """Options chain for one expiration, or for several in a single call.

    `expiration_idxs=1,3,6` returns a `chains` map keyed by expiration index so
    that a multi-expiration structure (calendar, diagonal, PMCC) can be built
    without firing one request per leg. The single-expiration response shape is
    unchanged, and is still what comes back when the parameter is absent.
    """
    stock = await asyncio.to_thread(get_stock_data, symbol)
    if stock.get("price") is None:
        # No real spot price — don't fabricate a synthetic chain on top of
        # missing data. Surface the error so the frontend can warn the user
        # and disable calculations instead of showing invented quotes.
        return {
            "stock": stock,
            "expiration": None,
            "chain": [],
            "chains": {},
            "error": stock.get("error") or f"No market data available for {symbol}.",
        }
    expirations = await asyncio.to_thread(get_available_expirations, symbol)
    if not expirations:
        expirations = generate_expirations()
    r = await asyncio.to_thread(get_risk_free_rate)

    if expiration_idxs:
        wanted = _parse_expiration_idxs(expiration_idxs, len(expirations))
        if not wanted:
            wanted = [min(expiration_idx, len(expirations) - 1)]
        chains: Dict[str, Any] = {}
        any_synthetic = False
        for idx in wanted:
            exp = expirations[idx]
            chain, synthetic = await _build_chain_for_expiration(symbol, stock, exp, r)
            any_synthetic = any_synthetic or synthetic
            chains[str(idx)] = {
                "expiration": exp,
                "chain": chain,
                **_synthetic_marker(synthetic),
            }
        primary = wanted[0]
        return {
            "stock": stock,
            "expiration": chains[str(primary)]["expiration"],
            "chain": chains[str(primary)]["chain"],
            "chains": chains,
            **_synthetic_marker(any_synthetic),
            "riskFreeRate": round(r, 5),
        }

    if expiration_idx >= len(expirations):
        expiration_idx = min(3, len(expirations) - 1)
    expiration = expirations[expiration_idx]
    chain, synthetic = await _build_chain_for_expiration(symbol, stock, expiration, r)
    return {
        "stock": stock,
        "expiration": expiration,
        "chain": chain,
        "chains": {
            str(expiration_idx): {
                "expiration": expiration,
                "chain": chain,
                **_synthetic_marker(synthetic),
            }
        },
        **_synthetic_marker(synthetic),
        "riskFreeRate": round(r, 5),
    }


@api_router.get("/options/iv-surface/{symbol}")
async def opt_get_iv_surface(symbol: str, max_expirations: int = 8):
    stock = await asyncio.to_thread(get_stock_data, symbol)
    if stock.get("price") is None:
        # No real spot price — can't build an IV surface. Return an empty,
        # flagged response instead of crashing on arithmetic with a null price.
        return {
            "stock": stock,
            "strikes": [],
            "atm_strike": 0,
            "expirations": [],
            "error": stock.get("error") or f"No market data available for {symbol}.",
        }
    expirations = await asyncio.to_thread(get_available_expirations, symbol)
    if not expirations:
        expirations = generate_expirations()
    expirations = expirations[:max_expirations]
    r = await asyncio.to_thread(get_risk_free_rate)
    surface_data = []
    all_strikes = set()
    synthetic_expirations: List[str] = []
    for exp in expirations:
        chain = await asyncio.to_thread(get_options_chain_real, symbol, exp["date"])
        if not chain:
            # A surface stitched from modelled smiles has a skew that was
            # assumed, not observed. Keep it (it's still useful to explore the
            # shape) but record exactly which expiries are made up.
            synthetic_expirations.append(exp["date"])
            chain = generate_options_chain(stock["price"], exp["daysToExpiry"], r=r)
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
        **_synthetic_marker(bool(synthetic_expirations)),
        "syntheticExpirations": synthetic_expirations,
        "riskFreeRate": round(r, 5),
    }


@api_router.get("/options/positioning/{symbol}")
async def opt_get_positioning(symbol: str, expiration_idx: int = 3) -> Dict[str, Any]:
    """Where the open interest sits: max pain, GEX, the OI profile and liquidity.

    These are readings of observed positioning, so they are computed only from
    a real chain. When the provider gives us nothing and the chain has to be
    modelled, every metric comes back None with `synthetic: true` rather than a
    number derived from open interest nobody reported — a fabricated max pain is
    indistinguishable from a real one on screen, which is exactly the problem.
    """
    from options_positioning import (
        max_pain, gamma_exposure, open_interest_profile, put_call_ratio,
        chain_liquidity, atm_iv, expected_move,
    )

    stock = await asyncio.to_thread(get_stock_data, symbol)
    if stock.get("price") is None:
        return {
            "stock": stock,
            "error": stock.get("error") or f"No market data available for {symbol}.",
            "maxPain": None, "gex": None, "openInterestProfile": None,
            "putCallRatio": None, "liquidity": None, "expectedMove": None,
        }

    expirations = await asyncio.to_thread(get_available_expirations, symbol)
    if not expirations:
        expirations = generate_expirations()
    if expiration_idx >= len(expirations):
        expiration_idx = min(3, len(expirations) - 1)
    expiration = expirations[expiration_idx]
    r = await asyncio.to_thread(get_risk_free_rate)
    chain, synthetic = await _build_chain_for_expiration(symbol, stock, expiration, r)

    spot = stock["price"]
    iv = atm_iv(chain, spot)
    if synthetic:
        # An expected move is a volatility statement, not a positioning one, so
        # it survives a modelled chain — but it inherits the modelled IV and the
        # response says so through `synthetic`.
        return {
            "stock": stock,
            "expiration": expiration,
            "maxPain": None,
            "gex": None,
            "openInterestProfile": None,
            "putCallRatio": None,
            "liquidity": None,
            "atmIV": iv,
            "expectedMove": expected_move(spot, iv, expiration.get("daysToExpiry")),
            **_synthetic_marker(True),
        }

    return {
        "stock": stock,
        "expiration": expiration,
        "maxPain": max_pain(chain),
        "gex": gamma_exposure(chain, spot),
        "openInterestProfile": open_interest_profile(chain),
        "putCallRatio": put_call_ratio(chain),
        "liquidity": chain_liquidity(chain),
        "atmIV": iv,
        "expectedMove": expected_move(spot, iv, expiration.get("daysToExpiry")),
        **_synthetic_marker(False),
    }


@api_router.get("/options/term-structure/{symbol}")
async def opt_get_term_structure(symbol: str, max_expirations: int = 8) -> Dict[str, Any]:
    """ATM implied volatility by expiration — contango or backwardation.

    The first question a premium seller asks is whether the front is rich
    against the back, and nothing in the app answered it: the IV surface showed
    skew across strikes but never the curve across time.
    """
    from options_positioning import atm_iv, term_structure

    stock = await asyncio.to_thread(get_stock_data, symbol)
    if stock.get("price") is None:
        return {
            "stock": stock,
            "termStructure": None,
            "error": stock.get("error") or f"No market data available for {symbol}.",
        }

    expirations = await asyncio.to_thread(get_available_expirations, symbol)
    if not expirations:
        expirations = generate_expirations()
    expirations = expirations[:max_expirations]
    r = await asyncio.to_thread(get_risk_free_rate)

    points: List[Dict[str, Any]] = []
    synthetic_dates: List[str] = []
    for exp in expirations:
        chain, synthetic = await _build_chain_for_expiration(symbol, stock, exp, r)
        if synthetic:
            synthetic_dates.append(exp["date"])
        points.append(
            {
                "date": exp["date"],
                "label": exp.get("label"),
                "daysToExpiry": exp["daysToExpiry"],
                "iv": atm_iv(chain, stock["price"]),
                "synthetic": synthetic,
            }
        )

    return {
        "stock": stock,
        "termStructure": term_structure(points),
        **_synthetic_marker(bool(synthetic_dates)),
        "syntheticExpirations": synthetic_dates,
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


class ImpliedVolRequest(BaseModel):
    """Back out IV from an observed option price."""
    marketPrice: float
    stockPrice: float
    strike: float
    daysToExpiry: float
    optionType: str = Field(..., pattern="^(call|put)$")
    dividendYield: Optional[float] = 0.0
    riskFreeRate: Optional[float] = None


@api_router.get("/market/risk-free")
async def market_risk_free() -> Dict[str, Any]:
    """Risk-free rate currently in use, with its provenance.

    `market_rates` already computes this for pricing and for the journal's
    risk-adjusted ratios, but nothing exposed it, so the UI could not tell the
    user where the `r` behind a Greek came from — and `GreeksDisplay` was
    printing a hardcoded 5.25% that no longer matched the backend.
    """
    info = await asyncio.to_thread(get_risk_free_info)
    rate = info.get("rate") or 0.0
    return {
        "rate": rate,
        "ratePct": round(rate * 100, 3),
        "source": info.get("source"),
        "isLive": info.get("is_live", False),
        "fetchedAt": info.get("fetched_at"),
    }


@api_router.post("/calculate/implied-volatility")
async def opt_implied_volatility(req: ImpliedVolRequest) -> Dict[str, Any]:
    """Solve for the volatility that reproduces a given market price.

    Without this the app can only consume whatever IV the data provider hands
    over — which for illiquid strikes is garbage or a 0.30 default. Returns
    `impliedVolatility: null` (not a fabricated number) when no volatility can
    produce the quoted price, which usually means the quote itself is bad.
    """
    r = req.riskFreeRate if req.riskFreeRate is not None else await asyncio.to_thread(get_risk_free_rate)
    T = year_fraction(req.daysToExpiry)
    iv = implied_volatility(
        req.marketPrice, req.stockPrice, req.strike, T, r,
        req.optionType, req.dividendYield or 0.0,
    )
    return {
        "impliedVolatility": iv,
        "impliedVolatilityPct": round(iv * 100, 2) if iv is not None else None,
        "timeToExpiryYears": round(T, 6),
        "riskFreeRate": round(r, 5),
        "solved": iv is not None,
        "reason": None if iv is not None else (
            "No volatility reproduces this price — the quote is outside the "
            "no-arbitrage bounds (below intrinsic value or above the underlying), "
            "or the contract has expired."
        ),
    }


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
    """Simulate exercise/assignment at expiry given a final stock price.

    When a dividend and its ex-date are supplied, also reports EARLY assignment
    risk per short call. Options on US single stocks are American, and a short
    in-the-money call whose remaining time value is worth less than an imminent
    dividend should expect to be assigned the day before the ex-date — an event
    the at-expiry simulation below, and Black-Scholes generally, cannot see.
    """
    try:
        from american_options import early_assignment_risk

        legs_dicts = _legs_to_dicts(request.legs)
        result = simulate_assignment(legs_dicts, request.stockPriceAtExpiry)

        early: List[Dict[str, Any]] = []
        if request.dividend and request.daysToExDividend is not None:
            r = await asyncio.to_thread(get_risk_free_rate)
            for leg in legs_dicts:
                if leg.get("type") != "call" or leg.get("action") != "sell":
                    continue
                risk = early_assignment_risk(
                    S=request.stockPriceAtExpiry,
                    K=leg["strike"],
                    T=year_fraction(leg.get("daysToExpiry", 30)),
                    r=r,
                    sigma=leg.get("iv") or 0.3,
                    dividend=request.dividend,
                    days_to_ex_dividend=request.daysToExDividend,
                    q=request.dividendYield or 0.0,
                )
                risk["leg"] = f"SELL {leg.get('quantity', 1)} CALL ${leg['strike']}"
                early.append(risk)

        result["earlyAssignment"] = early
        result["earlyAssignmentAtRisk"] = any(e.get("at_risk") for e in early)
        return result
    except Exception as e:
        logging.error(f"Assignment simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class AmericanPriceRequest(BaseModel):
    """Price an American option, i.e. one that can be exercised before expiry."""
    stockPrice: float
    strike: float
    daysToExpiry: float
    volatility: float
    optionType: str = Field(..., pattern="^(call|put)$")
    dividendYield: Optional[float] = 0.0
    riskFreeRate: Optional[float] = None
    method: str = Field("baw", pattern="^(baw|binomial)$")
    steps: Optional[int] = None


@api_router.post("/calculate/american")
async def opt_american_price(req: AmericanPriceRequest) -> Dict[str, Any]:
    """American price, the early-exercise premium, and tree-based Greeks.

    Every listed option on a US single stock is American, so the difference
    between this and the Black-Scholes figure elsewhere in the app is not a
    rounding detail: for an in-the-money put, or a call over an ex-dividend
    date, it is the entire early-exercise premium.
    """
    from american_options import (
        american_price, american_greeks, early_exercise_premium, DEFAULT_BINOMIAL_STEPS,
    )

    r = req.riskFreeRate if req.riskFreeRate is not None else await asyncio.to_thread(get_risk_free_rate)
    T = year_fraction(req.daysToExpiry)
    q = req.dividendYield or 0.0
    steps = req.steps or DEFAULT_BINOMIAL_STEPS

    american = await asyncio.to_thread(
        american_price, req.stockPrice, req.strike, T, r, req.volatility,
        req.optionType, q, method=req.method, steps=steps,
    )
    european = option_price(req.stockPrice, req.strike, T, r, req.volatility, req.optionType, q)
    premium = await asyncio.to_thread(
        early_exercise_premium, req.stockPrice, req.strike, T, r, req.volatility,
        req.optionType, q, method=req.method,
    )
    greeks = await asyncio.to_thread(
        american_greeks, req.stockPrice, req.strike, T, r, req.volatility,
        req.optionType, q, steps=steps,
    )
    return {
        "americanPrice": round(american, 4),
        "europeanPrice": round(european, 4),
        "earlyExercisePremium": round(premium, 4),
        "greeks": greeks,
        "method": req.method,
        "riskFreeRate": round(r, 5),
        "timeToExpiryYears": round(T, 6),
        "note": (
            "A non-dividend-paying American call is never worth exercising early, "
            "so its price equals the European one. The premium above is what "
            "Black-Scholes cannot price."
        ),
    }


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
        stock = await asyncio.to_thread(get_stock_data, req.symbol)
        if stock.get("price") is None:
            # No real spot price — optimisation would be meaningless / would
            # divide by a null price. Return a clean error, not a 500.
            return {
                "stock": stock,
                "results": [],
                "error": stock.get("error") or f"No market data available for {req.symbol}.",
            }
        expirations = await asyncio.to_thread(get_available_expirations, req.symbol) or generate_expirations()
        idx = max(0, min(req.expirationIdx, len(expirations) - 1))
        expiration = expirations[idx]
        chain = await asyncio.to_thread(get_options_chain_real, req.symbol, expiration["date"])
        risk_free = await asyncio.to_thread(get_risk_free_rate)
        synthetic = not chain
        if not chain:
            chain = generate_options_chain(stock["price"], expiration["daysToExpiry"], r=risk_free)

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
            risk_free=risk_free,
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
            **_synthetic_marker(synthetic),
            "riskFreeRate": round(risk_free, 5),
        }
    except Exception as e:
        logging.error(f"Optimize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/options/earnings/{symbol}")
async def get_next_earnings(symbol: str):
    """Next earnings date from yfinance (used to warn about IV crush)."""
    try:
        import asyncio as _asyncio
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        cal = None
        try:
            # ticker.calendar performs synchronous HTTP — offload off the event loop
            cal = await _asyncio.get_event_loop().run_in_executor(None, lambda: ticker.calendar)
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
            stock = await asyncio.to_thread(get_stock_data, pos["symbol"])
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
        hist = await _yf_history_async(symbol, period="1y")
        if hist.empty or len(hist) < 30:
            return {"symbol": symbol.upper(), "available": False}

        rolling_vol = _compute_realized_vol_series(hist)
        if rolling_vol is None:
            return {"symbol": symbol.upper(), "available": False}

        spot = float(hist["Close"].iloc[-1])
        # _fetch_atm_iv_proxy does blocking yfinance calls — keep it off the loop
        current_iv = await asyncio.to_thread(_fetch_atm_iv_proxy, symbol, spot)

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


# Open interest is published once a day, after the close. Every volume/OI ratio
# in this file therefore compares TODAY's volume against YESTERDAY's open
# interest. That is not a bug we can fix without a different data provider, but
# it is a caveat the user has to see: the ratio reads high early in the session
# (volume accumulating against a stale denominator) and is at its least
# meaningful on a Monday, when the denominator is three days old.
OI_STALENESS_NOTE = (
    "Open interest is published once per day after the close, so this ratio "
    "compares today's volume against the previous session's open interest. It "
    "reads high early in the session and is least reliable after a weekend. "
    "Treat it as a screening hint, not a measurement."
)


def _volume_oi_ratio(volume: int, open_interest: int) -> Optional[float]:
    """Volume / open interest, or None when open interest is unavailable.

    The previous form was `vol / max(oi, 1)`, which turns a zero denominator
    into a ratio equal to the entire volume: a strike with 500 contracts traded
    and no open interest scored 500 and went straight to the top of "most
    unusual". But volume against zero open interest is the ORDINARY state of a
    newly listed strike on its first day — the least unusual thing on the board,
    ranked first. The ratio there is undefined, not enormous.
    """
    if not open_interest or open_interest <= 0:
        return None
    return volume / open_interest


def _build_unusual_row(symbol: str, side: str, row: Dict[str, Any], opt: Dict[str, Any],
                       exp: Dict[str, Any], stock: Dict[str, Any],
                       ratio: Optional[float]) -> Dict[str, Any]:
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
        # None — not a big number — when open interest is unavailable.
        "ratio": round(ratio, 2) if ratio is not None else None,
        "oiUnavailable": ratio is None,
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
            ratio = _volume_oi_ratio(vol, oi)
            # Strikes with no open interest cannot demonstrate "volume >> OI",
            # so they are not filtered on a ratio they do not have. They are
            # kept (real volume on a fresh strike can still be worth a look) and
            # flagged, but they rank below every row that has a real ratio.
            if ratio is not None and ratio < min_ratio:
                continue
            rows.append(_build_unusual_row(symbol, side, row, opt, exp, stock, ratio))
    return rows


def _rank_flow_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank by ratio, with the open-interest-less rows last, by notional.

    Sorting a mixed list on `ratio` alone used to put the rows whose ratio was
    fabricated from a zero denominator at the very top.
    """
    with_ratio = [r for r in rows if r.get("ratio") is not None]
    without = [r for r in rows if r.get("ratio") is None]
    with_ratio.sort(key=lambda x: (x["ratio"], x.get("estNotional") or 0), reverse=True)
    without.sort(key=lambda x: x.get("estNotional") or 0, reverse=True)
    return with_ratio + without


@api_router.get("/options/unusual/{symbol}")
async def get_unusual_options(symbol: str, min_ratio: float = 2.0, min_volume: int = 100) -> Dict[str, Any]:
    """Detect unusual options activity (volume >> open interest) across the 5 nearest expiries."""
    try:
        stock = await asyncio.to_thread(get_stock_data, symbol)
        expirations = await asyncio.to_thread(get_available_expirations, symbol) or generate_expirations()

        all_unusual: List[Dict[str, Any]] = []
        for exp in expirations[:5]:
            chain = await asyncio.to_thread(get_options_chain_real, symbol, exp["date"])
            if not chain:
                continue
            all_unusual.extend(_scan_chain_for_unusual(symbol, chain, exp, stock, min_ratio, min_volume))

        all_unusual = _rank_flow_rows(all_unusual)
        return {
            "symbol": symbol.upper(),
            "stock": stock,
            "totalFound": len(all_unusual),
            "withoutOpenInterest": sum(1 for r in all_unusual if r.get("oiUnavailable")),
            "filters": {"minRatio": min_ratio, "minVolume": min_volume},
            "oiNote": OI_STALENESS_NOTE,
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
    # UI language, so the coach answers in the language the user is reading.
    locale: Optional[str] = "es"
    # Whether the chain that priced this position was modelled rather than
    # observed. `_synthetic_marker` already flags it on the way out; without it
    # here the coach analyses model output as if it were market data.
    synthetic: Optional[bool] = False


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


_AI_COACH_LANGUAGES = {
    "es": "Spanish", "en": "English", "de": "German", "fr": "French",
    "ru": "Russian", "zh": "Chinese (Simplified)", "ja": "Japanese", "ar": "Arabic",
}

# The system prompt says what the assistant IS. The previous one claimed "15+
# years of experience in volatility trading" — a human career the model does not
# have, invented inside a paid financial product. It bought nothing (the
# analysis is exactly as good either way) and cost credibility and regulatory
# exposure. It is also where the guardrails belong: personalized investment
# advice is a regulated activity, and a disclaimer in the site footer is not
# where a user reads it — the response itself is.
AI_COACH_SYSTEM_PROMPT = (
    "You are the analysis assistant built into TradingCalculator.Pro. You are an AI, "
    "not a person, and you never claim professional experience, credentials or a track "
    "record. Your job is to explain what the numbers in front of the user imply about "
    "the structure of their position and about their own trading record.\n\n"
    "Rules you always follow:\n"
    "- You do NOT give personalized investment advice and you do not tell the user to "
    "buy or sell any specific instrument. You describe trade-offs and let them decide.\n"
    "- You never invent data. If a figure is missing or flagged as an estimate, say so "
    "rather than filling the gap.\n"
    "- When the position carries undefined or very large downside, you say so plainly "
    "and early, before discussing anything else.\n"
    "- You are concrete and quantitative, you avoid hedging filler, and you never "
    "repeat back numbers the user can already see without adding meaning to them."
)


def _format_user_context(analytics: Optional[Dict[str, Any]]) -> str:
    """Render the user's own track record for the prompt.

    This is what turns a generic options chatbot into something worth renewing
    for. Without it the assistant can only restate the payoff diagram; with it
    it can say "this is your fifth short-vol position this month and the last
    four lost money in the same volatility regime" — a thing no generic tool
    can tell them.
    """
    if not analytics or not analytics.get("closed_trades"):
        return "\n\nTrader's own record: no closed trades logged yet — do not speculate about their habits."

    lines = [
        "\n\nTrader's OWN record (from their journal — use it, this is the part they can't get elsewhere):",
        f"- Closed trades: {analytics.get('closed_trades')} · win rate {analytics.get('win_rate')}%",
        f"- Expectancy {analytics.get('expectancy')} per trade · profit factor {analytics.get('profit_factor')}",
        f"- Average R {analytics.get('avg_r')} (over {analytics.get('r_sample_size', 0)} trades with a defined stop)",
        f"- Max drawdown {analytics.get('max_drawdown_pct')}%",
    ]
    if analytics.get("annualized"):
        lines.append(f"- Sharpe {analytics.get('sharpe_ratio')} annualized "
                     f"(~{analytics.get('trades_per_year')} trades/year)")
    biases = analytics.get("behavioral_biases") or []
    if biases:
        lines.append("- Behavioural patterns already detected in their history: "
                     + ", ".join(f"{b.get('code')} ({b.get('severity')})" for b in biases[:4]))
    by_setup = [s for s in (analytics.get("by_setup") or []) if s.get("n", 0) >= 3][:4]
    if by_setup:
        lines.append("- By setup: " + "; ".join(
            f"{s['group']}: {s['n']} trades, {s['win_rate']}% win, {s['pnl']} P&L" for s in by_setup))
    exc = analytics.get("excursion") or {}
    if exc.get("available") and exc.get("winners_mae_p80") is not None:
        lines.append(f"- MAE: 80% of their winners never went more than "
                     f"{exc['winners_mae_p80']}R against them")
    return "\n".join(lines)


def _build_ai_trade_prompt(req: "AITradeAnalysisRequest",
                           analytics: Optional[Dict[str, Any]] = None) -> str:
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

    max_profit_str = "UNLIMITED" if req.stats.get("isMaxProfitUnlimited") else f"${req.stats.get('maxProfit', 0)}"
    max_loss_str = "UNLIMITED" if req.stats.get("isMaxLossUnlimited") else f"${req.stats.get('maxLoss', 0)}"

    language = _AI_COACH_LANGUAGES.get((req.locale or "es")[:2].lower(), "Spanish")
    user_context = _format_user_context(analytics)
    synthetic_note = (
        "\n⚠️ The premiums and implied volatility below come from a MODELLED "
        "chain, not from market quotes. Say so in your first line and treat the "
        "whole analysis as an exercise.\n"
        if req.synthetic else ""
    )

    return f"""Analyse the following options position.
{synthetic_note}

Underlying: {req.symbol} @ ${req.stockPrice:.2f}
Days to expiry: {req.daysToExpiry}

Legs:
{chr(10).join(['  - ' + leg for leg in legs_lines])}

Position metrics:
- Max profit: {max_profit_str}
- Max loss: {max_loss_str}
- POP: {req.stats.get('pop', '—')}%
- ROI: {req.stats.get('roi', '—')}%
- R/R: {req.stats.get('rr', '—')}
- Capital required: ${req.stats.get('capitalRequired', 0)}{greeks_str}{iv_str}{balance_str}{user_context}

Write your analysis in {language}, in Markdown, with EXACTLY this structure:

**✅ What works**
- (2-3 concrete bullets)

**⚠️ Main risks**
- (2-3 concrete bullets. If max loss is UNLIMITED or exceeds the trader's
  available capital, that has to be the first bullet, stated plainly.)

**🔍 What your own history says**
- (1-2 bullets connecting THIS position to the trader's record above — a setup
  that has or hasn't worked for them, a bias this trade would repeat, a
  drawdown this size of position would cause. If they have no logged history,
  say so in one line instead of guessing.)

**💡 Things to weigh**
- (2-3 specific structural alternatives — different strikes, fewer contracts, a
  defined-risk version of the same thesis, a hedge — framed as trade-offs to
  consider, never as instructions to place.)

**📊 Read**
One sentence on whether the structure matches the stated thesis, and the single
biggest thing that would have to be true for it to work.

Be direct and quantitative. Do not restate numbers the trader can already see —
explain what they IMPLY. Maximum 280 words."""


@api_router.post("/options/ai-analyze")
@limiter.limit("10/minute")
async def ai_analyze_trade(request: Request, req: AITradeAnalysisRequest, user: dict = Depends(require_user)) -> Dict[str, Any]:
    if not check_premium(user):
        raise HTTPException(status_code=403, detail="Esta función requiere una suscripción premium")
    """AI-powered options trade coach using Claude via Anthropic SDK."""
    try:
        import anthropic as _anthropic
        import asyncio as _asyncio
        api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI key not configured")

        client = _anthropic.Anthropic(api_key=api_key)

        # The coach is only worth its price if it analyses the USER, not just the
        # payoff diagram. Pull their own journal analytics into the prompt; a
        # failure here degrades the answer but must never fail the request.
        analytics: Optional[Dict[str, Any]] = None
        try:
            rows = await trades_for_user(db, user["id"], limit=500)
            if rows:
                enriched: List[dict] = []
                seen: List[dict] = []
                for t in sort_trades_chronologically(rows):
                    e = _enrich_trade(t, prev_trades=list(seen))
                    enriched.append(e)
                    seen.append(e)
                analytics = compute_analytics(enriched)
        except Exception as ctx_err:  # noqa: BLE001
            logging.warning(f"AI coach: could not load trader context: {ctx_err}")

        prompt = _build_ai_trade_prompt(req, analytics)
        model = os.environ.get("AI_COACH_MODEL", "claude-sonnet-4-5-20250929")
        message = await _asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.messages.create(
                model=model,
                max_tokens=1024,
                system=AI_COACH_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            ),
        )
        return {
            "analysis": message.content[0].text,
            "model": model,
            "usedTraderContext": bool(analytics and analytics.get("closed_trades")),
            # Shown at the point of use, not just in the footer.
            "disclaimer": (
                "AI-generated analysis, not investment advice. It describes the "
                "structure of a position you built; it does not recommend trading it."
            ),
        }
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
                           exp: Dict[str, Any], stock: Dict[str, Any],
                           ratio: Optional[float]) -> Dict[str, Any]:
    """Slimmer flow row used by the market-wide scan (skips bid/ask/last)."""
    vol = opt.get("volume", 0) or 0
    return {
        "symbol": sym, "stockPrice": stock["price"],
        "type": side, "strike": row["strike"],
        "expiration": exp["fullLabel"], "daysToExpiry": exp["daysToExpiry"],
        "volume": vol, "openInterest": opt.get("openInterest", 0) or 0,
        "ratio": round(ratio, 2) if ratio is not None else None,
        "oiUnavailable": ratio is None,
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
            ratio = _volume_oi_ratio(vol, oi)
            if ratio is not None and ratio < min_ratio:
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
@limiter.limit("20/minute")
async def market_wide_flow(request: Request, min_ratio: float = 3.0, min_volume: int = 300, max_results: int = 30, user: dict = Depends(require_user)) -> Dict[str, Any]:
    """Scan popular tickers for unusual options activity (market-wide flow)."""
    try:
        # Each _scan_ticker_flow does several blocking yfinance calls (quote +
        # option chains). Run the whole scan in a thread to avoid blocking the
        # event loop for the duration of the market-wide sweep.
        def _scan_all() -> List[Dict[str, Any]]:
            flow: List[Dict[str, Any]] = []
            for sym in MARKET_FLOW_TICKERS:
                flow.extend(_scan_ticker_flow(sym, min_ratio, min_volume))
            return flow

        loop = asyncio.get_event_loop()
        all_flow = await loop.run_in_executor(None, _scan_all)
        all_flow.sort(key=lambda x: x["estNotional"], reverse=True)
        return {
            "scannedTickers": len(MARKET_FLOW_TICKERS),
            "totalFound": len(all_flow),
            "withoutOpenInterest": sum(1 for r in all_flow if r.get("oiUnavailable")),
            "oiNote": OI_STALENESS_NOTE,
            "results": all_flow[:max_results],
        }
    except Exception as e:
        logging.error(f"Market flow error: {e}")
        return {"error": str(e), "results": []}


# ========== EDUCATION: Live Pattern Detector ==========
# The legal (interval, range) pairs live in timeframes.py — Yahoo refuses most
# combinations and answers with something our reader turns into "no rows",
# which used to reach the UI as "no structure detected". See that module.


def _scan_window(interval: Optional[str], period: Optional[str]) -> Dict[str, Any]:
    """Resolve the requested timeframe and describe it for the response."""
    tf, rng, adjustments = timeframes.resolve(interval, period)
    return {"tf": tf, "range": rng, "adjustments": adjustments}


def _bar_is_forming(rows: List[dict], minutes: int) -> bool:
    """True when the last bar has not closed yet.

    An unclosed bar keeps moving, so anything derived from it (a break, a new
    swing, the level it is 'confirming') can un-happen. The scanner still uses
    it — that is where the live price is — but the client is told, so it can
    stop presenting a provisional break as a fact.
    """
    if not rows or minutes <= 0:
        return False
    last_ts = rows[-1].get("ts")
    if not last_ts:
        return False
    return (time.time() - float(last_ts)) < minutes * 60


def _mark_provisional(res: Dict[str, Any], forming: bool, last_index: int) -> None:
    """Flag structure items that sit on a bar which has not closed yet.

    A break of structure "confirmed" by a candle still in progress can un-happen
    before the close — the level is only broken while the price stays there. The
    response already carried one `lastBarForming` boolean, but a client showing
    a list of events had no way to know WHICH of them was the provisional one.
    Mutates in place; every item in these lists carries its bar `index`.
    """
    for key in ("swings", "events", "fvgs", "breakouts"):
        for item in res.get(key) or []:
            if isinstance(item, dict):
                item["provisional"] = bool(forming and item.get("index") == last_index)


def _trim_structure(res: Dict[str, Any]) -> Dict[str, Any]:
    """Bound the arrays before they go over the wire.

    A month of 5-minute candles is ~1 600 bars, which yields hundreds of swing
    points, structure events and FVGs. `counts` already carries the totals, and
    the UI renders at most a handful of each, so shipping the full lists is
    pure weight on a mobile connection. Newest entries are kept (levels are
    already sorted nearest-price-first, so those keep the head).
    """
    caps = {"swings": 120, "events": 120, "fvgs": 40, "breakouts": 60, "levels": 24}
    for key, cap in caps.items():
        rows = res.get(key)
        if isinstance(rows, list) and len(rows) > cap:
            res[key] = rows[:cap] if key == "levels" else rows[-cap:]
            res.setdefault("truncated", {})[key] = len(rows)
    return res


@api_router.get("/education/scan-timeframes")
async def education_scan_timeframes() -> Dict[str, Any]:
    """The timeframe ladder the scanners accept, so the UI never offers a pair
    the upstream provider will refuse."""
    return {"timeframes": timeframes.ladder(), "defaultInterval": timeframes.DEFAULT_INTERVAL}


@api_router.get("/education/pattern-catalog")
async def education_pattern_catalog() -> Dict[str, Any]:
    """Full candlestick encyclopedia: every pattern with behavior, reliability
    rate and overall rank (strongest first). Names are localized on the client."""
    return {"patterns": get_pattern_catalog()}


@api_router.get("/education/pattern-scan/{symbol}")
@limiter.limit("30/minute")
async def education_pattern_scan(
    request: Request, symbol: str, period: str = "3mo", interval: str = "1d", limit: int = 30,
) -> Dict[str, Any]:
    """Scan real OHLC for the given ticker and return canonical candlestick
    pattern detections (educational view), enriched with reliability stats."""
    sym = symbol.upper().strip()
    win = _scan_window(interval, period)
    tf, rng = win["tf"], win["range"]
    try:
        # Direct Yahoo chart API (curl_cffi) — yfinance is blocked from Cloud Run.
        rows = await asyncio.to_thread(get_ohlc_history, sym, rng, tf.fetch_interval)
        rows = timeframes.resample(rows, tf.bucket_minutes)
        if not rows:
            return {"symbol": sym, "period": rng, "interval": tf.interval,
                    "adjustments": win["adjustments"],
                    "rowsScanned": 0, "totalDetections": 0, "detections": []}
        detections = detect_all_patterns(rows)
        forming = _bar_is_forming(rows, tf.minutes)
        last_index = len(rows) - 1
        # Cada detección se marca con la temporalidad en la que se encontró. Sin
        # esto el cliente no puede distinguir un patrón de 15m de uno diario, y
        # el registro persistente los mezclaba: el usuario veía "3 soldados",
        # miraba su gráfico y no estaban, porque eran de otra temporalidad.
        for det in detections:
            det["interval"] = tf.interval
            # A pattern whose last candle has not closed yet can un-happen on
            # the next tick: the body is still moving, so the shape that
            # matched may not be there in a minute. The response already
            # carried a single `lastBarForming` flag for the whole payload, but
            # the client had no way to tell WHICH detection was the provisional
            # one — so a hammer on an unclosed bar was rendered exactly like a
            # confirmed one.
            det["provisional"] = bool(forming and det.get("index") == last_index)
        # Most recent first, capped at `limit`.
        detections.reverse()
        return {
            "symbol": sym,
            "period": rng,
            "interval": tf.interval,
            "intraday": tf.intraday,
            "adjustments": win["adjustments"],
            "lastBarForming": _bar_is_forming(rows, tf.minutes),
            "rowsScanned": len(rows),
            "totalDetections": len(detections),
            "detections": detections[:limit],
        }
    except Exception as e:
        logging.error(f"Pattern scan error for {sym}: {e}")
        return {"symbol": sym, "error": str(e), "detections": []}


@api_router.get("/education/structure-scan/{symbol}")
@limiter.limit("30/minute")
async def education_structure_scan(
    request: Request, symbol: str, period: Optional[str] = None,
    interval: Optional[str] = None, strength: Optional[int] = None,
) -> Dict[str, Any]:
    """Scan real OHLC and return the PRICE-ACTION STRUCTURE: swing highs/lows,
    market structure (HH/HL/LH/LL → trend), Break of Structure / Change of
    Character, support/resistance levels (above price = resistance, below =
    support) and Fair Value Gaps — on any rung of the timeframe ladder.

    `strength` (fractal half-window) defaults to the rung's own value: a
    2-bar fractal is right on daily bars and far too twitchy on 5-minute ones.
    """
    sym = symbol.upper().strip()
    win = _scan_window(interval, period)
    tf, rng = win["tf"], win["range"]
    strn = tf.strength if strength is None else max(1, min(5, int(strength)))
    meta = {"symbol": sym, "period": rng, "interval": tf.interval,
            "intraday": tf.intraday, "strength": strn,
            # Cuando la vela se compone (4h a partir de 1h) el cliente debe
            # poder decirlo: no es lo mismo que un dato servido de origen.
            "aggregatedFrom": tf.source_interval,
            "adjustments": win["adjustments"]}
    try:
        # 4h no lo sirve el proveedor: se pide en 1h y se compone aquí.
        rows = await asyncio.to_thread(get_ohlc_history, sym, rng, tf.fetch_interval)
        rows = timeframes.resample(rows, tf.bucket_minutes)
        if not rows:
            return {**meta, "rowsScanned": 0, "trend": "range",
                    "swings": [], "events": [], "levels": [], "fvgs": []}
        # The support/resistance split is decided against a reference price, and
        # the last bar's close is not "the price now" once the session is over.
        # Fetch the live quote so the split answers the question the panel is
        # actually asking; a failure here is not fatal — detect_structure falls
        # back to the last close and says so in `referenceSource`.
        live_price = None
        try:
            quote = await asyncio.to_thread(get_stock_data, sym)
            live_price = quote.get("price")
        except Exception as quote_err:  # noqa: BLE001
            logging.info(f"structure-scan: no live quote for {sym}: {quote_err}")

        res = await asyncio.to_thread(detect_structure, rows, strn, None, live_price)
        forming = _bar_is_forming(rows, tf.minutes)
        _mark_provisional(res, forming, len(rows) - 1)
        return {**meta, "lastBarForming": forming, **_trim_structure(res)}
    except Exception as e:
        logging.error(f"Structure scan error for {sym}: {e}")
        return {**meta, "error": "scan_failed", "trend": "range",
                "swings": [], "events": [], "levels": [], "fvgs": []}


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
    # Maximum adverse / favourable excursion: the worst and best price the
    # trade reached while it was open. Optional, but they are what powers the
    # stop/target calibration analysis.
    mae_price: Optional[float] = None
    mfe_price: Optional[float] = None
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
    # Instrument: 'spot' (acciones/cripto/forex/futuros — comportamiento clásico)
    # u 'option'. En opciones, entry/exit_price = prima por acción, quantity =
    # nº de contratos, multiplier = tamaño del contrato (100 en opciones sobre acciones).
    instrument_type: Optional[str] = Field("spot", pattern="^(spot|option)$")
    option_type: Optional[str] = Field(None, pattern="^(call|put)$")
    strike: Optional[float] = None
    expiry: Optional[str] = None
    multiplier: Optional[float] = 1


def _enrich_trade(trade: dict, prev_trades: Optional[List[dict]] = None,
                  plan: Optional[dict] = None) -> dict:
    """Compute pnl + errors. Output is JSON-safe (no _id).

    `plan` is the user's active trading plan. Callers that have it should pass
    it, so the trade is judged against the user's own thresholds instead of the
    module defaults; callers that don't get exactly the legacy behaviour.
    """
    enriched = compute_trade_pnl(trade)
    enriched["errors"] = detect_errors(enriched, plan=plan, prev_trades=prev_trades)
    enriched.pop("_id", None)
    return enriched


@api_router.post("/performance/trades")
async def perf_create_trade(payload: TradeIn, user: dict = Depends(require_premium)):
    user_id = user["id"]
    prev = await trades_for_user(db, user_id, limit=50)
    plan = await get_active_plan(db, user_id)
    doc = make_trade_doc(payload.model_dump(), user_id)
    # Stamped at creation and never rewritten: a later plan change must not
    # retroactively re-judge the history it is supposed to be measured against.
    if plan:
        doc["plan_version"] = plan.get("version")
    enriched = _enrich_trade(doc, prev_trades=prev, plan=plan)
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
    user: dict = Depends(require_premium),
):
    """Import multiple trades at once. Returns imported count + any rejected rows.

    Each row is enriched and saved individually so a single bad row doesn't
    block the rest of the import.
    """
    user_id = user["id"]
    imported, failed = [], []
    # Fetch once; don't re-fetch inside the loop.
    prev = await trades_for_user(db, user_id, limit=100)
    bulk_plan = await get_active_plan(db, user_id)
    for i, payload_item in enumerate(payload.trades):
        try:
            doc = make_trade_doc(payload_item.model_dump(), user_id)
            if bulk_plan:
                doc["plan_version"] = bulk_plan.get("version")
            enriched = _enrich_trade(doc, prev_trades=prev, plan=bulk_plan)
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
    user: dict = Depends(require_premium),
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
    plan = await get_active_plan(db, user["id"])
    # Re-enrich on each fetch so updates to detection rules apply retroactively
    enriched_rows = []
    seen: List[dict] = []
    for t in reversed(rows):  # chronological order for prev_trades context
        enriched_rows.append(_enrich_trade(t, prev_trades=list(seen), plan=plan))
        seen.append(enriched_rows[-1])
    enriched_rows.reverse()
    return {"trades": enriched_rows, "count": len(enriched_rows)}


@api_router.get("/performance/trades/{trade_id}")
async def perf_get_trade(trade_id: str, user: dict = Depends(require_premium)):
    t = await db.trades.find_one(
        {"id": trade_id, "user_id": user["id"]},
        {"_id": 0},
    )
    if not t:
        raise HTTPException(status_code=404, detail="Trade not found")
    prev = await trades_for_user(db, user["id"], limit=50)
    plan = await get_active_plan(db, user["id"])
    return _enrich_trade(t, prev_trades=prev, plan=plan)


@api_router.put("/performance/trades/{trade_id}")
async def perf_update_trade(trade_id: str, payload: TradeIn, user: dict = Depends(require_premium)):
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
async def perf_delete_trade(trade_id: str, user: dict = Depends(require_premium)):
    res = await db.trades.delete_one({"id": trade_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"ok": True}


class BacktestRequest(BaseModel):
    """Backtest a rule set over real daily history."""
    symbol: str
    strategy: str = Field(..., pattern="^(sma_cross|rsi_reversion|breakout)$")
    period: str = "5y"
    mode: str = Field("validated", pattern="^(single|validated|walk_forward)$")
    params: Optional[Dict[str, Any]] = None
    initialCapital: float = 10000
    riskPct: float = 1.0
    # Costs are parameters with non-zero defaults, never optional extras: a
    # strategy that only works at zero cost does not work.
    commissionPct: float = 0.05
    slippagePct: float = 0.05
    stopAtrMultiple: float = 2.0
    targetAtrMultiple: float = 4.0
    allowShort: bool = False
    oosFraction: float = 0.3
    windows: int = 5


@api_router.post("/backtest/validate")
@limiter.limit("20/minute")
async def run_validated_backtest_endpoint(request: Request, req: BacktestRequest,
                                          user: dict = Depends(require_premium)) -> Dict[str, Any]:
    """Backtest a system, with the validation that decides if the result means anything.

    Distinct from the older `POST /backtest`, which runs a single pass with one
    fixed parameter set. What is added here is the part that answers "does this
    have an edge, or did I find it by looking hard enough":

    * `validated` holds a slice of history back from the parameter search and
      evaluates on it exactly once.
    * `walk_forward` re-optimises on a rolling basis, which is the closest thing
      to how the system would actually have been traded.

    Both report a data-snooping correction, because every parameter combination
    tried is another chance to find something that looks good by luck.
    """
    from backtest import (
        BacktestConfig, run_backtest, run_validated_backtest, walk_forward, STRATEGIES,
    )

    history = await asyncio.to_thread(get_ohlc_history, req.symbol, req.period, "1d")
    if not history or len(history) < 200:
        return {
            "error": f"Not enough daily history for {req.symbol} "
                     f"({len(history or [])} bars). At least 200 are needed.",
            "bars": len(history or []),
        }

    bars = [
        {
            "date": b.get("date") or b.get("time") or str(i),
            "open": float(b.get("open") or b.get("close") or 0),
            "high": float(b.get("high") or b.get("close") or 0),
            "low": float(b.get("low") or b.get("close") or 0),
            "close": float(b.get("close") or 0),
        }
        for i, b in enumerate(history)
    ]
    bars = [b for b in bars if b["close"] > 0 and b["open"] > 0]

    cfg = BacktestConfig(
        initial_capital=req.initialCapital, risk_pct=req.riskPct,
        commission_pct=req.commissionPct, slippage_pct=req.slippagePct,
        stop_atr_multiple=req.stopAtrMultiple, target_atr_multiple=req.targetAtrMultiple,
        allow_short=req.allowShort,
    )

    if req.mode == "single":
        params = req.params or STRATEGIES[req.strategy]["defaults"]
        result = await asyncio.to_thread(run_backtest, bars, req.strategy, params, cfg)
    elif req.mode == "walk_forward":
        result = await asyncio.to_thread(walk_forward, bars, req.strategy, cfg,
                                         windows=req.windows)
    else:
        result = await asyncio.to_thread(run_validated_backtest, bars, req.strategy, cfg,
                                         oos_fraction=req.oosFraction)

    result["symbol"] = req.symbol.upper()
    result["mode"] = req.mode
    result["bars_used"] = len(bars)
    result["disclaimer"] = (
        "Past performance on historical data is not a prediction. This backtest "
        "assumes fills at the next bar's open with the stated commission and "
        "slippage; real execution, liquidity and gaps will differ."
    )
    return result


@api_router.get("/backtest/strategies")
async def list_backtest_strategies() -> Dict[str, Any]:
    """The rule sets available to backtest, with their parameter grids."""
    from backtest import STRATEGIES

    return {
        "strategies": [
            {"id": sid, "defaults": spec["defaults"], "grid": spec["grid"],
             "combinations": len(list(__import__("itertools").product(*spec["grid"].values())))}
            for sid, spec in STRATEGIES.items()
        ]
    }


class PortfolioRiskQuery(BaseModel):
    """User-defined circuit breakers, from their own trading system rules."""
    accountBalance: Optional[float] = None
    maxDailyLossPct: Optional[float] = None
    maxWeeklyLossPct: Optional[float] = None
    correlation: Optional[float] = None


@api_router.post("/performance/portfolio-risk")
async def performance_portfolio_risk(req: PortfolioRiskQuery,
                                     user: dict = Depends(require_premium)):
    """Account-level risk: open heat, correlation, and the loss-limit state.

    Everything else in the journal reasons trade by trade. This is the view a
    prop trader checks first: how much of the account is at risk right now, how
    much of that risk is really the same bet held several times, and whether the
    day's or week's loss limit has already been hit.
    """
    from portfolio_risk import compute_open_heat, compute_loss_limits

    rows = await trades_for_user(db, user["id"], limit=1000)
    enriched = [_enrich_trade(t) for t in sort_trades_chronologically(rows)]

    open_positions = [t for t in enriched if (t.get("status") or "open") == "open"]
    closed = [t for t in enriched
              if t.get("status") in ("closed", "sl_hit", "tp_hit")
              and t.get("exit_price") is not None]

    # Balance: explicit override, else the most recent trade's recorded balance.
    balance = req.accountBalance
    if balance is None:
        with_balance = [t for t in enriched if t.get("account_balance")]
        balance = float(with_balance[-1]["account_balance"]) if with_balance else 0.0

    heat = compute_open_heat(open_positions, balance, correlation=req.correlation)
    limits = compute_loss_limits(
        closed, balance,
        max_daily_loss_pct=req.maxDailyLossPct,
        max_weekly_loss_pct=req.maxWeeklyLossPct,
    )
    return {"heat": heat, "limits": limits}


class VolSizeRequest(BaseModel):
    accountBalance: float
    riskPct: float
    atr: float
    atrMultiple: Optional[float] = 2.0
    price: Optional[float] = None
    contractMultiplier: Optional[float] = 1.0


@api_router.post("/calculate/volatility-size")
async def calculate_volatility_size(req: VolSizeRequest) -> Dict[str, Any]:
    """Position size from the instrument's own volatility (ATR), not a fixed %.

    A 1% stop is a different bet on an index future than on an altcoin. Sizing
    off ATR is what makes 1R mean the same thing across instruments — without
    it, per-trade R statistics are not comparable at all.
    """
    from portfolio_risk import volatility_adjusted_size

    return volatility_adjusted_size(
        req.accountBalance, req.riskPct, req.atr,
        atr_multiple=req.atrMultiple or 2.0,
        price=req.price,
        contract_multiplier=req.contractMultiplier or 1.0,
    )


@api_router.get("/performance/analytics")
async def performance_analytics(user: dict = Depends(require_premium)):
    rows = await trades_for_user(db, user["id"], limit=1000)
    # One plan lookup for the whole request: every trade is judged against the
    # same active version, and the query does not repeat per row.
    plan = await get_active_plan(db, user["id"])
    # Re-enrich to get fresh errors and pnl. Enrichment is order-sensitive
    # (revenge-trade detection needs the trades that preceded each one), so walk
    # the history oldest-first explicitly rather than relying on the fetch order.
    enriched: List[dict] = []
    seen: List[dict] = []
    for t in sort_trades_chronologically(rows):
        e = _enrich_trade(t, prev_trades=list(seen), plan=plan)
        enriched.append(e)
        seen.append(e)
    risk_free = await asyncio.to_thread(get_risk_free_rate)
    analytics = compute_analytics(enriched, risk_free_rate=risk_free)
    insights = generate_insights(analytics)
    return {
        "analytics": analytics,
        "insights": insights,
        # So the panel can say WHOSE rules produced those errors, and offer to
        # write a plan to anyone still being judged by the defaults.
        "plan": {"version": plan.get("version"), "name": plan.get("name")} if plan else None,
        "compliance": compliance_report(enriched, plan) if plan else None,
    }



# ============= TRADING PLAN =============
# The plan is the user's own rulebook, versioned. Everything that used to judge
# a trade against module-level constants now reads from here — see
# `trading_plan.py` for why that distinction matters.


class PlanRiskIn(BaseModel):
    """Risk limits. Only the first two have defaults; the rest are opt-in.

    A limit left as None means "not declared" and its rule stays silent. It must
    never be coerced to 0, which would read as a limit of zero and bury the user
    in violations of rules they never wrote.
    """
    max_risk_pct_per_trade: Optional[float] = Field(None, gt=0, le=100)
    min_rr: Optional[float] = Field(None, gt=0, le=100)
    max_daily_loss_r: Optional[float] = Field(None, gt=0)
    max_weekly_loss_r: Optional[float] = Field(None, gt=0)
    max_consecutive_losses: Optional[int] = Field(None, gt=0, le=100)
    max_trades_per_day: Optional[int] = Field(None, gt=0, le=500)
    max_open_risk_r: Optional[float] = Field(None, gt=0)
    max_correlated_positions: Optional[int] = Field(None, gt=0, le=100)
    require_stop_loss: Optional[bool] = True


class PlanSessionIn(BaseModel):
    days: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5])
    start: str = "09:00"
    end: str = "17:00"
    tz: str = "UTC"


class PlanIn(BaseModel):
    """A trading plan as submitted by the wizard. Shape only — `trading_plan`
    does the clamping, so a partially filled draft is always storable."""
    name: Optional[str] = None
    style: Optional[str] = None
    markets: Optional[List[str]] = None
    sessions: Optional[List[PlanSessionIn]] = None
    timeframes: Optional[Dict[str, Any]] = None
    approaches: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    entry_rules: Optional[List[str]] = None
    invalidation: Optional[str] = None
    no_trade_conditions: Optional[List[str]] = None
    risk: Optional[PlanRiskIn] = None
    management: Optional[Dict[str, Any]] = None
    review: Optional[Dict[str, Any]] = None
    change_reason: Optional[str] = Field(None, max_length=500)


@api_router.get("/plan")
async def plan_get_active(user: dict = Depends(require_user)):
    """The active plan. 404 when the user has never written one."""
    plan = await get_active_plan(db, user["id"])
    if not plan:
        raise HTTPException(status_code=404, detail="No active trading plan")
    return plan


@api_router.get("/plan/history")
async def plan_get_history(user: dict = Depends(require_user)):
    """Every version, newest first, each with how many trades it governed.

    The trade count is what makes the history readable: a version with 4 trades
    under it was abandoned before it could say anything, and that is visible
    here rather than having to be inferred.
    """
    versions = await list_plan_versions(db, user["id"])
    out = []
    for version in versions:
        out.append({
            **version,
            "trades_under_plan": await count_trades_under_version(
                db, user["id"], version.get("version")),
        })
    return {"versions": out, "count": len(out)}


@api_router.post("/plan")
async def plan_create_version(payload: PlanIn, user: dict = Depends(require_user)):
    """Create v1, or a new version, and activate it (archiving the previous).

    From v2 onward `change_reason` is required — a 422, not a silent default.
    Plans rarely get abandoned outright; they get eroded one unrecorded
    exception at a time, and having to type a sentence is the cheapest brake.
    """
    raw = payload.model_dump(exclude_none=False)
    try:
        plan, warning = await activate_plan(
            db, user["id"], raw, change_reason=payload.change_reason or "")
    except ValueError as exc:
        if str(exc) == "change_reason_required":
            raise HTTPException(
                status_code=422,
                detail="A change reason is required when replacing an existing plan",
            )
        raise
    # 200 with a warning, never a 4xx: changing the plan early is the user's
    # call. What matters is that the call is recorded and visible.
    return {"plan": plan, "warning": warning}


@api_router.patch("/plan/draft")
async def plan_save_draft(payload: PlanIn, user: dict = Depends(require_user)):
    """Save the work-in-progress plan without activating it.

    Lets the 5-step wizard survive a reload without the half-written plan
    starting to govern anything.
    """
    draft = await save_draft(db, user["id"], payload.model_dump(exclude_none=False))
    return {"draft": draft}


@api_router.get("/plan/compliance")
async def plan_get_compliance(user: dict = Depends(require_premium)):
    """Adherence to the active plan, costed by rule."""
    plan = await get_active_plan(db, user["id"])
    if not plan:
        raise HTTPException(status_code=404, detail="No active trading plan")
    rows = await trades_for_user(db, user["id"], limit=1000)
    enriched: List[dict] = []
    seen: List[dict] = []
    for t in sort_trades_chronologically(rows):
        e = _enrich_trade(t, prev_trades=list(seen), plan=plan)
        enriched.append(e)
        seen.append(e)
    return compliance_report(enriched, plan)


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


# ── admin_routes.py feature router — registered HERE (before server.py admin stubs)
# so its handlers take precedence for overlapping paths (FastAPI first-match wins).
# server.py admin routes below are kept for routes not yet in admin_routes.py.
try:
    from admin_routes import build_admin_router as _build_admin_router
    api_router.include_router(
        _build_admin_router(
            db=db,
            require_admin_dep=require_admin,
            subscription_plans=SUBSCRIPTION_PLANS,
            log_admin_action_fn=log_admin_action,
        ),
        prefix="/admin",
    )
    logging.info("✅ admin_routes registered (campaigns, i18n, connectors, maintenance, cohorts, referrals-leaderboard, gdpr)")
except Exception as _e:
    logging.error(f"admin_routes early registration error: {_e}", exc_info=True)


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
        pattern = _literal_regex(q.strip())
        query["$or"] = [
            {"email": {"$regex": pattern, "$options": "i"}},
            {"name":  {"$regex": pattern, "$options": "i"}},
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

    # MRR — monthly equivalent of each plan's price using SUBSCRIPTION_PLANS (real prices)
    plan_mrr = {
        pid: (plan["price"] / (plan["days"] / 30) if plan["days"] < 36500 else 0)
        for pid, plan in SUBSCRIPTION_PLANS.items()
    }
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
        "password": await hash_password_async(payload.password),
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
            "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() in _ADMIN_EMAILS,
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
            "password": await hash_password_async(payload.new_password),
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
    # Revolut (Revolut Pay + Apple/Google Pay) — sandbox flag public, keys secret
    "revolut_sandbox",            # "true" | "false"
    # NOWPayments (crypto, non-custodial) — sandbox flag public, keys secret
    "nowpayments_sandbox",        # "true" | "false"
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
    "coinbase_api_key",           # legacy/unused — superseded by OxaPay
    "revolut_api_key",            # Revolut Merchant Secret API key
    "revolut_webhook_secret",     # Revolut webhook signing secret (separate from the API key)
    "nowpayments_api_key",        # NOWPayments API key
    "nowpayments_ipn_secret",     # NOWPayments IPN secret (signs the webhook)
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
    "revolut_api_key":        "REVOLUT_API_KEY",
    "revolut_webhook_secret": "REVOLUT_WEBHOOK_SECRET",
    "revolut_sandbox":        "REVOLUT_SANDBOX",
    "nowpayments_api_key":    "NOWPAYMENTS_API_KEY",
    "nowpayments_ipn_secret": "NOWPAYMENTS_IPN_SECRET",
    "nowpayments_sandbox":    "NOWPAYMENTS_SANDBOX",
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
    revolut_api_key: Optional[str] = None
    revolut_webhook_secret: Optional[str] = None
    revolut_sandbox: Optional[str] = None
    nowpayments_api_key: Optional[str] = None
    nowpayments_ipn_secret: Optional[str] = None
    nowpayments_sandbox: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    trustpilot_business_id: Optional[str] = None
    clarity_project_id: Optional[str] = None


async def _load_settings_doc() -> Dict[str, Any]:
    doc = await db.app_settings.find_one({"_id": "global"}) or {}
    doc.pop("_id", None)
    return doc


# ── Symmetric encryption for secrets stored in DB (Fernet / AES-128-CBC) ───
# Set SECRET_ENCRYPTION_KEY in env (generate once: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
# Without this key, secrets fall back to plaintext — functional but not encrypted at application level.
# GCP Cloud SQL still encrypts at rest; this adds an extra layer.

_ENC_PREFIX = "fernet:"

def _get_fernet():
    key = os.environ.get("SECRET_ENCRYPTION_KEY", "").strip()
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(key.encode())
    except Exception as _e:
        logging.warning(f"[settings] Fernet init failed: {_e}")
        return None

def _encrypt_setting(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if f:
        return _ENC_PREFIX + f.encrypt(value.encode()).decode()
    return value

def _decrypt_setting(value: str) -> str:
    if not value or not value.startswith(_ENC_PREFIX):
        return value
    f = _get_fernet()
    if f:
        try:
            return f.decrypt(value[len(_ENC_PREFIX):].encode()).decode()
        except Exception as _e:
            logging.warning(f"[settings] Fernet decrypt failed: {_e}")
    return value


async def get_setting(key: str) -> str:
    """Public helper: DB value first (auto-decrypted), env var fallback. Returns "" if both empty."""
    doc = await _load_settings_doc()
    raw = doc.get(key) or ""
    if raw:
        if key in SECRET_SETTING_KEYS:
            return _decrypt_setting(raw)
        return raw
    return os.environ.get(_SETTING_ENV_FALLBACK.get(key, ""), "") or ""


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
        stored = doc.get(k) or ""
        decrypted = _decrypt_setting(stored) if stored else ""
        raw = decrypted or os.environ.get(_SETTING_ENV_FALLBACK.get(k, ""), "") or ""
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
                cleaned[k] = _encrypt_setting(v)                 # encrypt at rest
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
    if target.get("is_admin") or target.get("email", "").lower() in _ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="No se puede impersonar a otro administrador")
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": target["id"],
        "type": "access",
        "jti": secrets.token_hex(16),
        "iat": now,
        "exp": now + timedelta(hours=1),
        "impersonated_by": admin["email"],
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    await log_admin_action(
        admin=admin,
        action="user.impersonate",
        target_id=target.get("id", ""),
        target_email=target.get("email", ""),
        details={"impersonated_by": admin["email"]},
        request=request,
    )
    _SENSITIVE = {"password", "password_hash"}
    return {"token": token, "user": {k: v for k, v in target.items() if k not in _SENSITIVE}}


# ── ADMIN REFUND ──────────────────────────────────────────────────────────────
@api_router.post("/admin/subscriptions/{user_id}/refund")
async def admin_refund_subscription(request: Request, user_id: str, admin: dict = Depends(require_admin)):
    """Process a Stripe refund for the user's most recent paid transaction."""
    transaction = await db.payment_transactions.find_one({"user_id": user_id, "status": "paid"})
    if not transaction:
        raise HTTPException(status_code=404, detail="No hay transacciones elegibles para reembolso")
    charge_id = transaction.get("charge_id") or transaction.get("stripe_charge_id")
    if not charge_id:
        raise HTTPException(status_code=400, detail="No se encontró charge_id para esta transacción")
    try:
        refund = await asyncio.to_thread(
            stripe.Refund.create, charge=charge_id, reason="requested_by_customer"
        )
        await db.payment_transactions.update_one(
            {"id": transaction["id"]},
            {"$set": {"status": "refunded", "refund_id": refund.id, "refunded_at": datetime.now(timezone.utc).isoformat()}},
        )
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_premium": False, "subscription_status": "refunded", "subscription_plan": None}},
        )
        await log_admin_action(
            admin=admin, action="subscription.refund",
            target_id=user_id, target_email=transaction.get("user_email", ""),
            details={"refund_id": refund.id, "amount": transaction.get("amount")},
            request=request,
        )
        return {"status": "refunded", "refund_id": refund.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Error de Stripe: {e}")


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

    # LTV per plan: plan price (one-payment average; no churn-adjusted history yet)
    ltv: Dict[str, float] = {
        plan_id: round(plan["price"], 2)
        for plan_id, plan in SUBSCRIPTION_PLANS.items()
    }

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
        "history": mrr_history,
        "churn": churn_rate,
        "conversion": conversion_rate,
        "ltv": ltv,
    }


# ── USAGE ANALYTICS ──────────────────────────────────────────────────────────
# ============================================================
#  PAYMENT RECONCILIATION  (M-40 / M-41)
# ============================================================
# The most expensive failure this product can have is silent: a customer pays,
# the webhook is lost or errors, and they never get premium. Nothing is logged
# as an error — Stripe has the money, the user has nothing, and the first signal
# is an angry email. These endpoints surface that state instead of waiting for
# the complaint.

async def _record_webhook_seen(provider: str) -> None:
    """Timestamp the last webhook received per provider. Never raises: a
    bookkeeping failure must not break payment processing."""
    try:
        await db.webhook_health.update_one(
            {"id": provider},
            {"$set": {"id": provider, "provider": provider,
                      "last_seen_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    except Exception as exc:  # noqa: BLE001
        logging.warning("[webhook-health] could not record %s: %s", provider, exc)


# A checkout older than this with no resolution is worth a human look. Long
# enough that a slow bank redirect or a crypto confirmation isn't flagged.
STALE_PENDING_HOURS = int(os.environ.get("PAYMENT_STALE_PENDING_HOURS", "6"))
WEBHOOK_SILENCE_HOURS = int(os.environ.get("PAYMENT_WEBHOOK_SILENCE_HOURS", "24"))


@api_router.get("/admin/payments/reconciliation")
async def admin_payment_reconciliation(admin: dict = Depends(require_admin)):
    """Cross-check money received against premium granted.

    Three discrepancies, in descending order of how much they cost:

      paid_not_premium  — we took the money and the user is NOT premium.
                          This is the one that loses customers. Fixable in one
                          click with /admin/payments/{id}/grant.
      stale_pending     — checkout started, never resolved. Either the user
                          abandoned it (harmless) or the webhook never arrived
                          (not harmless). Needs a human to tell them apart.
      premium_no_payment— premium with no paid transaction on record. Usually
                          legitimate (manual grant, comp account, trial) but
                          worth seeing, because it is also what a bug that
                          grants premium for free looks like.
    """
    now = datetime.now(timezone.utc)
    cutoff_pending = (now - timedelta(hours=STALE_PENDING_HOURS)).isoformat()

    txs = await db.payment_transactions.find({}, {"_id": 0}).to_list(20000)
    users = await db.users.find({}, {"_id": 0}).to_list(20000)
    by_id = {u.get("id"): u for u in users}

    paid_not_premium, stale_pending = [], []
    paid_user_ids = set()

    for tx in txs:
        status = (tx.get("status") or "").lower()
        user = by_id.get(tx.get("user_id"))

        if status in ("paid", "completed", "finished"):
            paid_user_ids.add(tx.get("user_id"))
            # check_premium() is the same helper the product uses, so this
            # cannot drift from what the customer actually experiences.
            if user and not check_premium(user):
                paid_not_premium.append({
                    "transaction_id": tx.get("id"),
                    "user_id": tx.get("user_id"),
                    "user_email": tx.get("user_email") or user.get("email"),
                    "plan_id": tx.get("plan_id"),
                    "amount": tx.get("amount"),
                    "currency": tx.get("currency"),
                    "payment_method": tx.get("payment_method"),
                    "paid_at": tx.get("paid_at") or tx.get("updated_at"),
                    "created_at": tx.get("created_at"),
                })
        elif status == "pending" and (tx.get("created_at") or "") < cutoff_pending:
            stale_pending.append({
                "transaction_id": tx.get("id"),
                "user_id": tx.get("user_id"),
                "user_email": tx.get("user_email"),
                "plan_id": tx.get("plan_id"),
                "amount": tx.get("amount"),
                "payment_method": tx.get("payment_method"),
                "created_at": tx.get("created_at"),
            })

    premium_no_payment = [
        {"user_id": u.get("id"), "email": u.get("email"),
         "subscription_plan": u.get("subscription_plan"),
         "subscription_end": u.get("subscription_end")}
        for u in users
        if check_premium(u)
        and u.get("id") not in paid_user_ids
        and u.get("subscription_plan") not in (None, "", "free", "trial")
    ]

    # Newest first: a discrepancy from an hour ago is more actionable than one
    # from six months ago.
    paid_not_premium.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    stale_pending.sort(key=lambda r: r.get("created_at") or "", reverse=True)

    return {
        "checked_at": now.isoformat(),
        "transactions_scanned": len(txs),
        "stale_pending_hours": STALE_PENDING_HOURS,
        "paid_not_premium": paid_not_premium[:200],
        "stale_pending": stale_pending[:200],
        "premium_no_payment": premium_no_payment[:200],
        "counts": {
            "paid_not_premium": len(paid_not_premium),
            "stale_pending": len(stale_pending),
            "premium_no_payment": len(premium_no_payment),
        },
    }


@api_router.post("/admin/payments/{transaction_id}/grant")
async def admin_payment_grant(
    transaction_id: str,
    request: Request,
    admin: dict = Depends(require_admin),
):
    """Grant the premium a paid transaction should already have granted.

    Safety rails, because this hands out paid product:
      * the transaction must exist AND be marked paid — this can never be used
        to comp an account, only to repair a payment that was actually taken;
      * it is a no-op if the user is already premium (idempotent, so retrying
        after a timeout cannot double-extend a subscription);
      * it goes through the same _activate_paid_subscription the webhooks use,
        so the resulting state is identical to a normal payment;
      * it is written to the admin audit log.
    """
    tx = await db.payment_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    if (tx.get("status") or "").lower() not in ("paid", "completed", "finished"):
        raise HTTPException(
            status_code=400,
            detail="Solo se puede conceder premium de una transacción pagada",
        )

    user = await db.users.find_one({"id": tx.get("user_id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if check_premium(user):
        return {"ok": True, "already_premium": True, "granted": False}

    plan_id = tx.get("plan_id")
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plan desconocido: {plan_id}")

    await _activate_paid_subscription(
        user_id=user["id"], plan_id=plan_id, plan=plan,
        transaction_id=tx.get("id"), session_id=f"admin-grant:{admin.get('email')}",
    )
    await log_admin_action(
        admin=admin, action="payment_grant", target_type="user",
        target_id=user["id"], target_email=user.get("email"),
        details={"transaction_id": transaction_id, "plan_id": plan_id,
                 "amount": tx.get("amount")},
        request=request,
    )
    logging.info("[reconciliation] admin %s granted %s to %s (tx %s)",
                 admin.get("email"), plan_id, user.get("email"), transaction_id)
    return {"ok": True, "already_premium": False, "granted": True, "plan_id": plan_id}


@api_router.get("/admin/payments/webhook-health")
async def admin_webhook_health(admin: dict = Depends(require_admin)):
    """Is each payment provider still talking to us?

    Silence is the signal: if there are active paying subscriptions but Stripe
    has sent nothing in 24 hours, renewals are almost certainly failing to
    register. That state is invisible in the logs because *nothing happening*
    produces no log line.
    """
    now = datetime.now(timezone.utc)
    rows = await db.webhook_health.find({}, {"_id": 0}).to_list(100)
    seen = {r.get("provider"): r.get("last_seen_at") for r in rows}

    users = await db.users.find({}, {"_id": 0}).to_list(20000)
    active_paid = sum(
        1 for u in users
        if check_premium(u) and u.get("subscription_plan") not in (None, "", "free", "trial", "lifetime")
    )

    providers = []
    for name in ("stripe", "revolut", "nowpayments", "paypal"):
        last = seen.get(name)
        hours = None
        if last:
            try:
                hours = round((now - datetime.fromisoformat(last)).total_seconds() / 3600, 1)
            except (TypeError, ValueError):
                hours = None
        providers.append({
            "provider": name,
            "last_seen_at": last,
            "hours_since": hours,
            # Only alarm when there is something to lose: no active
            # subscriptions means no expected traffic, so silence is normal.
            "alert": bool(active_paid > 0 and (last is None or (hours or 0) > WEBHOOK_SILENCE_HOURS)),
        })

    return {
        "checked_at": now.isoformat(),
        "active_paid_subscriptions": active_paid,
        "silence_threshold_hours": WEBHOOK_SILENCE_HOURS,
        "providers": providers,
        "any_alert": any(p["alert"] for p in providers),
    }


@api_router.get("/admin/market-data-health")
async def admin_market_data_health(admin: dict = Depends(require_admin)):
    """Health of the market-data providers: who is answering, who is failing,
    and whether any circuit is open.

    Every live price in the product depends on this chain, so when quotes start
    looking wrong this is the first place to look — it tells you *which*
    provider broke instead of leaving you guessing.
    """
    try:
        import market_data
    except Exception as exc:  # noqa: BLE001
        return {"available": False, "error": str(exc)}
    return {
        "available": True,
        "providers": market_data.provider_status(),
        "cache": market_data.cache_stats(),
    }


@api_router.get("/quote/{symbol}")
async def get_quote_with_failover(symbol: str):
    """Single quote through the multi-provider chain (Yahoo → Finnhub → Twelve
    Data → last known good).

    The response carries ``stale`` and ``as_of``: the UI MUST show when a price
    could not be refreshed. Showing an old price as if it were live is a legal
    problem on a finance site, not just a cosmetic one.
    """
    import market_data
    quote = await asyncio.to_thread(market_data.get_quote, symbol)
    if quote.get("price") is None:
        raise HTTPException(status_code=503, detail=quote.get("error") or "No market data available")
    return quote


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


# ── USAGE EVENT TRACKING + HEATMAP ───────────────────────────────────────────
# Lightweight, privacy-conscious view tracking that powers the admin "heatmap"
# (qué miran más los usuarios). Stores only path/section + timestamp + optional
# user id; never stores query strings or PII. Frontend gates it on cookie consent.
class UsageEventIn(BaseModel):
    path: str = Field(..., max_length=200)
    section: Optional[str] = Field(None, max_length=80)
    label: Optional[str] = Field(None, max_length=120)


@api_router.post("/analytics/track")
@limiter.limit("240/minute")
async def track_usage_event(
    request: Request,
    event: UsageEventIn,
    user: Optional[dict] = Depends(get_current_user),
):
    """Record a single view/section event. Best-effort: never fails navigation."""
    now = datetime.now(timezone.utc)
    path = (event.path or "/").split("?")[0][:200] or "/"
    try:
        await db.usage_events.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user.get("id") if user else None,
            "path": path,
            "section": (event.section or "")[:80] or None,
            "label": (event.label or "")[:120] or None,
            "ts": now.isoformat(),
            "day": now.strftime("%Y-%m-%d"),
            "hour": now.hour,        # 0..23 (UTC)
            "dow": now.weekday(),    # 0=Mon … 6=Sun
        })
    except Exception:
        pass
    return {"ok": True}


@api_router.get("/admin/usage-heatmap")
async def admin_usage_heatmap(days: int = 30, admin: dict = Depends(require_admin)):
    """Aggregate usage_events into a heatmap + rankings of the most-viewed
    pages/sections over the last `days` (1..90)."""
    from collections import Counter

    days = max(1, min(int(days), 90))
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()

    # Bounded fetch — at launch scale this is small; cap protects memory.
    events = await db.usage_events.find({"ts": {"$gte": cutoff}}).limit(100000).to_list(100000)

    path_counts: Counter = Counter()
    section_counts: Counter = Counter()
    day_counts: Counter = Counter()
    heatmap = [[0] * 24 for _ in range(7)]   # [dow][hour]
    visitors: set = set()

    for e in events:
        path_counts[e.get("path") or "/"] += 1
        if e.get("section"):
            section_counts[e["section"]] += 1
        dow, hour = e.get("dow"), e.get("hour")
        if isinstance(dow, int) and isinstance(hour, int) and 0 <= dow < 7 and 0 <= hour < 24:
            heatmap[dow][hour] += 1
        if e.get("day"):
            day_counts[e["day"]] += 1
        if e.get("user_id"):
            visitors.add(e["user_id"])

    return {
        "days": days,
        "total_views": len(events),
        "unique_visitors": len(visitors),
        "top_paths": [{"name": k, "views": v} for k, v in path_counts.most_common(15)],
        "top_sections": [{"name": k, "views": v} for k, v in section_counts.most_common(15)],
        "timeseries": [{"day": d, "views": day_counts[d]} for d in sorted(day_counts)],
        "heatmap": heatmap,   # 7×24 matrix, [dow 0=Mon][hour 0..23 UTC]
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
    from affiliate_program import register as register_affiliate_program
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
        "limiter": limiter,
    })
    register_affiliate_program(api_router, db, {
        "require_user": require_user,
        "require_admin": require_admin,
        "get_setting": get_setting,
        "encrypt": _encrypt_setting,
        "decrypt": _decrypt_setting,
        "limiter": limiter,
    })
    register_realtime_alerts(api_router, db, {
        "decode_token": decode_token,
    })
    logging.info("✅ Extended modules registered into api_router (module-level)")
except Exception as _e:
    logging.error(f"Module-level extended modules registration error: {_e}", exc_info=True)

app.include_router(api_router)

_FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://tradingcalculatorpro.com')

_AUTH_PATHS = {"/api/auth/login", "/api/auth/register", "/api/auth/me",
               "/api/auth/logout", "/api/auth/refresh", "/api/auth/google",
               "/api/auth/magic-link", "/api/auth/magic-link/verify"}

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
        # Prevent caching of auth responses (tokens, user data)
        if request.url.path in _AUTH_PATHS:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
            response.headers["Pragma"] = "no-cache"
        # Only set HSTS on HTTPS (avoids breaking local dev)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)


class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    """Returns 503 for all non-admin API requests when maintenance_mode=true in app_settings."""
    _BYPASS = {"/api/health", "/api/admin", "/api/auth/login"}

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Always pass: health, admin routes, login (so admin can log in during maintenance)
        if path == "/api/health" or path.startswith("/api/admin") or path.startswith("/api/auth"):
            return await call_next(request)
        try:
            if db._pool is not None:
                doc = await db.app_settings.find_one({"_id": "global"}) or {}
                if str(doc.get("maintenance_mode", "")).lower() == "true":
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=503,
                        content={"detail": "Servicio en mantenimiento. Vuelve pronto."},
                        headers={"Retry-After": "3600"},
                    )
        except Exception:
            pass  # Never block traffic on middleware failure
        return await call_next(request)


app.add_middleware(MaintenanceModeMiddleware)

# Structured JSON logging — Cloud Logging / Cloud Run parses this automatically.
# In dev mode plain-text is fine; in production emit JSON so logs are queryable.
_IS_PRODUCTION = os.environ.get("ENVIRONMENT", "production").lower() == "production"
if _IS_PRODUCTION:
    import json as _json

    class _JsonFormatter(logging.Formatter):
        _SEVERITY = {
            logging.DEBUG: "DEBUG", logging.INFO: "INFO",
            logging.WARNING: "WARNING", logging.ERROR: "ERROR",
            logging.CRITICAL: "CRITICAL",
        }
        def format(self, record: logging.LogRecord) -> str:
            entry: dict = {
                "severity": self._SEVERITY.get(record.levelno, "DEFAULT"),
                "message": record.getMessage(),
                "logger": record.name,
                "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            }
            if record.exc_info:
                entry["exception"] = self.formatException(record.exc_info)
            return _json.dumps(entry, ensure_ascii=False)

    _handler = logging.StreamHandler()
    _handler.setFormatter(_JsonFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[_handler])
else:
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
