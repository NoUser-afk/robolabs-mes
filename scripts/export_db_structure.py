from __future__ import annotations

import json
import subprocess
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "README_DB_STRUCTURE_ROBOPULSE_MES.md"
RAW_SCHEMA = ROOT / "database_schema_robolabs_mes.sql"
SSH_TARGET = "ttm-mini"
REMOTE_DIR = "/home/admin_ttm/robolabs-mes"
DB_USER = "robolabs"
DB_NAME = "robolabs_mes"


def run_remote_psql(sql: str) -> str:
    cmd = [
        "ssh",
        SSH_TARGET,
        f"cd {REMOTE_DIR} && docker compose exec -T postgres psql -U {DB_USER} -d {DB_NAME} -X -A -t",
    ]
    result = subprocess.run(
        cmd,
        input=sql,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql failed:\nSQL:\n{sql}\nSTDERR:\n{result.stderr}\nSTDOUT:\n{result.stdout}")
    return result.stdout.strip()


def json_query(inner_sql: str):
    sql = f"""
SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)::text
FROM (
{inner_sql}
) q;
"""
    out = run_remote_psql(sql)
    return json.loads(out or "[]")


def scalar(sql: str) -> str:
    return run_remote_psql(sql).strip()


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def md_escape(value) -> str:
    if value is None or value == "":
        return "—"
    return str(value).replace("|", "\\|").replace("\n", "<br>")


def code(value) -> str:
    return f"`{md_escape(value)}`"


def main() -> None:
    summary = json_query(
        """
SELECT
  current_database() AS database,
  version() AS postgres_version,
  pg_database_size(current_database()) AS database_bytes,
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  (SELECT count(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS table_count,
  (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS applied_migrations
"""
    )[0]

    tables = json_query(
        """
SELECT
  c.relname AS table_name,
  COALESCE(s.n_live_tup, 0) AS estimated_rows,
  pg_total_relation_size(c.oid) AS total_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_relation_size(c.oid)) AS heap_size,
  pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
  pg_size_pretty(GREATEST(pg_total_relation_size(c.oid) - pg_relation_size(c.oid) - pg_indexes_size(c.oid), 0)) AS toast_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC, c.relname
"""
    )

    table_names = [row["table_name"] for row in tables]
    exact_counts: dict[str, int] = {}
    for table_name in table_names:
        exact_counts[table_name] = int(scalar(f"SELECT count(*) FROM public.{quote_ident(table_name)};"))

    columns = json_query(
        """
WITH table_info AS (
  SELECT c.oid, c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
), pk AS (
  SELECT conrelid AS oid, unnest(conkey) AS attnum
  FROM pg_constraint
  WHERE contype = 'p'
), fk_cols AS (
  SELECT conrelid AS oid, unnest(conkey) AS attnum
  FROM pg_constraint
  WHERE contype = 'f'
), uq_cols AS (
  SELECT conrelid AS oid, unnest(conkey) AS attnum
  FROM pg_constraint
  WHERE contype = 'u'
)
SELECT
  t.relname AS table_name,
  a.attnum AS ordinal,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS nullable,
  COALESCE(pg_get_expr(d.adbin, d.adrelid), '') AS default_value,
  trim(concat(
    CASE WHEN pk.attnum IS NOT NULL THEN 'PK ' ELSE '' END,
    CASE WHEN fk.attnum IS NOT NULL THEN 'FK ' ELSE '' END,
    CASE WHEN uq.attnum IS NOT NULL THEN 'UNIQUE ' ELSE '' END
  )) AS key_flags,
  COALESCE(col_description(a.attrelid, a.attnum), '') AS comment
FROM table_info t
JOIN pg_attribute a ON a.attrelid = t.oid
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
LEFT JOIN pk ON pk.oid = t.oid AND pk.attnum = a.attnum
LEFT JOIN fk_cols fk ON fk.oid = t.oid AND fk.attnum = a.attnum
LEFT JOIN uq_cols uq ON uq.oid = t.oid AND uq.attnum = a.attnum
WHERE a.attnum > 0 AND NOT a.attisdropped
ORDER BY t.relname, a.attnum
"""
    )

    constraints = json_query(
        """
SELECT
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'x' THEN 'EXCLUDE'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, con.contype DESC, con.conname
"""
    )

    fks = json_query(
        """
SELECT
  src.relname AS source_table,
  array_to_string(ARRAY(
    SELECT att.attname
    FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    ORDER BY k.ord
  ), ', ') AS source_columns,
  dst.relname AS target_table,
  array_to_string(ARRAY(
    SELECT att.attname
    FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = k.attnum
    ORDER BY k.ord
  ), ', ') AS target_columns,
  con.confupdtype::text AS update_action,
  con.confdeltype::text AS delete_action
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_class dst ON dst.oid = con.confrelid
JOIN pg_namespace n ON n.oid = src.relnamespace
WHERE con.contype = 'f' AND n.nspname = 'public'
ORDER BY src.relname, con.conname
"""
    )

    indexes = json_query(
        """
SELECT
  tab.relname AS table_name,
  idx.relname AS index_name,
  pg_size_pretty(pg_relation_size(idx.oid)) AS index_size,
  pg_get_indexdef(idx.oid) AS definition
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class tab ON tab.oid = i.indrelid
JOIN pg_namespace n ON n.oid = tab.relnamespace
WHERE n.nspname = 'public'
ORDER BY tab.relname, idx.relname
"""
    )

    sequences = json_query(
        """
SELECT
  sequence_name,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment,
  cycle_option
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name
"""
    )

    views = json_query(
        """
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name
"""
    )

    enums = json_query(
        """
SELECT t.typname AS enum_name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname
"""
    )

    migrations = json_query(
        """
SELECT migration_name, finished_at::text AS finished_at, rolled_back_at::text AS rolled_back_at, left(COALESCE(logs, ''), 160) AS logs
FROM "_prisma_migrations"
ORDER BY started_at
"""
    )

    production_counts = {
        table: exact_counts.get(table, 0)
        for table in [
            "ProductionRun",
            "ProductionUnit",
            "ProductionUnitOperation",
            "ProductionOperationEvent",
            "ProductionRunRecord",
        ]
    }

    columns_by_table: dict[str, list[dict]] = {}
    for row in columns:
        columns_by_table.setdefault(row["table_name"], []).append(row)

    lines: list[str] = []
    lines.append("# Структура базы данных RoboPulse MES")
    lines.append("")
    lines.append("> Автоматическая человекочитаемая выгрузка фактической PostgreSQL-схемы стенда `ttm-mini`.")
    lines.append("")
    lines.append(f"**База данных:** `{summary['database']}`")
    lines.append("**Сервер проекта:** `ttm-mini`")
    lines.append(f"**Дата выгрузки:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("## 1. Сводка")
    lines.append("")
    lines.append("| Параметр | Значение |")
    lines.append("|---|---|")
    lines.append(f"| PostgreSQL version | {md_escape(summary['postgres_version'])} |")
    lines.append(f"| Database size | {summary['database_size']} |")
    lines.append(f"| Database bytes | {summary['database_bytes']} |")
    lines.append(f"| Tables in public schema | {summary['table_count']} |")
    lines.append(f"| Applied Prisma migrations | {summary['applied_migrations']} |")
    lines.append("")
    lines.append("## 2. Доменные зоны")
    lines.append("")
    lines.append("| Зона | Таблицы | Назначение |")
    lines.append("|---|---|---|")
    lines.append("| Заказы и операции | `Order`, `OrderOperation`, `OperationEvent`, `TimeTracking`, `QualityRecord`, `ImportBatch` | Импорт, статусная модель заказа, учет времени, события и качество. |")
    lines.append("| Справочники и маршруты | `ReferenceSection`, `ReferenceOperation`, `RouteTemplate`, `RouteOperation`, `SectionCapacity`, `Person` | Участки, операции, маршруты, исполнители и нормативные мощности. |")
    lines.append("| Номенклатура | `NomenclatureProcessRecord` | Технологические процессы изделий и их версии. |")
    lines.append("| Производство | `ProductionRun`, `ProductionUnit`, `ProductionUnitOperation`, `ProductionOperationEvent`, `ProductionRunRecord` | Производственные запуски, единицы продукции, операции по единицам, события и legacy forensic record. |")
    lines.append("| Рабочие центры и смены | `WorkCenter`, `WorkShift`, `ProductionCalendarDay`, `DeviationReason` | Рабочие центры, сменный учет, календарь и причины отклонений. |")
    lines.append("| Пользователи и аудит | `AppUser`, `AuditLog`, `_prisma_migrations` | Учетные записи, роли, terminal-only доступ, аудит и история миграций. |")
    lines.append("")
    lines.append("## 3. Таблицы: размеры и строки")
    lines.append("")
    lines.append("| Таблица | Точно строк | Примерно строк | Общий размер | Heap | Индексы | TOAST |")
    lines.append("|---|---:|---:|---:|---:|---:|---:|")
    for row in tables:
        table_name = row["table_name"]
        lines.append(
            f"| {code(table_name)} | {exact_counts[table_name]} | {row['estimated_rows']} | {row['total_size']} | {row['heap_size']} | {row['index_size']} | {row['toast_size']} |"
        )
    lines.append("")
    lines.append("## 4. Таблицы и колонки")
    lines.append("")
    for idx, table_name in enumerate(sorted(columns_by_table), 1):
        lines.append(f"### 4.{idx}. `{table_name}`")
        lines.append("")
        lines.append("| # | Колонка | Тип | Nullable | Ключи | Default | Комментарий |")
        lines.append("|---:|---|---|---|---|---|---|")
        for col in columns_by_table[table_name]:
            lines.append(
                f"| {col['ordinal']} | {code(col['column_name'])} | {code(col['data_type'])} | {col['nullable']} | {md_escape(col['key_flags'])} | {code(col['default_value'] or '—')} | {md_escape(col['comment'])} |"
            )
        lines.append("")
    lines.append("## 5. Constraints")
    lines.append("")
    lines.append("| Таблица | Имя | Тип | Определение |")
    lines.append("|---|---|---|---|")
    for row in constraints:
        lines.append(f"| {code(row['table_name'])} | {code(row['constraint_name'])} | {row['constraint_type']} | {code(row['definition'])} |")
    lines.append("")
    lines.append("## 6. Foreign keys: карта связей")
    lines.append("")
    lines.append("Коды действий PostgreSQL: `a` no action, `r` restrict, `c` cascade, `n` set null, `d` set default.")
    lines.append("")
    lines.append("| Откуда | Поля | Куда | Действие update/delete |")
    lines.append("|---|---|---|---|")
    for row in fks:
        lines.append(
            f"| {code(row['source_table'])} | {code(row['source_columns'])} | `{row['target_table']}`({code(row['target_columns'])}) | update={row['update_action']}, delete={row['delete_action']} |"
        )
    lines.append("")
    lines.append("## 7. Indexes")
    lines.append("")
    lines.append("| Таблица | Индекс | Размер | Определение |")
    lines.append("|---|---|---:|---|")
    for row in indexes:
        lines.append(f"| {code(row['table_name'])} | {code(row['index_name'])} | {row['index_size']} | {code(row['definition'])} |")
    lines.append("")
    lines.append("## 8. Sequences")
    lines.append("")
    lines.append("| Sequence | Тип | Start | Min | Max | Increment | Cycle |")
    lines.append("|---|---|---:|---:|---:|---:|---|")
    for row in sequences:
        lines.append(
            f"| {code(row['sequence_name'])} | {code(row['data_type'])} | {row['start_value']} | {row['minimum_value']} | {row['maximum_value']} | {row['increment']} | {row['cycle_option']} |"
        )
    lines.append("")
    lines.append("## 9. Views")
    lines.append("")
    if views:
        lines.append("| View | Определение |")
        lines.append("|---|---|")
        for row in views:
            lines.append(f"| {code(row['table_name'])} | {code(row['view_definition'])} |")
    else:
        lines.append("Views в `public` schema не найдены.")
    lines.append("")
    lines.append("## 10. Enum types")
    lines.append("")
    if enums:
        lines.append("| Enum | Значения |")
        lines.append("|---|---|")
        for row in enums:
            lines.append(f"| {code(row['enum_name'])} | {code(row['values'])} |")
    else:
        lines.append("PostgreSQL enum types в `public` schema не найдены. Статусы в текущей схеме представлены строковыми полями.")
    lines.append("")
    lines.append("## 11. Prisma migrations")
    lines.append("")
    lines.append("| Migration | Finished at | Logs | Rolled back |")
    lines.append("|---|---|---|---|")
    for row in migrations:
        lines.append(
            f"| {code(row['migration_name'])} | {md_escape(row['finished_at'])} | {md_escape(row['logs'])} | {md_escape(row['rolled_back_at'])} |"
        )
    lines.append("")
    lines.append("## 12. SQL-first статус production-хранилища")
    lines.append("")
    lines.append("| Проверка | Значение |")
    lines.append("|---|---:|")
    for table_name, count in production_counts.items():
        label = f"`{table_name}`" + (" legacy" if table_name == "ProductionRunRecord" else "")
        lines.append(f"| {label} | {count} rows |")
    lines.append("")
    lines.append("> Вывод: при наличии строк в `ProductionRun` backend читает production runs из нормализованных PostgreSQL-таблиц. `ProductionRunRecord` остается legacy/forensic-слоем совместимости, а не основным runtime-хранилищем.")
    lines.append("")
    lines.append("## 13. Raw DDL")
    lines.append("")
    lines.append(f"Точная schema-only SQL-выгрузка сохранена рядом: `{RAW_SCHEMA.name}`.")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


if __name__ == "__main__":
    main()
