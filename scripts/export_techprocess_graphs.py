from __future__ import annotations

import html
import json
import math
import re
import subprocess
import textwrap
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A0
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "techprocess_graphs"
SSH_TARGET = "ttm-mini"
REMOTE_DIR = "/home/admin_ttm/robolabs-mes-demo"
DB_USER = "robolabs"
DB_NAME = "robolabs_mes"

PAGE_W_MM = 1189.0
PAGE_H_MM = 841.0
TREE_PAGE_W_MM = 841.0
TREE_PAGE_H_MM = 1189.0
A2_PAGE_W_MM = 420.0
A2_PAGE_H_MM = 594.0
MARGIN_MM = 18.0
HEADER_MM = 54.0
FOOTER_MM = 18.0
NODE_W_SRC = 220.0
NODE_H_SRC = 132.0

FONT_PATH = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD_PATH = Path(r"C:\Windows\Fonts\arialbd.ttf")
FONT_NAME = "ArialTT"
FONT_BOLD = "ArialTTBold"

SECTION_COLORS = [
    "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#7c3aed", "#0891b2",
    "#ea580c", "#4f46e5", "#0f766e", "#be123c", "#65a30d", "#9333ea",
    "#0284c7", "#b45309", "#475569", "#059669", "#db2777", "#1d4ed8",
]


def run_psql_json(sql: str) -> list[dict[str, Any]]:
    remote = (
        f"cd {REMOTE_DIR} && docker compose exec -T postgres "
        f"psql -U {DB_USER} -d {DB_NAME} -At"
    )
    proc = subprocess.run(
        ["ssh", SSH_TARGET, remote],
        input=sql,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    payload = proc.stdout.strip()
    if not payload:
        return []
    return json.loads(payload)


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^0-9a-zа-яё]+", "-", value, flags=re.IGNORECASE).strip("-")
    return value[:90] or "techprocess"


def pick_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def score(record: dict[str, Any], target: str) -> tuple[int, str]:
        equipment = str(record.get("equipment") or "").lower()
        code = str(record.get("productCode") or "").lower()
        rid = str(record.get("id") or "").lower()
        updated = str(record.get("updatedAt") or "")
        points = 0
        if target == "robochef":
            if code == "209983":
                points += 20
            if "robochef 800" in equipment:
                points += 50
            if "печь" in equipment:
                points += 20
            if rid == "rc800-209983":
                points -= 10
        else:
            if code == "231265":
                points += 20
            if "мн-6-3-ts2" in equipment or "mh-6-3-ts2" in equipment:
                points += 40
            if "мультихолдер" in equipment:
                points += 40
            if rid.startswith("multiholder-"):
                points -= 5
        return points, updated

    selected: list[dict[str, Any]] = []
    for target in ("robochef", "multiholder"):
        candidates = sorted(records, key=lambda item: score(item, target), reverse=True)
        if not candidates or score(candidates[0], target)[0] <= 0:
            raise RuntimeError(f"Не найдена запись для {target}")
        selected.append(candidates[0])
    return selected


def normalize_steps(record: dict[str, Any]) -> list[dict[str, Any]]:
    data = record.get("data") or {}
    steps = data.get("processSteps") or []
    normalized: list[dict[str, Any]] = []
    for index, step in enumerate(steps):
        code = str(step.get("operationId") or step.get("operationCode") or f"OP-{index + 1}").strip()
        normalized.append(
            {
                "operationId": code,
                "sequence": int(step.get("sequence") or index + 1),
                "level": int(step.get("level") or 1),
                "name": str(step.get("name") or "Операция").strip(),
                "section": str(step.get("section") or "Участок").strip(),
                "partOrAssembly": str(step.get("partOrAssembly") or "Общее").strip(),
                "normHours": float(step.get("normHours") or 0),
                "previousOperationCodes": [str(x) for x in (step.get("previousOperationCodes") or [])],
                "nextOperationCodes": [str(x) for x in (step.get("nextOperationCodes") or [])],
                "groupCapable": bool(step.get("groupCapable") or False),
                "x": float(step["x"]) if isinstance(step.get("x"), (int, float)) else None,
                "y": float(step["y"]) if isinstance(step.get("y"), (int, float)) else None,
            }
        )
    return sorted(normalized, key=lambda item: (item["sequence"], item["operationId"]))


def graph_edges(steps: list[dict[str, Any]]) -> list[tuple[str, str]]:
    codes = {step["operationId"] for step in steps}
    edges: set[tuple[str, str]] = set()
    for step in steps:
        source = step["operationId"]
        for target in step["nextOperationCodes"]:
            if target in codes and target != source:
                edges.add((source, target))
        for previous in step["previousOperationCodes"]:
            if previous in codes and previous != source:
                edges.add((previous, source))
    return sorted(edges, key=lambda edge: (edge[0], edge[1]))


def fallback_positions(steps: list[dict[str, Any]], edges: list[tuple[str, str]]) -> dict[str, tuple[float, float]]:
    incoming = defaultdict(list)
    outgoing = defaultdict(list)
    for source, target in edges:
        incoming[target].append(source)
        outgoing[source].append(target)
    depth: dict[str, int] = {}

    def visit(code: str, stack: set[str]) -> int:
        if code in depth:
            return depth[code]
        if code in stack:
            return 0
        parents = incoming.get(code, [])
        depth[code] = 0 if not parents else max(visit(parent, stack | {code}) + 1 for parent in parents)
        return depth[code]

    for step in steps:
        visit(step["operationId"], set())
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for step in steps:
        grouped[depth[step["operationId"]]].append(step)
    positions: dict[str, tuple[float, float]] = {}
    for col, group in grouped.items():
        group.sort(key=lambda item: (item["sequence"], item["operationId"]))
        for row, step in enumerate(group):
            positions[step["operationId"]] = (56 + col * 290, 56 + row * 168)
    return positions


def source_positions(steps: list[dict[str, Any]], edges: list[tuple[str, str]]) -> dict[str, tuple[float, float]]:
    if all(step["x"] is not None and step["y"] is not None for step in steps):
        return {step["operationId"]: (float(step["x"]), float(step["y"])) for step in steps}
    return fallback_positions(steps, edges)


def section_palette(steps: list[dict[str, Any]]) -> dict[str, str]:
    sections = sorted({step["section"] for step in steps})
    return {section: SECTION_COLORS[index % len(SECTION_COLORS)] for index, section in enumerate(sections)}


def wrap_svg_text(text: str, max_chars: int) -> list[str]:
    chunks: list[str] = []
    for part in str(text).splitlines() or [""]:
        chunks.extend(textwrap.wrap(part, width=max_chars, break_long_words=False) or [""])
    return chunks


def layout_transform(positions: dict[str, tuple[float, float]]) -> tuple[float, float, float, float, float]:
    min_x = min(x for x, _ in positions.values())
    min_y = min(y for _, y in positions.values())
    max_x = max(x + NODE_W_SRC for x, _ in positions.values())
    max_y = max(y + NODE_H_SRC for _, y in positions.values())
    usable_w = PAGE_W_MM - 2 * MARGIN_MM
    usable_h = PAGE_H_MM - HEADER_MM - FOOTER_MM - 2 * MARGIN_MM
    scale = min(usable_w / max(1.0, max_x - min_x), usable_h / max(1.0, max_y - min_y))
    scale = min(scale, 0.62)
    graph_w = (max_x - min_x) * scale
    graph_h = (max_y - min_y) * scale
    offset_x = MARGIN_MM + max(0, (usable_w - graph_w) / 2)
    offset_y = MARGIN_MM + HEADER_MM + max(0, (usable_h - graph_h) / 2)
    return scale, min_x, min_y, offset_x, offset_y


def tx(value: float, min_x: float, offset_x: float, scale: float) -> float:
    return offset_x + (value - min_x) * scale


def ty(value: float, min_y: float, offset_y: float, scale: float) -> float:
    return offset_y + (value - min_y) * scale


def esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def build_svg(record: dict[str, Any], steps: list[dict[str, Any]], out_svg: Path) -> None:
    edges = graph_edges(steps)
    positions = source_positions(steps, edges)
    palette = section_palette(steps)
    scale, min_x, min_y, offset_x, offset_y = layout_transform(positions)
    node_w = NODE_W_SRC * scale
    node_h = NODE_H_SRC * scale
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_hours = sum(step["normHours"] for step in steps)
    sections = sorted(palette)
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W_MM}mm" height="{PAGE_H_MM}mm" viewBox="0 0 {PAGE_W_MM} {PAGE_H_MM}">',
        "<defs>",
        '<marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#334155"/></marker>',
        '<style><![CDATA[text{font-family:Arial,Helvetica,sans-serif}.title{font-size:15px;font-weight:700;fill:#0f172a}.meta{font-size:5px;fill:#475569}.node-code{font-size:5px;font-weight:700;fill:#0f172a}.node-text{font-size:4.2px;fill:#111827}.node-small{font-size:3.7px;fill:#475569}.legend{font-size:4px;fill:#111827}.edge{fill:none;stroke:#334155;stroke-width:.65;marker-end:url(#arrow);opacity:.8}.grid{stroke:#e2e8f0;stroke-width:.2}.border{fill:#fff;stroke:#0f172a;stroke-width:.5}.node{fill:#fff;stroke:#334155;stroke-width:.45}.stamp{fill:#f8fafc;stroke:#64748b;stroke-width:.35}]]></style>',
        "</defs>",
        '<rect x="0" y="0" width="1189" height="841" fill="#ffffff"/>',
    ]
    for x in range(20, 1180, 20):
        lines.append(f'<line class="grid" x1="{x}" y1="{MARGIN_MM + HEADER_MM}" x2="{x}" y2="{PAGE_H_MM - FOOTER_MM}" />')
    for y in range(int(MARGIN_MM + HEADER_MM), int(PAGE_H_MM - FOOTER_MM), 20):
        lines.append(f'<line class="grid" x1="{MARGIN_MM}" y1="{y}" x2="{PAGE_W_MM - MARGIN_MM}" y2="{y}" />')
    lines.extend(
        [
            f'<rect class="border" x="{MARGIN_MM}" y="{MARGIN_MM}" width="{PAGE_W_MM - 2*MARGIN_MM}" height="{PAGE_H_MM - 2*MARGIN_MM}" />',
            f'<text class="title" x="{MARGIN_MM + 6}" y="{MARGIN_MM + 14}">Техпроцесс изделия: {esc(record["equipment"])}</text>',
            f'<text class="meta" x="{MARGIN_MM + 6}" y="{MARGIN_MM + 25}">Код: {esc(record["productCode"])} | Операций: {len(steps)} | Норма: {total_hours:.1f} ч | Источник: PostgreSQL ttm-mini / NomenclatureProcessRecord.data | Выгрузка: {generated}</text>',
            f'<text class="meta" x="{MARGIN_MM + 6}" y="{MARGIN_MM + 35}">Формат листа: A0 landscape, 1189 x 841 мм. Векторный SVG; допускается масштабирование до A1 при печати.</text>',
            f'<rect class="stamp" x="{PAGE_W_MM - MARGIN_MM - 270}" y="{MARGIN_MM + 7}" width="264" height="37" rx="2" />',
            f'<text class="meta" x="{PAGE_W_MM - MARGIN_MM - 264}" y="{MARGIN_MM + 17}">RoboPulse MES - технологический граф</text>',
            f'<text class="meta" x="{PAGE_W_MM - MARGIN_MM - 264}" y="{MARGIN_MM + 27}">id: {esc(record["id"])}</text>',
            f'<text class="meta" x="{PAGE_W_MM - MARGIN_MM - 264}" y="{MARGIN_MM + 37}">updatedAt: {esc(record.get("updatedAt", ""))}</text>',
        ]
    )
    for source, target in edges:
        sx, sy = positions[source]
        tx0, ty0 = positions[target]
        x1 = tx(sx + NODE_W_SRC, min_x, offset_x, scale)
        y1 = ty(sy + NODE_H_SRC / 2, min_y, offset_y, scale)
        x2 = tx(tx0, min_x, offset_x, scale)
        y2 = ty(ty0 + NODE_H_SRC / 2, min_y, offset_y, scale)
        mid = (x1 + x2) / 2
        lines.append(f'<path class="edge" d="M{x1:.2f},{y1:.2f} C{mid:.2f},{y1:.2f} {mid:.2f},{y2:.2f} {x2:.2f},{y2:.2f}" />')
    for step in steps:
        x0, y0 = positions[step["operationId"]]
        x = tx(x0, min_x, offset_x, scale)
        y = ty(y0, min_y, offset_y, scale)
        color = palette[step["section"]]
        lines.append(f'<g id="{esc(step["operationId"])}">')
        lines.append(f'<rect class="node" x="{x:.2f}" y="{y:.2f}" width="{node_w:.2f}" height="{node_h:.2f}" rx="2.2" />')
        lines.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{max(2.5, 7*scale):.2f}" height="{node_h:.2f}" rx="2.2" fill="{color}" />')
        lines.append(f'<text class="node-code" x="{x + 5.5:.2f}" y="{y + 6.0:.2f}">{esc(step["sequence"])}. {esc(step["operationId"])}</text>')
        text_y = y + 13
        for line in wrap_svg_text(step["name"], max(14, int(node_w / 3.0)))[:3]:
            lines.append(f'<text class="node-text" x="{x + 5.5:.2f}" y="{text_y:.2f}">{esc(line)}</text>')
            text_y += 5.0
        details = f'{step["section"]} | {step["partOrAssembly"]}'
        for line in wrap_svg_text(details, max(16, int(node_w / 2.8)))[:2]:
            lines.append(f'<text class="node-small" x="{x + 5.5:.2f}" y="{text_y:.2f}">{esc(line)}</text>')
            text_y += 4.4
        footer = f'Норма {step["normHours"]:.1f} ч'
        if step["groupCapable"]:
            footer += ' | групповая'
        lines.append(f'<text class="node-small" x="{x + 5.5:.2f}" y="{y + node_h - 4.0:.2f}">{esc(footer)}</text>')
        lines.append("</g>")
    legend_x = MARGIN_MM + 6
    legend_y = PAGE_H_MM - MARGIN_MM - 8
    lines.append(f'<text class="meta" x="{legend_x}" y="{legend_y}">Легенда участков:</text>')
    cursor_x = legend_x + 42
    cursor_y = legend_y
    for section in sections:
        label = section[:32]
        approx_w = 7 + len(label) * 2.0
        if cursor_x + approx_w > PAGE_W_MM - MARGIN_MM - 8:
            cursor_x = legend_x + 42
            cursor_y += 6
        lines.append(f'<rect x="{cursor_x:.2f}" y="{cursor_y - 4:.2f}" width="4" height="4" fill="{palette[section]}" />')
        lines.append(f'<text class="legend" x="{cursor_x + 6:.2f}" y="{cursor_y:.2f}">{esc(label)}</text>')
        cursor_x += approx_w
    lines.append("</svg>")
    out_svg.write_text("\n".join(lines), encoding="utf-8")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
    if FONT_BOLD_PATH.exists():
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_BOLD_PATH)))
    else:
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_PATH)))


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, max_chars: int, leading: float, max_lines: int, font: str, size: float, fill: colors.Color = colors.black) -> float:
    c.setFont(font, size)
    c.setFillColor(fill)
    current = y
    for line in wrap_svg_text(text, max_chars)[:max_lines]:
        c.drawString(x, current, line)
        current -= leading
    return current


def hex_color(value: str) -> colors.Color:
    return colors.HexColor(value)


def build_pdf(record: dict[str, Any], steps: list[dict[str, Any]], out_pdf: Path) -> None:
    register_fonts()
    page_w, page_h = A0[1], A0[0]
    c = canvas.Canvas(str(out_pdf), pagesize=(page_w, page_h))
    c.setTitle(f"Техпроцесс {record['productCode']}")
    mmx = lambda v: v * mm
    edges = graph_edges(steps)
    positions = source_positions(steps, edges)
    palette = section_palette(steps)
    scale, min_x, min_y, offset_x, offset_y = layout_transform(positions)
    node_w = NODE_W_SRC * scale
    node_h = NODE_H_SRC * scale
    total_hours = sum(step["normHours"] for step in steps)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    c.setFillColor(colors.white)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.2)
    for x in range(20, 1180, 20):
        c.line(mmx(x), mmx(PAGE_H_MM - (MARGIN_MM + HEADER_MM)), mmx(x), mmx(FOOTER_MM + MARGIN_MM))
    for y in range(int(MARGIN_MM + HEADER_MM), int(PAGE_H_MM - FOOTER_MM), 20):
        c.line(mmx(MARGIN_MM), mmx(PAGE_H_MM - y), mmx(PAGE_W_MM - MARGIN_MM), mmx(PAGE_H_MM - y))
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.setLineWidth(0.5)
    c.rect(mmx(MARGIN_MM), mmx(MARGIN_MM), mmx(PAGE_W_MM - 2 * MARGIN_MM), mmx(PAGE_H_MM - 2 * MARGIN_MM), stroke=1, fill=0)

    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont(FONT_BOLD, 15)
    c.drawString(mmx(MARGIN_MM + 6), mmx(PAGE_H_MM - MARGIN_MM - 14), f"Техпроцесс изделия: {record['equipment']}")
    c.setFont(FONT_NAME, 5)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(mmx(MARGIN_MM + 6), mmx(PAGE_H_MM - MARGIN_MM - 25), f"Код: {record['productCode']} | Операций: {len(steps)} | Норма: {total_hours:.1f} ч | Источник: PostgreSQL ttm-mini / NomenclatureProcessRecord.data | Выгрузка: {generated}")
    c.drawString(mmx(MARGIN_MM + 6), mmx(PAGE_H_MM - MARGIN_MM - 35), "Формат листа: A0 landscape, 1189 x 841 мм. Векторный PDF; допускается масштабирование до A1 при печати.")

    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(0.65)
    for source, target in edges:
        sx, sy = positions[source]
        tx0, ty0 = positions[target]
        x1 = tx(sx + NODE_W_SRC, min_x, offset_x, scale)
        y1 = ty(sy + NODE_H_SRC / 2, min_y, offset_y, scale)
        x2 = tx(tx0, min_x, offset_x, scale)
        y2 = ty(ty0 + NODE_H_SRC / 2, min_y, offset_y, scale)
        c.line(mmx(x1), mmx(PAGE_H_MM - y1), mmx(x2), mmx(PAGE_H_MM - y2))
        angle = math.atan2(y2 - y1, x2 - x1)
        arrow_len = 3.0
        for delta in (2.6, -2.6):
            ax = x2 - arrow_len * math.cos(angle + delta)
            ay = y2 - arrow_len * math.sin(angle + delta)
            c.line(mmx(x2), mmx(PAGE_H_MM - y2), mmx(ax), mmx(PAGE_H_MM - ay))

    for step in steps:
        x0, y0 = positions[step["operationId"]]
        x = tx(x0, min_x, offset_x, scale)
        y = ty(y0, min_y, offset_y, scale)
        pdf_y = PAGE_H_MM - y - node_h
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#334155"))
        c.setLineWidth(0.45)
        c.roundRect(mmx(x), mmx(pdf_y), mmx(node_w), mmx(node_h), mmx(2.2), stroke=1, fill=1)
        c.setFillColor(hex_color(palette[step["section"]]))
        c.roundRect(mmx(x), mmx(pdf_y), mmx(max(2.5, 7 * scale)), mmx(node_h), mmx(2.2), stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont(FONT_BOLD, 5)
        c.drawString(mmx(x + 5.5), mmx(pdf_y + node_h - 6), f"{step['sequence']}. {step['operationId']}")
        cursor = pdf_y + node_h - 13
        cursor = draw_wrapped(c, step["name"], mmx(x + 5.5), mmx(cursor), max(14, int(node_w / 3.0)), mmx(5), 3, FONT_NAME, 4.2, colors.HexColor("#111827")) / mm
        details = f"{step['section']} | {step['partOrAssembly']}"
        draw_wrapped(c, details, mmx(x + 5.5), mmx(cursor), max(16, int(node_w / 2.8)), mmx(4.4), 2, FONT_NAME, 3.7, colors.HexColor("#475569"))
        footer = f"Норма {step['normHours']:.1f} ч"
        if step["groupCapable"]:
            footer += " | групповая"
        c.setFont(FONT_NAME, 3.7)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(mmx(x + 5.5), mmx(pdf_y + 4), footer)

    legend_x = MARGIN_MM + 6
    legend_y = MARGIN_MM + 8
    c.setFont(FONT_NAME, 5)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(mmx(legend_x), mmx(legend_y), "Легенда участков:")
    cursor_x = legend_x + 42
    cursor_y = legend_y
    c.setFont(FONT_NAME, 4)
    for section in sorted(palette):
        label = section[:32]
        approx_w = 7 + len(label) * 2.0
        if cursor_x + approx_w > PAGE_W_MM - MARGIN_MM - 8:
            cursor_x = legend_x + 42
            cursor_y -= 6
        c.setFillColor(hex_color(palette[section]))
        c.rect(mmx(cursor_x), mmx(cursor_y - 4), mmx(4), mmx(4), stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#111827"))
        c.drawString(mmx(cursor_x + 6), mmx(cursor_y - 0.3), label)
        cursor_x += approx_w

    c.showPage()
    c.save()


def build_markdown(record: dict[str, Any], steps: list[dict[str, Any]], out_md: Path, svg_name: str, pdf_name: str) -> None:
    edges = graph_edges(steps)
    lines = [
        f"# Техпроцесс: {record['equipment']}",
        "",
        f"- Код номенклатуры: `{record['productCode']}`",
        f"- ID записи БД: `{record['id']}`",
        f"- Источник: `ttm-mini / robolabs_mes / NomenclatureProcessRecord.data`",
        f"- Операций: `{len(steps)}`",
        f"- Связей: `{len(edges)}`",
        f"- Суммарная норма: `{sum(step['normHours'] for step in steps):.1f} ч`",
        f"- SVG A0: `{svg_name}`",
        f"- PDF A0: `{pdf_name}`",
        "",
        "## Операции",
        "",
        "| # | Код | Операция | Участок | Деталь / узел | Норма, ч | Предыдущие | Следующие |",
        "|---:|---|---|---|---|---:|---|---|",
    ]
    for step in steps:
        lines.append(
            "| {sequence} | `{operationId}` | {name} | {section} | {part} | {hours:.1f} | {prev} | {next} |".format(
                sequence=step["sequence"],
                operationId=step["operationId"],
                name=str(step["name"]).replace("|", "\\|"),
                section=str(step["section"]).replace("|", "\\|"),
                part=str(step["partOrAssembly"]).replace("|", "\\|"),
                hours=step["normHours"],
                prev=", ".join(step["previousOperationCodes"]) or "-",
                next=", ".join(step["nextOperationCodes"]) or "-",
            )
        )
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def tree_rows(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_code = {step["operationId"]: step for step in steps}
    edges = graph_edges(steps)
    children: dict[str, list[str]] = defaultdict(list)
    incoming: dict[str, list[str]] = defaultdict(list)
    for source, target in edges:
        children[source].append(target)
        incoming[target].append(source)
    for code in children:
        children[code].sort(key=lambda child: (by_code[child]["sequence"], child))
    roots = [step["operationId"] for step in steps if not incoming.get(step["operationId"])]
    if not roots and steps:
        roots = [steps[0]["operationId"]]
    roots.sort(key=lambda code: (by_code[code]["sequence"], code))
    rows: list[dict[str, Any]] = []
    expanded: set[str] = set()
    primary_row: dict[str, int] = {}

    def add_row(code: str, depth: int, parent: str | None, kind: str, note: str = "") -> int:
        row = {
            "code": code,
            "depth": depth,
            "parent": parent,
            "kind": kind,
            "note": note,
            "step": by_code[code],
        }
        rows.append(row)
        index = len(rows) - 1
        if kind == "node":
            primary_row.setdefault(code, index + 1)
        return index

    def walk(code: str, depth: int, parent: str | None, stack: set[str]) -> None:
        if code in stack:
            add_row(code, depth, parent, "ref", "цикл/повтор в текущей ветке")
            return
        if code in expanded:
            add_row(code, depth, parent, "ref", f"см. основной блок #{primary_row.get(code, '?')}")
            return
        expanded.add(code)
        add_row(code, depth, parent, "node")
        for child in children.get(code, []):
            walk(child, depth + 1, code, stack | {code})

    for root in roots:
        walk(root, 0, None, set())
    for step in steps:
        if step["operationId"] not in expanded:
            walk(step["operationId"], 0, None, set())
    return rows


def tree_dimensions(rows: list[dict[str, Any]]) -> tuple[float, float, float, float, float]:
    usable_h = TREE_PAGE_H_MM - HEADER_MM - FOOTER_MM - 2 * MARGIN_MM
    row_h = min(18.0, max(9.0, usable_h / max(1, len(rows))))
    node_h = max(7.4, row_h - 2.2)
    indent = 13.0 if max((row["depth"] for row in rows), default=0) <= 30 else 10.5
    node_w = 360.0
    return row_h, node_h, indent, node_w, MARGIN_MM + HEADER_MM


def build_tree_svg(record: dict[str, Any], steps: list[dict[str, Any]], out_svg: Path) -> None:
    rows = tree_rows(steps)
    palette = section_palette(steps)
    row_h, node_h, indent, node_w_base, start_y = tree_dimensions(rows)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_hours = sum(step["normHours"] for step in steps)
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{TREE_PAGE_W_MM}mm" height="{TREE_PAGE_H_MM}mm" viewBox="0 0 {TREE_PAGE_W_MM} {TREE_PAGE_H_MM}">',
        "<defs>",
        '<style><![CDATA[text{font-family:Arial,Helvetica,sans-serif}.title{font-size:13px;font-weight:700;fill:#0f172a}.meta{font-size:4.6px;fill:#475569}.row-code{font-size:4.2px;font-weight:700;fill:#0f172a}.row-name{font-size:3.55px;fill:#111827}.row-small{font-size:3.0px;fill:#475569}.edge-label{font-size:2.8px;fill:#334155}.conn{fill:none;stroke:#64748b;stroke-width:.35}.node{stroke:#334155;stroke-width:.35}.ref{fill:#f8fafc;stroke:#94a3b8;stroke-width:.25;stroke-dasharray:1.5 1}.border{fill:#fff;stroke:#0f172a;stroke-width:.5}.legend{font-size:3.5px;fill:#111827}]]></style>',
        "</defs>",
        '<rect x="0" y="0" width="841" height="1189" fill="#ffffff"/>',
        f'<rect class="border" x="{MARGIN_MM}" y="{MARGIN_MM}" width="{TREE_PAGE_W_MM - 2*MARGIN_MM}" height="{TREE_PAGE_H_MM - 2*MARGIN_MM}" />',
        f'<text class="title" x="{MARGIN_MM + 6}" y="{MARGIN_MM + 13}">Дерево связей техпроцесса: {esc(record["equipment"])}</text>',
        f'<text class="meta" x="{MARGIN_MM + 6}" y="{MARGIN_MM + 23}">Код: {esc(record["productCode"])} | Уникальных операций: {len(steps)} | Строк дерева: {len(rows)} | Норма: {total_hours:.1f} ч | Источник: PostgreSQL ttm-mini | {generated}</text>',
        f'<text class="meta" x="{MARGIN_MM + 6}" y="{MARGIN_MM + 32}">Формат: A0 portrait, 841 x 1189 мм. Отступ показывает вложенность: родительская операция -> дочерняя операция. Повторы ведут к основному блоку.</text>',
    ]
    row_pos: dict[int, tuple[float, float, float, float]] = {}
    latest_by_code: dict[str, int] = {}
    for index, row in enumerate(rows):
        depth = row["depth"]
        x = MARGIN_MM + 10 + depth * indent
        y = start_y + index * row_h
        node_w = min(node_w_base, TREE_PAGE_W_MM - MARGIN_MM - x - 4)
        row_pos[index] = (x, y, node_w, node_h)
        parent = row.get("parent")
        if parent:
            parent_index = latest_by_code.get(parent)
            if parent_index is not None:
                px, py, _, ph = row_pos[parent_index]
                lane_x = x - 4.2
                pyc = py + ph / 2
                yc = y + node_h / 2
                lines.append(f'<path class="conn" d="M{px + 5:.2f},{pyc:.2f} H{lane_x:.2f} V{yc:.2f} H{x:.2f}" />')
                lines.append(f'<text class="edge-label" x="{max(MARGIN_MM + 2, lane_x - 17):.2f}" y="{yc - 1.0:.2f}">{esc(parent)} -> {esc(row["code"])}</text>')
        step = row["step"]
        fill = "#ffffff" if row["kind"] == "node" else "#f8fafc"
        stroke_class = "node" if row["kind"] == "node" else "ref"
        color = palette.get(step["section"], "#64748b")
        lines.append(f'<g id="tree-row-{index + 1}-{esc(row["code"])}">')
        lines.append(f'<rect class="{stroke_class}" x="{x:.2f}" y="{y:.2f}" width="{node_w:.2f}" height="{node_h:.2f}" rx="1.8" fill="{fill}" />')
        lines.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="3.4" height="{node_h:.2f}" rx="1.6" fill="{color}" />')
        prefix = f'#{index + 1} {step["sequence"]}. {step["operationId"]}'
        if row["kind"] == "ref":
            prefix += " (ссылка)"
        lines.append(f'<text class="row-code" x="{x + 5.2:.2f}" y="{y + 4.5:.2f}">{esc(prefix)}</text>')
        name_max = max(30, int(node_w / 2.6))
        name = step["name"] if row["kind"] == "node" else f'{step["name"]} - {row["note"]}'
        name_line_count = 1 if node_h < 16 else 2
        for line_no, line in enumerate(wrap_svg_text(name, name_max)[:name_line_count]):
            lines.append(f'<text class="row-name" x="{x + 5.2:.2f}" y="{y + 8.3 + line_no * 3.8:.2f}">{esc(line)}</text>')
        detail = f'{step["section"]} | {step["partOrAssembly"]} | {step["normHours"]:.1f} ч'
        if row["kind"] == "node":
            detail += f' | след.: {", ".join(step["nextOperationCodes"]) or "-"}'
        lines.append(f'<text class="row-small" x="{x + 5.2:.2f}" y="{y + node_h - 1.5:.2f}">{esc(detail[:170])}</text>')
        lines.append("</g>")
        latest_by_code[row["code"]] = index
    legend_x = MARGIN_MM + 6
    legend_y = TREE_PAGE_H_MM - MARGIN_MM - 10
    lines.append(f'<text class="meta" x="{legend_x}" y="{legend_y}">Легенда участков:</text>')
    cursor_x = legend_x + 38
    cursor_y = legend_y
    for section in sorted(palette):
        label = section[:30]
        approx_w = 6 + len(label) * 1.75
        if cursor_x + approx_w > TREE_PAGE_W_MM - MARGIN_MM - 6:
            cursor_x = legend_x + 38
            cursor_y += 5
        lines.append(f'<rect x="{cursor_x:.2f}" y="{cursor_y - 3.5:.2f}" width="3.5" height="3.5" fill="{palette[section]}" />')
        lines.append(f'<text class="legend" x="{cursor_x + 5:.2f}" y="{cursor_y:.2f}">{esc(label)}</text>')
        cursor_x += approx_w
    lines.append("</svg>")
    out_svg.write_text("\n".join(lines), encoding="utf-8")


def build_tree_pdf(record: dict[str, Any], steps: list[dict[str, Any]], out_pdf: Path) -> None:
    register_fonts()
    page_w, page_h = A0
    c = canvas.Canvas(str(out_pdf), pagesize=(page_w, page_h))
    c.setTitle(f"Дерево техпроцесса {record['productCode']}")
    mmx = lambda value: value * mm
    rows = tree_rows(steps)
    palette = section_palette(steps)
    row_h, node_h, indent, node_w_base, start_y = tree_dimensions(rows)
    total_hours = sum(step["normHours"] for step in steps)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.setFillColor(colors.white)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.setLineWidth(0.5)
    c.rect(mmx(MARGIN_MM), mmx(MARGIN_MM), mmx(TREE_PAGE_W_MM - 2 * MARGIN_MM), mmx(TREE_PAGE_H_MM - 2 * MARGIN_MM), stroke=1, fill=0)
    c.setFont(FONT_BOLD, 13)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(mmx(MARGIN_MM + 6), mmx(TREE_PAGE_H_MM - MARGIN_MM - 13), f"Дерево связей техпроцесса: {record['equipment']}")
    c.setFont(FONT_NAME, 4.6)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(mmx(MARGIN_MM + 6), mmx(TREE_PAGE_H_MM - MARGIN_MM - 23), f"Код: {record['productCode']} | Уникальных операций: {len(steps)} | Строк дерева: {len(rows)} | Норма: {total_hours:.1f} ч | PostgreSQL ttm-mini | {generated}")
    c.drawString(mmx(MARGIN_MM + 6), mmx(TREE_PAGE_H_MM - MARGIN_MM - 32), "A0 portrait. Отступ показывает вложенность: родительская операция -> дочерняя операция. Повторы ведут к основному блоку.")
    row_pos: dict[int, tuple[float, float, float, float]] = {}
    latest_by_code: dict[str, int] = {}
    for index, row in enumerate(rows):
        depth = row["depth"]
        x = MARGIN_MM + 10 + depth * indent
        y = start_y + index * row_h
        node_w = min(node_w_base, TREE_PAGE_W_MM - MARGIN_MM - x - 4)
        row_pos[index] = (x, y, node_w, node_h)
        parent = row.get("parent")
        if parent:
            parent_index = latest_by_code.get(parent)
            if parent_index is not None:
                px, py, _, ph = row_pos[parent_index]
                lane_x = x - 4.2
                pyc = py + ph / 2
                yc = y + node_h / 2
                c.setStrokeColor(colors.HexColor("#64748b"))
                c.setLineWidth(0.35)
                c.line(mmx(px + 5), mmx(TREE_PAGE_H_MM - pyc), mmx(lane_x), mmx(TREE_PAGE_H_MM - pyc))
                c.line(mmx(lane_x), mmx(TREE_PAGE_H_MM - pyc), mmx(lane_x), mmx(TREE_PAGE_H_MM - yc))
                c.line(mmx(lane_x), mmx(TREE_PAGE_H_MM - yc), mmx(x), mmx(TREE_PAGE_H_MM - yc))
                c.setFont(FONT_NAME, 2.8)
                c.setFillColor(colors.HexColor("#334155"))
                c.drawString(mmx(max(MARGIN_MM + 2, lane_x - 17)), mmx(TREE_PAGE_H_MM - yc + 1.0), f"{parent} -> {row['code']}")
        step = row["step"]
        c.setFillColor(colors.white if row["kind"] == "node" else colors.HexColor("#f8fafc"))
        c.setStrokeColor(colors.HexColor("#334155") if row["kind"] == "node" else colors.HexColor("#94a3b8"))
        c.setLineWidth(0.35 if row["kind"] == "node" else 0.25)
        c.roundRect(mmx(x), mmx(TREE_PAGE_H_MM - y - node_h), mmx(node_w), mmx(node_h), mmx(1.8), stroke=1, fill=1)
        c.setFillColor(hex_color(palette.get(step["section"], "#64748b")))
        c.roundRect(mmx(x), mmx(TREE_PAGE_H_MM - y - node_h), mmx(3.4), mmx(node_h), mmx(1.6), stroke=0, fill=1)
        prefix = f"#{index + 1} {step['sequence']}. {step['operationId']}"
        if row["kind"] == "ref":
            prefix += " (ссылка)"
        c.setFont(FONT_BOLD, 4.2)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(mmx(x + 5.2), mmx(TREE_PAGE_H_MM - y - 4.5), prefix)
        name_max = max(30, int(node_w / 2.6))
        name = step["name"] if row["kind"] == "node" else f"{step['name']} - {row['note']}"
        name_line_count = 1 if node_h < 16 else 2
        draw_wrapped(c, name, mmx(x + 5.2), mmx(TREE_PAGE_H_MM - y - 8.3), name_max, mmx(3.8), name_line_count, FONT_NAME, 3.55, colors.HexColor("#111827"))
        detail = f"{step['section']} | {step['partOrAssembly']} | {step['normHours']:.1f} ч"
        if row["kind"] == "node":
            detail += f" | след.: {', '.join(step['nextOperationCodes']) or '-'}"
        c.setFont(FONT_NAME, 3.0)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(mmx(x + 5.2), mmx(TREE_PAGE_H_MM - y - node_h + 1.5), detail[:170])
        latest_by_code[row["code"]] = index
    legend_x = MARGIN_MM + 6
    legend_y = MARGIN_MM + 10
    c.setFont(FONT_NAME, 4.6)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(mmx(legend_x), mmx(legend_y), "Легенда участков:")
    cursor_x = legend_x + 38
    cursor_y = legend_y
    c.setFont(FONT_NAME, 3.5)
    for section in sorted(palette):
        label = section[:30]
        approx_w = 6 + len(label) * 1.75
        if cursor_x + approx_w > TREE_PAGE_W_MM - MARGIN_MM - 6:
            cursor_x = legend_x + 38
            cursor_y -= 5
        c.setFillColor(hex_color(palette[section]))
        c.rect(mmx(cursor_x), mmx(cursor_y - 3.5), mmx(3.5), mmx(3.5), stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#111827"))
        c.drawString(mmx(cursor_x + 5), mmx(cursor_y - 0.2), label)
        cursor_x += approx_w
    c.showPage()
    c.save()


def huge_layout(steps: list[dict[str, Any]]) -> tuple[dict[str, tuple[float, float]], list[tuple[str, str]], dict[int, list[str]], float, float, float, float]:
    by_code = {step["operationId"]: step for step in steps}
    edges = graph_edges(steps)
    incoming: dict[str, list[str]] = defaultdict(list)
    outgoing: dict[str, list[str]] = defaultdict(list)
    for source, target in edges:
        incoming[target].append(source)
        outgoing[source].append(target)
    depth: dict[str, int] = {}

    def visit(code: str, stack: set[str]) -> int:
        if code in depth:
            return depth[code]
        if code in stack:
            return 0
        parents = incoming.get(code, [])
        depth[code] = 0 if not parents else max(visit(parent, stack | {code}) + 1 for parent in parents)
        return depth[code]

    for step in steps:
        visit(step["operationId"], set())
    levels: dict[int, list[str]] = defaultdict(list)
    for code, level in depth.items():
        levels[level].append(code)
    order_index = {step["operationId"]: index for index, step in enumerate(steps)}
    for level in levels:
        levels[level].sort(key=lambda code: (by_code[code]["sequence"], code))
    row_pos: dict[str, float] = {
        code: float(index)
        for level in sorted(levels)
        for index, code in enumerate(levels[level])
    }
    for _ in range(8):
        for level in sorted(levels)[1:]:
            levels[level].sort(
                key=lambda code: (
                    sum(row_pos[parent] for parent in incoming.get(code, [])) / max(1, len(incoming.get(code, []))),
                    by_code[code]["sequence"],
                    code,
                )
            )
            for index, code in enumerate(levels[level]):
                row_pos[code] = float(index)
        for level in sorted(levels, reverse=True)[:-1]:
            levels[level].sort(
                key=lambda code: (
                    sum(row_pos[child] for child in outgoing.get(code, [])) / max(1, len(outgoing.get(code, []))),
                    order_index.get(code, 0),
                    code,
                )
            )
            for index, code in enumerate(levels[level]):
                row_pos[code] = float(index)
    node_w = 105.0
    node_h = 40.0
    col_step = 150.0
    row_step = 70.0
    start_x = 70.0
    start_y = 92.0
    positions = {
        code: (start_x + depth[code] * col_step, start_y + index * row_step)
        for level, codes in levels.items()
        for index, code in enumerate(codes)
    }
    return positions, edges, levels, node_w, node_h, col_step, row_step


def huge_page_size(positions: dict[str, tuple[float, float]], edges: list[tuple[str, str]], node_w: float, node_h: float) -> tuple[float, float, float, float]:
    max_x = max((x + node_w for x, _ in positions.values()), default=100)
    max_y = max((y + node_h for _, y in positions.values()), default=100)
    bus_start = max_y + 55
    page_w = max_x + 95
    page_h = bus_start + max(1, len(edges)) * 7.2 + 70
    return page_w, page_h, bus_start, 7.2


def build_huge_svg(record: dict[str, Any], steps: list[dict[str, Any]], out_svg: Path) -> None:
    positions, edges, _levels, node_w, node_h, _col_step, _row_step = huge_layout(steps)
    page_w, page_h, bus_start, bus_gap = huge_page_size(positions, edges, node_w, node_h)
    palette = section_palette(steps)
    by_code = {step["operationId"]: step for step in steps}
    edge_order = sorted(edges, key=lambda edge: (by_code[edge[0]]["sequence"], by_code[edge[1]]["sequence"], edge[0], edge[1]))
    total_hours = sum(step["normHours"] for step in steps)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{page_w:.1f}mm" height="{page_h:.1f}mm" viewBox="0 0 {page_w:.1f} {page_h:.1f}">',
        "<defs>",
        '<marker id="huge-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L9,4.5 L0,9 Z" fill="#111827"/></marker>',
        '<style><![CDATA[text{font-family:Arial,Helvetica,sans-serif}.title{font-size:18px;font-weight:700;fill:#0f172a}.meta{font-size:6px;fill:#475569}.node{fill:#fff;stroke:#111827;stroke-width:.45}.code{font-size:5.2px;font-weight:700;fill:#0f172a}.name{font-size:4.35px;fill:#111827}.small{font-size:3.75px;fill:#475569}.edge{fill:none;stroke:#111827;stroke-width:.34;marker-end:url(#huge-arrow)}.edge-label{font-size:3.45px;fill:#111827}.edge-lane{stroke:#cbd5e1;stroke-width:.16}.level-line{stroke:#e2e8f0;stroke-width:.25}.legend{font-size:4.1px;fill:#111827}.border{fill:#fff;stroke:#0f172a;stroke-width:.6}]]></style>',
        "</defs>",
        f'<rect x="0" y="0" width="{page_w:.1f}" height="{page_h:.1f}" fill="#ffffff"/>',
        f'<rect class="border" x="10" y="10" width="{page_w - 20:.1f}" height="{page_h - 20:.1f}" />',
        f'<text class="title" x="24" y="32">Огромный граф техпроцесса: {esc(record["equipment"])}</text>',
        f'<text class="meta" x="24" y="46">Код: {esc(record["productCode"])} | Операций: {len(steps)} | Связей: {len(edges)} | Норма: {total_hours:.1f} ч | PostgreSQL ttm-mini | {generated}</text>',
        f'<text class="meta" x="24" y="58">Связи вынесены в отдельные нижние шины: каждая линия подписана source -> target и не смешивается с другими связями.</text>',
    ]
    max_level = max((round((x - 70.0) / 150.0) for x, _ in positions.values()), default=0)
    for level in range(max_level + 1):
        x = 70 + level * 150
        lines.append(f'<line class="level-line" x1="{x - 18:.1f}" y1="78" x2="{x - 18:.1f}" y2="{bus_start - 18:.1f}" />')
        lines.append(f'<text class="meta" x="{x:.1f}" y="78">Уровень {level + 1}</text>')
    for lane, edge in enumerate(edge_order):
        source, target = edge
        sx, sy = positions[source]
        tx0, ty0 = positions[target]
        source_step = by_code[source]
        color = palette.get(source_step["section"], "#111827")
        y_bus = bus_start + lane * bus_gap
        exit_x = sx + node_w + 8 + (lane % 8) * 1.2
        enter_x = tx0 - 8 - (lane % 8) * 1.2
        y1 = sy + node_h / 2
        y2 = ty0 + node_h / 2
        lines.append(f'<line class="edge-lane" x1="24" y1="{y_bus:.2f}" x2="{page_w - 24:.2f}" y2="{y_bus:.2f}" />')
        lines.append(f'<path class="edge" stroke="{color}" d="M{sx + node_w:.2f},{y1:.2f} H{exit_x:.2f} V{y_bus:.2f} H{enter_x:.2f} V{y2:.2f} H{tx0:.2f}" />')
        label_x = min(max(exit_x + 6, 24), page_w - 170)
        lines.append(f'<text class="edge-label" x="{label_x:.2f}" y="{y_bus - 1.1:.2f}">{lane + 1}. {esc(source)} -> {esc(target)}</text>')
    for step in steps:
        x, y = positions[step["operationId"]]
        color = palette.get(step["section"], "#475569")
        lines.append(f'<g id="huge-{esc(step["operationId"])}">')
        lines.append(f'<rect class="node" x="{x:.2f}" y="{y:.2f}" width="{node_w:.2f}" height="{node_h:.2f}" rx="2.4" />')
        lines.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="5" height="{node_h:.2f}" rx="2.2" fill="{color}" />')
        lines.append(f'<text class="code" x="{x + 7:.2f}" y="{y + 6.5:.2f}">{esc(step["sequence"])}. {esc(step["operationId"])}</text>')
        for line_no, line in enumerate(wrap_svg_text(step["name"], 29)[:3]):
            lines.append(f'<text class="name" x="{x + 7:.2f}" y="{y + 13 + line_no * 4.8:.2f}">{esc(line)}</text>')
        lines.append(f'<text class="small" x="{x + 7:.2f}" y="{y + 31.5:.2f}">{esc(step["section"][:34])}</text>')
        lines.append(f'<text class="small" x="{x + 7:.2f}" y="{y + 36.5:.2f}">{esc(step["partOrAssembly"][:34])} | {step["normHours"]:.1f} ч</text>')
        lines.append("</g>")
    legend_x = 24
    legend_y = page_h - 27
    lines.append(f'<text class="meta" x="{legend_x}" y="{legend_y}">Легенда участков:</text>')
    cursor_x = legend_x + 48
    cursor_y = legend_y
    for section in sorted(palette):
        label = section[:36]
        approx_w = 8 + len(label) * 2.0
        if cursor_x + approx_w > page_w - 24:
            cursor_x = legend_x + 48
            cursor_y += 6
        lines.append(f'<rect x="{cursor_x:.2f}" y="{cursor_y - 4:.2f}" width="4" height="4" fill="{palette[section]}" />')
        lines.append(f'<text class="legend" x="{cursor_x + 6:.2f}" y="{cursor_y:.2f}">{esc(label)}</text>')
        cursor_x += approx_w
    lines.append("</svg>")
    out_svg.write_text("\n".join(lines), encoding="utf-8")


def build_huge_pdf(record: dict[str, Any], steps: list[dict[str, Any]], out_pdf: Path) -> None:
    register_fonts()
    positions, edges, _levels, node_w, node_h, _col_step, _row_step = huge_layout(steps)
    page_w_mm, page_h_mm, bus_start, bus_gap = huge_page_size(positions, edges, node_w, node_h)
    page_w, page_h = page_w_mm * mm, page_h_mm * mm
    c = canvas.Canvas(str(out_pdf), pagesize=(page_w, page_h))
    c.setTitle(f"Огромный граф техпроцесса {record['productCode']}")
    mmx = lambda value: value * mm
    by_code = {step["operationId"]: step for step in steps}
    edge_order = sorted(edges, key=lambda edge: (by_code[edge[0]]["sequence"], by_code[edge[1]]["sequence"], edge[0], edge[1]))
    palette = section_palette(steps)
    total_hours = sum(step["normHours"] for step in steps)
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.setFillColor(colors.white)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.setLineWidth(0.6)
    c.rect(mmx(10), mmx(10), mmx(page_w_mm - 20), mmx(page_h_mm - 20), stroke=1, fill=0)
    c.setFont(FONT_BOLD, 18)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(mmx(24), mmx(page_h_mm - 32), f"Огромный граф техпроцесса: {record['equipment']}")
    c.setFont(FONT_NAME, 6)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(mmx(24), mmx(page_h_mm - 46), f"Код: {record['productCode']} | Операций: {len(steps)} | Связей: {len(edges)} | Норма: {total_hours:.1f} ч | PostgreSQL ttm-mini | {generated}")
    c.drawString(mmx(24), mmx(page_h_mm - 58), "Связи вынесены в отдельные нижние шины: каждая линия подписана source -> target и не смешивается с другими связями.")
    max_level = max((round((x - 70.0) / 150.0) for x, _ in positions.values()), default=0)
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.25)
    c.setFont(FONT_NAME, 6)
    c.setFillColor(colors.HexColor("#475569"))
    for level in range(max_level + 1):
        x = 70 + level * 150
        c.line(mmx(x - 18), mmx(page_h_mm - 78), mmx(x - 18), mmx(page_h_mm - bus_start + 18))
        c.drawString(mmx(x), mmx(page_h_mm - 78), f"Уровень {level + 1}")
    for lane, edge in enumerate(edge_order):
        source, target = edge
        sx, sy = positions[source]
        tx0, ty0 = positions[target]
        source_step = by_code[source]
        color = hex_color(palette.get(source_step["section"], "#111827"))
        y_bus = bus_start + lane * bus_gap
        exit_x = sx + node_w + 8 + (lane % 8) * 1.2
        enter_x = tx0 - 8 - (lane % 8) * 1.2
        y1 = sy + node_h / 2
        y2 = ty0 + node_h / 2
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setLineWidth(0.16)
        c.line(mmx(24), mmx(page_h_mm - y_bus), mmx(page_w_mm - 24), mmx(page_h_mm - y_bus))
        c.setStrokeColor(color)
        c.setLineWidth(0.34)
        for x_a, y_a, x_b, y_b in [
            (sx + node_w, y1, exit_x, y1),
            (exit_x, y1, exit_x, y_bus),
            (exit_x, y_bus, enter_x, y_bus),
            (enter_x, y_bus, enter_x, y2),
            (enter_x, y2, tx0, y2),
        ]:
            c.line(mmx(x_a), mmx(page_h_mm - y_a), mmx(x_b), mmx(page_h_mm - y_b))
        c.line(mmx(tx0), mmx(page_h_mm - y2), mmx(tx0 - 2.6), mmx(page_h_mm - y2 + 1.5))
        c.line(mmx(tx0), mmx(page_h_mm - y2), mmx(tx0 - 2.6), mmx(page_h_mm - y2 - 1.5))
        c.setFont(FONT_NAME, 3.45)
        c.setFillColor(colors.HexColor("#111827"))
        label_x = min(max(exit_x + 6, 24), page_w_mm - 170)
        c.drawString(mmx(label_x), mmx(page_h_mm - y_bus + 1.1), f"{lane + 1}. {source} -> {target}")
    for step in steps:
        x, y = positions[step["operationId"]]
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#111827"))
        c.setLineWidth(0.45)
        c.roundRect(mmx(x), mmx(page_h_mm - y - node_h), mmx(node_w), mmx(node_h), mmx(2.4), stroke=1, fill=1)
        c.setFillColor(hex_color(palette.get(step["section"], "#475569")))
        c.roundRect(mmx(x), mmx(page_h_mm - y - node_h), mmx(5), mmx(node_h), mmx(2.2), stroke=0, fill=1)
        c.setFont(FONT_BOLD, 5.2)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(mmx(x + 7), mmx(page_h_mm - y - 6.5), f"{step['sequence']}. {step['operationId']}")
        draw_wrapped(c, step["name"], mmx(x + 7), mmx(page_h_mm - y - 13), 29, mmx(4.8), 3, FONT_NAME, 4.35, colors.HexColor("#111827"))
        c.setFont(FONT_NAME, 3.75)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(mmx(x + 7), mmx(page_h_mm - y - 31.5), step["section"][:34])
        c.drawString(mmx(x + 7), mmx(page_h_mm - y - 36.5), f"{step['partOrAssembly'][:34]} | {step['normHours']:.1f} ч")
    c.showPage()
    c.save()


def a2_wrapped_layout(steps: list[dict[str, Any]]) -> tuple[dict[str, tuple[float, float, float, float]], list[tuple[str, str]], int, int]:
    _positions, edges, levels, _node_w, _node_h, _col_step, _row_step = huge_layout(steps)
    max_level = max(levels.keys(), default=0)
    columns_per_band = 7 if max_level >= 24 else 6
    band_count = max(1, math.ceil((max_level + 1) / columns_per_band))
    margin = 4.0
    usable_w = A2_PAGE_W_MM - 2 * margin
    usable_h = A2_PAGE_H_MM - 2 * margin
    col_w = usable_w / columns_per_band
    band_h = usable_h / band_count
    layout: dict[str, tuple[float, float, float, float]] = {}
    for band in range(band_count):
        level_numbers = [level for level in range(band * columns_per_band, min((band + 1) * columns_per_band, max_level + 1))]
        max_rows = max((len(levels.get(level, [])) for level in level_numbers), default=1)
        row_step = max(8.5, (band_h - 8.0) / max(1, max_rows))
        node_h = min(18.0, max(7.2, row_step - 1.8))
        node_w = max(34.0, col_w - 5.0)
        for level in level_numbers:
            codes = levels.get(level, [])
            col = level % columns_per_band
            x = margin + col * col_w + 2.0
            content_h = max(1, len(codes)) * row_step
            band_y = margin + band * band_h
            y_offset = max(3.0, (band_h - content_h) / 2)
            for row, code in enumerate(codes):
                y = band_y + y_offset + row * row_step
                layout[code] = (x, y, node_w, node_h)
    return layout, edges, columns_per_band, band_count


def build_a2_clean_svg(record: dict[str, Any], steps: list[dict[str, Any]], out_svg: Path) -> None:
    layout, edges, columns_per_band, band_count = a2_wrapped_layout(steps)
    palette = section_palette(steps)
    by_code = {step["operationId"]: step for step in steps}
    edge_order = sorted(edges, key=lambda edge: (by_code[edge[0]]["sequence"], by_code[edge[1]]["sequence"], edge[0], edge[1]))
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{A2_PAGE_W_MM}mm" height="{A2_PAGE_H_MM}mm" viewBox="0 0 {A2_PAGE_W_MM} {A2_PAGE_H_MM}">',
        "<defs>",
        '<marker id="a2-arrow" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="#111827"/></marker>',
        '<style><![CDATA[text{font-family:Arial,Helvetica,sans-serif}.node{fill:#fff;stroke:#111827;stroke-width:.25}.code{font-size:2.9px;font-weight:700;fill:#0f172a}.name{font-size:2.45px;fill:#111827}.small{font-size:2.1px;fill:#475569}.edge{fill:none;stroke:#111827;stroke-width:.18;marker-end:url(#a2-arrow);opacity:.82}.edge-label{font-size:1.75px;fill:#334155}.band{fill:none;stroke:#e2e8f0;stroke-width:.18}.band-title{font-size:2.0px;fill:#94a3b8}]]></style>',
        "</defs>",
        f'<rect x="0" y="0" width="{A2_PAGE_W_MM}" height="{A2_PAGE_H_MM}" fill="#ffffff"/>',
    ]
    band_h = (A2_PAGE_H_MM - 8.0) / band_count
    for band in range(band_count):
        y = 4.0 + band * band_h
        lines.append(f'<rect class="band" x="4" y="{y:.2f}" width="{A2_PAGE_W_MM - 8:.2f}" height="{band_h:.2f}" />')
        level_from = band * columns_per_band + 1
        level_to = min((band + 1) * columns_per_band, max(round((max((x for x, *_ in layout.values()), default=0) - 6) / 1), level_from))
        lines.append(f'<text class="band-title" x="5.5" y="{y + 3.0:.2f}">уровни {level_from}-{level_from + columns_per_band - 1}</text>')
    for index, (source, target) in enumerate(edge_order):
        if source not in layout or target not in layout:
            continue
        sx, sy, sw, sh = layout[source]
        tx0, ty0, _tw, th = layout[target]
        color = palette.get(by_code[source]["section"], "#111827")
        y1 = sy + sh / 2
        y2 = ty0 + th / 2
        x1 = sx + sw
        x2 = tx0
        if tx0 > sx:
            mid = (x1 + x2) / 2 + ((index % 5) - 2) * 0.7
            d = f'M{x1:.2f},{y1:.2f} H{mid:.2f} V{y2:.2f} H{x2:.2f}'
            label_x = min(max(mid + 0.8, 5.0), A2_PAGE_W_MM - 28.0)
            label_y = (y1 + y2) / 2 - 0.7
        else:
            lane_x = A2_PAGE_W_MM - 5.5 - (index % 7) * 1.6
            d = f'M{x1:.2f},{y1:.2f} H{lane_x:.2f} V{y2:.2f} H{x2:.2f}'
            label_x = min(max(lane_x - 25.0, 5.0), A2_PAGE_W_MM - 30.0)
            label_y = (y1 + y2) / 2 - 0.7
        lines.append(f'<path class="edge" stroke="{color}" d="{d}" />')
        lines.append(f'<text class="edge-label" x="{label_x:.2f}" y="{label_y:.2f}">{esc(source)}->{esc(target)}</text>')
    for step in steps:
        x, y, node_w, node_h = layout[step["operationId"]]
        color = palette.get(step["section"], "#475569")
        lines.append(f'<g id="a2-{esc(step["operationId"])}">')
        lines.append(f'<rect class="node" x="{x:.2f}" y="{y:.2f}" width="{node_w:.2f}" height="{node_h:.2f}" rx="1.0" />')
        lines.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="2.0" height="{node_h:.2f}" rx=".8" fill="{color}" />')
        lines.append(f'<text class="code" x="{x + 2.8:.2f}" y="{y + 3.2:.2f}">{esc(step["sequence"])}. {esc(step["operationId"])}</text>')
        name_lines = 1 if node_h < 10 else 2
        for line_no, line in enumerate(wrap_svg_text(step["name"], max(12, int(node_w / 1.9)))[:name_lines]):
            lines.append(f'<text class="name" x="{x + 2.8:.2f}" y="{y + 6.3 + line_no * 2.7:.2f}">{esc(line)}</text>')
        if node_h >= 12:
            lines.append(f'<text class="small" x="{x + 2.8:.2f}" y="{y + node_h - 2.0:.2f}">{esc(step["section"][:24])} | {step["normHours"]:.1f}ч</text>')
        lines.append("</g>")
    lines.append("</svg>")
    out_svg.write_text("\n".join(lines), encoding="utf-8")


def build_a2_clean_pdf(record: dict[str, Any], steps: list[dict[str, Any]], out_pdf: Path) -> None:
    register_fonts()
    page_w, page_h = A2_PAGE_W_MM * mm, A2_PAGE_H_MM * mm
    c = canvas.Canvas(str(out_pdf), pagesize=(page_w, page_h))
    c.setTitle(f"A2 graph {record['productCode']}")
    mmx = lambda value: value * mm
    layout, edges, columns_per_band, band_count = a2_wrapped_layout(steps)
    palette = section_palette(steps)
    by_code = {step["operationId"]: step for step in steps}
    edge_order = sorted(edges, key=lambda edge: (by_code[edge[0]]["sequence"], by_code[edge[1]]["sequence"], edge[0], edge[1]))
    c.setFillColor(colors.white)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    band_h = (A2_PAGE_H_MM - 8.0) / band_count
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.18)
    c.setFont(FONT_NAME, 2.0)
    c.setFillColor(colors.HexColor("#94a3b8"))
    for band in range(band_count):
        y = 4.0 + band * band_h
        c.rect(mmx(4), mmx(A2_PAGE_H_MM - y - band_h), mmx(A2_PAGE_W_MM - 8), mmx(band_h), stroke=1, fill=0)
        level_from = band * columns_per_band + 1
        c.drawString(mmx(5.5), mmx(A2_PAGE_H_MM - y - 3.0), f"уровни {level_from}-{level_from + columns_per_band - 1}")
    for index, (source, target) in enumerate(edge_order):
        if source not in layout or target not in layout:
            continue
        sx, sy, sw, sh = layout[source]
        tx0, ty0, _tw, th = layout[target]
        y1 = sy + sh / 2
        y2 = ty0 + th / 2
        x1 = sx + sw
        x2 = tx0
        c.setStrokeColor(hex_color(palette.get(by_code[source]["section"], "#111827")))
        c.setLineWidth(0.18)
        if tx0 > sx:
            mid = (x1 + x2) / 2 + ((index % 5) - 2) * 0.7
            segments = [(x1, y1, mid, y1), (mid, y1, mid, y2), (mid, y2, x2, y2)]
            label_x = min(max(mid + 0.8, 5.0), A2_PAGE_W_MM - 28.0)
        else:
            lane_x = A2_PAGE_W_MM - 5.5 - (index % 7) * 1.6
            segments = [(x1, y1, lane_x, y1), (lane_x, y1, lane_x, y2), (lane_x, y2, x2, y2)]
            label_x = min(max(lane_x - 25.0, 5.0), A2_PAGE_W_MM - 30.0)
        for xa, ya, xb, yb in segments:
            c.line(mmx(xa), mmx(A2_PAGE_H_MM - ya), mmx(xb), mmx(A2_PAGE_H_MM - yb))
        c.line(mmx(x2), mmx(A2_PAGE_H_MM - y2), mmx(x2 - 1.5), mmx(A2_PAGE_H_MM - y2 + 0.8))
        c.line(mmx(x2), mmx(A2_PAGE_H_MM - y2), mmx(x2 - 1.5), mmx(A2_PAGE_H_MM - y2 - 0.8))
        c.setFont(FONT_NAME, 1.75)
        c.setFillColor(colors.HexColor("#334155"))
        c.drawString(mmx(label_x), mmx(A2_PAGE_H_MM - ((y1 + y2) / 2 - 0.7)), f"{source}->{target}")
    for step in steps:
        x, y, node_w, node_h = layout[step["operationId"]]
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#111827"))
        c.setLineWidth(0.25)
        c.roundRect(mmx(x), mmx(A2_PAGE_H_MM - y - node_h), mmx(node_w), mmx(node_h), mmx(1.0), stroke=1, fill=1)
        c.setFillColor(hex_color(palette.get(step["section"], "#475569")))
        c.roundRect(mmx(x), mmx(A2_PAGE_H_MM - y - node_h), mmx(2.0), mmx(node_h), mmx(0.8), stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont(FONT_BOLD, 2.9)
        c.drawString(mmx(x + 2.8), mmx(A2_PAGE_H_MM - y - 3.2), f"{step['sequence']}. {step['operationId']}")
        name_lines = 1 if node_h < 10 else 2
        draw_wrapped(c, step["name"], mmx(x + 2.8), mmx(A2_PAGE_H_MM - y - 6.3), max(12, int(node_w / 1.9)), mmx(2.7), name_lines, FONT_NAME, 2.45, colors.HexColor("#111827"))
        if node_h >= 12:
            c.setFont(FONT_NAME, 2.1)
            c.setFillColor(colors.HexColor("#475569"))
            c.drawString(mmx(x + 2.8), mmx(A2_PAGE_H_MM - y - node_h + 2.0), f"{step['section'][:24]} | {step['normHours']:.1f}ч")
    c.showPage()
    c.save()


def a2_vertical_layout(steps: list[dict[str, Any]]) -> tuple[dict[str, tuple[float, float, float, float]], list[tuple[str, str]], dict[int, list[str]]]:
    _positions, edges, levels, _node_w, _node_h, _col_step, _row_step = huge_layout(steps)
    margin = 4.0
    usable_w = A2_PAGE_W_MM - 2 * margin
    usable_h = A2_PAGE_H_MM - 2 * margin
    level_count = max(levels.keys(), default=0) + 1
    max_in_level = max((len(codes) for codes in levels.values()), default=1)
    level_step = usable_h / max(1, level_count)
    node_h = min(12.0, max(8.4, level_step - 7.0))
    col_gap = 6.0
    node_w = min(58.0, max(28.0, (usable_w - (max_in_level - 1) * col_gap) / max(1, max_in_level)))
    layout: dict[str, tuple[float, float, float, float]] = {}
    for level in sorted(levels):
        codes = levels[level]
        row_width = len(codes) * node_w + max(0, len(codes) - 1) * col_gap
        start_x = margin + max(0, (usable_w - row_width) / 2)
        y = margin + level * level_step + max(0, (level_step - node_h) / 2)
        for index, code in enumerate(codes):
            x = start_x + index * (node_w + col_gap)
            layout[code] = (x, y, node_w, node_h)
    return layout, edges, levels


def build_a2_vertical_svg(record: dict[str, Any], steps: list[dict[str, Any]], out_svg: Path) -> None:
    layout, edges, levels = a2_vertical_layout(steps)
    palette = section_palette(steps)
    by_code = {step["operationId"]: step for step in steps}
    edge_order = sorted(edges, key=lambda edge: (by_code[edge[0]]["sequence"], by_code[edge[1]]["sequence"], edge[0], edge[1]))
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{A2_PAGE_W_MM}mm" height="{A2_PAGE_H_MM}mm" viewBox="0 0 {A2_PAGE_W_MM} {A2_PAGE_H_MM}">',
        "<defs>",
        '<marker id="a2v-arrow" markerWidth="6" markerHeight="6" refX="3" refY="5.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,0 L3,6 Z" fill="#111827"/></marker>',
        '<style><![CDATA[text{font-family:Arial,Helvetica,sans-serif}.node{fill:#fff;stroke:#111827;stroke-width:.25}.code{font-size:2.9px;font-weight:700;fill:#0f172a}.name{font-size:2.35px;fill:#111827}.small{font-size:2.0px;fill:#475569}.edge{fill:none;stroke:#111827;stroke-width:.18;marker-end:url(#a2v-arrow);opacity:.82}.edge-label{font-size:1.65px;fill:#334155}.level{stroke:#eef2f7;stroke-width:.16}]]></style>',
        "</defs>",
        f'<rect x="0" y="0" width="{A2_PAGE_W_MM}" height="{A2_PAGE_H_MM}" fill="#ffffff"/>',
    ]
    for level in sorted(levels):
        if not levels[level]:
            continue
        y_values = [layout[code][1] for code in levels[level]]
        y = min(y_values) - 1.0
        lines.append(f'<line class="level" x1="4" y1="{y:.2f}" x2="{A2_PAGE_W_MM - 4:.2f}" y2="{y:.2f}" />')
    for index, (source, target) in enumerate(edge_order):
        if source not in layout or target not in layout:
            continue
        sx, sy, sw, sh = layout[source]
        tx0, ty0, tw, _th = layout[target]
        color = palette.get(by_code[source]["section"], "#111827")
        x1 = sx + sw / 2
        y1 = sy + sh
        x2 = tx0 + tw / 2
        y2 = ty0
        mid_y = (y1 + y2) / 2 + ((index % 5) - 2) * 0.45
        d = f'M{x1:.2f},{y1:.2f} V{mid_y:.2f} H{x2:.2f} V{y2:.2f}'
        label_x = min(max((x1 + x2) / 2 + 1.0, 4.5), A2_PAGE_W_MM - 23.0)
        label_y = mid_y - 0.6
        lines.append(f'<path class="edge" stroke="{color}" d="{d}" />')
        lines.append(f'<text class="edge-label" x="{label_x:.2f}" y="{label_y:.2f}">{esc(source)}->{esc(target)}</text>')
    for step in steps:
        x, y, node_w, node_h = layout[step["operationId"]]
        color = palette.get(step["section"], "#475569")
        lines.append(f'<g id="a2v-{esc(step["operationId"])}">')
        lines.append(f'<rect class="node" x="{x:.2f}" y="{y:.2f}" width="{node_w:.2f}" height="{node_h:.2f}" rx="1.0" />')
        lines.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="2.0" height="{node_h:.2f}" rx=".8" fill="{color}" />')
        lines.append(f'<text class="code" x="{x + 2.8:.2f}" y="{y + 3.2:.2f}">{esc(step["sequence"])}. {esc(step["operationId"])}</text>')
        name_lines = 1 if node_h < 11 else 2
        for line_no, line in enumerate(wrap_svg_text(step["name"], max(12, int(node_w / 1.9)))[:name_lines]):
            lines.append(f'<text class="name" x="{x + 2.8:.2f}" y="{y + 6.2 + line_no * 2.55:.2f}">{esc(line)}</text>')
        if node_h >= 12.0:
            lines.append(f'<text class="small" x="{x + 2.8:.2f}" y="{y + node_h - 1.8:.2f}">{esc(step["section"][:24])} | {step["normHours"]:.1f}ч</text>')
        lines.append("</g>")
    lines.append("</svg>")
    out_svg.write_text("\n".join(lines), encoding="utf-8")


def build_a2_vertical_pdf(record: dict[str, Any], steps: list[dict[str, Any]], out_pdf: Path) -> None:
    register_fonts()
    page_w, page_h = A2_PAGE_W_MM * mm, A2_PAGE_H_MM * mm
    c = canvas.Canvas(str(out_pdf), pagesize=(page_w, page_h))
    c.setTitle(f"A2 vertical graph {record['productCode']}")
    mmx = lambda value: value * mm
    layout, edges, levels = a2_vertical_layout(steps)
    palette = section_palette(steps)
    by_code = {step["operationId"]: step for step in steps}
    edge_order = sorted(edges, key=lambda edge: (by_code[edge[0]]["sequence"], by_code[edge[1]]["sequence"], edge[0], edge[1]))
    c.setFillColor(colors.white)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#eef2f7"))
    c.setLineWidth(0.16)
    for level in sorted(levels):
        if not levels[level]:
            continue
        y = min(layout[code][1] for code in levels[level]) - 1.0
        c.line(mmx(4), mmx(A2_PAGE_H_MM - y), mmx(A2_PAGE_W_MM - 4), mmx(A2_PAGE_H_MM - y))
    for index, (source, target) in enumerate(edge_order):
        if source not in layout or target not in layout:
            continue
        sx, sy, sw, sh = layout[source]
        tx0, ty0, tw, _th = layout[target]
        x1 = sx + sw / 2
        y1 = sy + sh
        x2 = tx0 + tw / 2
        y2 = ty0
        mid_y = (y1 + y2) / 2 + ((index % 5) - 2) * 0.45
        c.setStrokeColor(hex_color(palette.get(by_code[source]["section"], "#111827")))
        c.setLineWidth(0.18)
        for xa, ya, xb, yb in [(x1, y1, x1, mid_y), (x1, mid_y, x2, mid_y), (x2, mid_y, x2, y2)]:
            c.line(mmx(xa), mmx(A2_PAGE_H_MM - ya), mmx(xb), mmx(A2_PAGE_H_MM - yb))
        c.line(mmx(x2), mmx(A2_PAGE_H_MM - y2), mmx(x2 - 0.8), mmx(A2_PAGE_H_MM - y2 + 1.5))
        c.line(mmx(x2), mmx(A2_PAGE_H_MM - y2), mmx(x2 + 0.8), mmx(A2_PAGE_H_MM - y2 + 1.5))
        c.setFont(FONT_NAME, 2.35)
        c.setFillColor(colors.HexColor("#334155"))
        label_x = min(max((x1 + x2) / 2 + 1.0, 4.5), A2_PAGE_W_MM - 23.0)
        c.drawString(mmx(label_x), mmx(A2_PAGE_H_MM - mid_y + 0.6), f"{source}->{target}")
    for step in steps:
        x, y, node_w, node_h = layout[step["operationId"]]
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#111827"))
        c.setLineWidth(0.25)
        c.roundRect(mmx(x), mmx(A2_PAGE_H_MM - y - node_h), mmx(node_w), mmx(node_h), mmx(1.0), stroke=1, fill=1)
        c.setFillColor(hex_color(palette.get(step["section"], "#475569")))
        c.roundRect(mmx(x), mmx(A2_PAGE_H_MM - y - node_h), mmx(2.0), mmx(node_h), mmx(0.8), stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont(FONT_BOLD, 4.2)
        c.drawString(mmx(x + 2.8), mmx(A2_PAGE_H_MM - y - 3.8), f"{step['sequence']}. {step['operationId']}")
        name_lines = 1 if node_h < 11 else 2
        draw_wrapped(c, step["name"], mmx(x + 2.8), mmx(A2_PAGE_H_MM - y - 7.3), max(12, int(node_w / 2.25)), mmx(3.25), name_lines, FONT_NAME, 3.25, colors.HexColor("#111827"))
        if node_h >= 12.0:
            c.setFont(FONT_NAME, 2.65)
            c.setFillColor(colors.HexColor("#475569"))
            c.drawString(mmx(x + 2.8), mmx(A2_PAGE_H_MM - y - node_h + 1.7), f"{step['section'][:24]} | {step['normHours']:.1f}ч")
    c.showPage()
    c.save()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sql = r"""
select coalesce(jsonb_agg(to_jsonb(t) order by t."updatedAt" desc), '[]'::jsonb)::text
from (
  select id, equipment, "productCode", category, "operationsCount", "totalNormHours",
         confidence, "createdAt", "updatedAt", data
  from "NomenclatureProcessRecord"
  where "productCode" in ('209983', '231265')
     or equipment ilike '%RoboChef 800%'
     or equipment ilike '%МН-6-3-TS2%'
     or equipment ilike '%Мультихолдер%'
) t;
"""
    records = run_psql_json(sql)
    selected = pick_records(records)
    export = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "source": f"{SSH_TARGET}:{REMOTE_DIR} / {DB_NAME}.NomenclatureProcessRecord",
        "records": selected,
    }
    (OUT_DIR / "techprocess_export_from_ttm-mini.json").write_text(json.dumps(export, ensure_ascii=False, indent=2), encoding="utf-8")
    index_lines = [
        "# Выгрузка техпроцессов для печати",
        "",
        f"Дата выгрузки: {export['generatedAt']}",
        f"Источник: `{export['source']}`",
        "",
    ]
    for record in selected:
        steps = normalize_steps(record)
        base = f"{slugify(record['productCode'] + '-' + record['equipment'])}_A0_landscape"
        svg = OUT_DIR / f"{base}.svg"
        pdf = OUT_DIR / f"{base}.pdf"
        md = OUT_DIR / f"{base}.md"
        tree_svg = OUT_DIR / f"{base}_TREE_A0_portrait.svg"
        tree_pdf = OUT_DIR / f"{base}_TREE_A0_portrait.pdf"
        huge_svg = OUT_DIR / f"{base}_HUGE_GRAPH.svg"
        huge_pdf = OUT_DIR / f"{base}_HUGE_GRAPH.pdf"
        a2_svg = OUT_DIR / f"{base}_A2_PORTRAIT_CLEAN_GRAPH.svg"
        a2_pdf = OUT_DIR / f"{base}_A2_PORTRAIT_CLEAN_GRAPH.pdf"
        a2_vertical_svg = OUT_DIR / f"{base}_A2_VERTICAL_GRAPH.svg"
        a2_vertical_pdf = OUT_DIR / f"{base}_A2_VERTICAL_GRAPH.pdf"
        build_svg(record, steps, svg)
        build_pdf(record, steps, pdf)
        build_tree_svg(record, steps, tree_svg)
        build_tree_pdf(record, steps, tree_pdf)
        build_huge_svg(record, steps, huge_svg)
        build_huge_pdf(record, steps, huge_pdf)
        build_a2_clean_svg(record, steps, a2_svg)
        build_a2_clean_pdf(record, steps, a2_pdf)
        build_a2_vertical_svg(record, steps, a2_vertical_svg)
        build_a2_vertical_pdf(record, steps, a2_vertical_pdf)
        build_markdown(record, steps, md, svg.name, pdf.name)
        index_lines.extend(
            [
                f"## {record['equipment']}",
                "",
                f"- Код: `{record['productCode']}`",
                f"- Операций: `{len(steps)}`",
                f"- Норма: `{sum(step['normHours'] for step in steps):.1f} ч`",
                f"- SVG: `{svg.name}`",
                f"- PDF: `{pdf.name}`",
                f"- Дерево SVG A0 portrait: `{tree_svg.name}`",
                f"- Дерево PDF A0 portrait: `{tree_pdf.name}`",
                f"- Огромный граф SVG: `{huge_svg.name}`",
                f"- Огромный граф PDF: `{huge_pdf.name}`",
                f"- A2 portrait clean SVG: `{a2_svg.name}`",
                f"- A2 portrait clean PDF: `{a2_pdf.name}`",
                f"- A2 vertical graph SVG: `{a2_vertical_svg.name}`",
                f"- A2 vertical graph PDF: `{a2_vertical_pdf.name}`",
                f"- Описание: `{md.name}`",
                "",
            ]
        )
    (OUT_DIR / "README_TECHPROCESS_GRAPHS.md").write_text("\n".join(index_lines), encoding="utf-8-sig")
    print(f"Generated {len(selected)} process graph set(s) in {OUT_DIR}")


if __name__ == "__main__":
    main()
