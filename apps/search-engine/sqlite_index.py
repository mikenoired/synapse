import hashlib
import json
import math
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional


SCHEMA = """
pragma foreign_keys = on;

create table if not exists documents (
  user_id text not null,
  id text not null,
  title text not null,
  tags text not null,
  text text not null,
  created_at text not null,
  length integer not null,
  content_hash text not null,
  primary key (user_id, id)
);

create table if not exists postings (
  user_id text not null,
  term text not null,
  document_id text not null,
  frequency integer not null,
  primary key (user_id, term, document_id),
  foreign key (user_id, document_id) references documents(user_id, id) on delete cascade
);

create index if not exists postings_lookup_idx on postings(user_id, term);
"""


def tokenize(value: str) -> List[str]:
    return [token for token in re.findall(r"[\w-]+", value.casefold()) if len(token) >= 3]


def connect(index_path: Path) -> sqlite3.Connection:
    index_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(index_path))
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA)
    return connection


def searchable_text(document: Dict[str, Any]) -> str:
    return "{}\n{}\n{}".format(
        document.get("title") or "",
        " ".join(document.get("tags") or []),
        document.get("text") or "",
    )


def upsert_in_connection(connection: sqlite3.Connection, document: Dict[str, Any]) -> str:
    user_id = document.get("user_id")
    if not user_id:
        raise ValueError("Документ {} не содержит user_id".format(document.get("id")))
    searchable = searchable_text(document)
    frequencies = Counter(tokenize(searchable))
    content_hash = hashlib.sha256(searchable.encode("utf-8")).hexdigest()
    current = connection.execute(
        "select content_hash from documents where user_id = ? and id = ?",
        (user_id, document["id"]),
    ).fetchone()
    if current and current["content_hash"] == content_hash:
        return "unchanged"

    connection.execute(
        """
        insert into documents (
          user_id, id, title, tags, text, created_at, length, content_hash
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
          title = excluded.title,
          tags = excluded.tags,
          text = excluded.text,
          created_at = excluded.created_at,
          length = excluded.length,
          content_hash = excluded.content_hash
        """,
        (
            user_id,
            document["id"],
            document.get("title") or "",
            json.dumps(document.get("tags") or [], ensure_ascii=False),
            document.get("text") or "",
            document["created_at"],
            sum(frequencies.values()),
            content_hash,
        ),
    )
    connection.execute(
        "delete from postings where user_id = ? and document_id = ?",
        (user_id, document["id"]),
    )
    connection.executemany(
        "insert into postings (user_id, term, document_id, frequency) values (?, ?, ?, ?)",
        [
            (user_id, term, document["id"], frequency)
            for term, frequency in frequencies.items()
        ],
    )
    return "updated" if current else "inserted"


def upsert_document(index_path: Path, document: Dict[str, Any]) -> str:
    connection = connect(index_path)
    try:
        with connection:
            return upsert_in_connection(connection, document)
    finally:
        connection.close()


def sync_index(index_path: Path, documents: List[Dict[str, Any]]) -> Dict[str, int]:
    stats = {"inserted": 0, "updated": 0, "unchanged": 0, "deleted": 0}
    seen: Dict[str, set] = defaultdict(set)
    connection = connect(index_path)
    try:
        with connection:
            for document in documents:
                user_id = document.get("user_id")
                if not user_id:
                    raise ValueError("Документ {} не содержит user_id".format(document.get("id")))
                seen[user_id].add(document["id"])
                stats[upsert_in_connection(connection, document)] += 1

            for user_id, document_ids in seen.items():
                indexed_ids = {
                    row["id"]
                    for row in connection.execute(
                        "select id from documents where user_id = ?", (user_id,)
                    )
                }
                removed = indexed_ids - document_ids
                connection.executemany(
                    "delete from documents where user_id = ? and id = ?",
                    [(user_id, document_id) for document_id in removed],
                )
                stats["deleted"] += len(removed)
    finally:
        connection.close()
    return stats


def delete_document(index_path: Path, user_id: str, document_id: str) -> bool:
    connection = connect(index_path)
    try:
        with connection:
            cursor = connection.execute(
                "delete from documents where user_id = ? and id = ?", (user_id, document_id)
            )
            return cursor.rowcount > 0
    finally:
        connection.close()


def resolve_user_id(connection: sqlite3.Connection, user_id: Optional[str]) -> str:
    if user_id:
        return user_id
    users = [row["user_id"] for row in connection.execute("select distinct user_id from documents")]
    if len(users) != 1:
        raise ValueError("Укажите --user-id: индекс содержит пользователей: {}".format(len(users)))
    return users[0]


def search_index(
    index_path: Path, query: str, limit: int, user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    terms = list(dict.fromkeys(tokenize(query)))
    if not terms:
        return []
    connection = connect(index_path)
    try:
        resolved_user_id = resolve_user_id(connection, user_id)
        document_stats = connection.execute(
            "select count(*) as count, coalesce(avg(length), 1) as average_length "
            "from documents where user_id = ?",
            (resolved_user_id,),
        ).fetchone()
        document_count = document_stats["count"]
        if not document_count:
            return []
        average_length = max(float(document_stats["average_length"]), 1)
        placeholders = ",".join("?" for _ in terms)
        parameters = [resolved_user_id] + terms
        document_frequency = {
            row["term"]: row["count"]
            for row in connection.execute(
                "select term, count(*) as count from postings "
                "where user_id = ? and term in ({}) group by term".format(placeholders),
                parameters,
            )
        }
        rows = connection.execute(
            """
            select p.term, p.document_id, p.frequency, d.length, d.title, d.created_at
            from postings p
            join documents d on d.user_id = p.user_id and d.id = p.document_id
            where p.user_id = ? and p.term in ({})
            """.format(placeholders),
            parameters,
        )
        scores: Dict[str, float] = defaultdict(float)
        documents = {}
        k1 = 1.5
        b = 0.75
        for row in rows:
            frequency = row["frequency"]
            inverse_document_frequency = math.log(
                1
                + (document_count - document_frequency[row["term"]] + 0.5)
                / (document_frequency[row["term"]] + 0.5)
            )
            normalization = frequency + k1 * (
                1 - b + b * row["length"] / average_length
            )
            scores[row["document_id"]] += (
                inverse_document_frequency * frequency * (k1 + 1) / normalization
            )
            documents[row["document_id"]] = row

        ranked = sorted(
            scores,
            key=lambda document_id: (
                scores[document_id],
                documents[document_id]["created_at"],
            ),
            reverse=True,
        )[:limit]
        return [
            {
                "document_id": document_id,
                "title": documents[document_id]["title"],
                "score": round(scores[document_id], 6),
            }
            for document_id in ranked
        ]
    finally:
        connection.close()
