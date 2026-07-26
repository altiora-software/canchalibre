#!/usr/bin/env python3
"""Importa un export de Google Maps como borradores de complejos de fútbol.

Uso seguro:
  python scripts/import_google_football_complexes.py C:/ruta/google.xlsx --dry-run

Carga real (credenciales sólo en variables de entorno):
  set IMPORT_GOOGLE_FOOTBALL_CONFIRM=IMPORT_GOOGLE_FOOTBALL_COMPLEXES
  set IMPORT_SUPABASE_URL=https://<proyecto>.supabase.co
  set IMPORT_SUPABASE_SERVICE_ROLE_KEY=<service role>
  python scripts/import_google_football_complexes.py C:/ruta/google.xlsx
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

SPREADSHEET_NAMESPACE = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RELATIONSHIP_NAMESPACE = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
NON_COMPLEX_CATEGORIES = {"Pastelería", "Salón para eventos", "Salón de baile", "Bar", "Parque", "Parque infantil"}
CONFIRMATION_VALUE = "IMPORT_GOOGLE_FOOTBALL_COMPLEXES"
COORDINATES_PATTERN = re.compile(r"!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)")


@dataclass(frozen=True)
class SourceRecord:
    source_row: int
    name: str
    source_category: str
    source_address: str
    phone: str | None
    latitude: float
    longitude: float
    google_maps_url: str


def cell_column(reference: str) -> str:
    return re.match(r"[A-Z]+", reference).group(0)  # type: ignore[union-attr]


def read_xlsx_rows(path: Path) -> list[dict[str, str]]:
    """Lee la primera hoja sin depender de paquetes de terceros."""
    with zipfile.ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall(f"{SPREADSHEET_NAMESPACE}si"):
                shared_strings.append("".join(text.text or "" for text in item.iter(f"{SPREADSHEET_NAMESPACE}t")))

        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        first_sheet = workbook.find(f"{SPREADSHEET_NAMESPACE}sheets/{SPREADSHEET_NAMESPACE}sheet")
        if first_sheet is None:
            raise ValueError("El archivo no contiene hojas.")
        relationship_id = first_sheet.attrib[f"{RELATIONSHIP_NAMESPACE}id"]
        relationships = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationship = next((item for item in relationships if item.attrib.get("Id") == relationship_id), None)
        if relationship is None:
            raise ValueError("No se encontró la hoja principal del archivo.")
        target = relationship.attrib["Target"].lstrip("/")
        sheet_path = target if target.startswith("xl/") else f"xl/{target}"
        sheet = ElementTree.fromstring(archive.read(sheet_path))

    rows: list[dict[str, str]] = []
    for row in sheet.findall(f".//{SPREADSHEET_NAMESPACE}row"):
        values: dict[str, str] = {}
        for cell in row.findall(f"{SPREADSHEET_NAMESPACE}c"):
            reference = cell.attrib.get("r", "")
            column = cell_column(reference)
            raw_value = cell.findtext(f"{SPREADSHEET_NAMESPACE}v", default="")
            if cell.attrib.get("t") == "s" and raw_value:
                value = shared_strings[int(raw_value)]
            elif cell.attrib.get("t") == "inlineStr":
                value = "".join(text.text or "" for text in cell.iter(f"{SPREADSHEET_NAMESPACE}t"))
            else:
                value = raw_value
            values[column] = value.strip()
        rows.append(values)

    if not rows:
        return []
    headers = rows[0]
    return [{headers.get(column, column): value for column, value in row.items()} for row in rows[1:]]


def parse_records(path: Path) -> list[SourceRecord]:
    records: list[SourceRecord] = []
    for index, row in enumerate(read_xlsx_rows(path), start=2):
        url = row.get("hfpxzc href", "").strip()
        name = row.get("qBF1Pd", "").strip()
        coordinates = COORDINATES_PATTERN.search(url)
        if not name or not coordinates:
            continue
        address_parts = []
        for column in ("W4Efsd 4", "W4Efsd 6"):
            value = row.get(column, "").strip()
            if value and value != "·" and value not in address_parts:
                address_parts.append(value)
        phone = row.get("UsdlK", "").strip() or None
        records.append(SourceRecord(
            source_row=index,
            name=name,
            source_category=row.get("W4Efsd", "").strip(),
            source_address=" · ".join(address_parts),
            phone=phone,
            latitude=float(coordinates.group(1)),
            longitude=float(coordinates.group(2)),
            google_maps_url=url,
        ))
    return records


def record_key(record: SourceRecord) -> tuple[str, float, float]:
    return (" ".join(record.name.casefold().split()), round(record.latitude, 7), round(record.longitude, 7))


def select_candidates(records: list[SourceRecord]) -> tuple[list[SourceRecord], list[dict[str, Any]]]:
    rejected: list[dict[str, Any]] = []
    unique: dict[tuple[str, float, float], SourceRecord] = {}
    for record in records:
        if record.source_category in NON_COMPLEX_CATEGORIES:
            rejected.append({"sourceRow": record.source_row, "name": record.name, "reason": f"categoría no verificable como fútbol: {record.source_category or 'sin categoría'}"})
            continue
        key = record_key(record)
        current = unique.get(key)
        if current is None:
            unique[key] = record
            continue
        current_score = int(bool(current.source_address)) + int(bool(current.phone))
        candidate_score = int(bool(record.source_address)) + int(bool(record.phone))
        retained, duplicate = (record, current) if candidate_score > current_score else (current, record)
        unique[key] = retained
        rejected.append({"sourceRow": duplicate.source_row, "name": duplicate.name, "reason": f"duplicado de la fila {retained.source_row}"})

    return list(unique.values()), sorted(rejected, key=lambda item: item["sourceRow"])


class SupabaseRest:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.base_url = url.rstrip("/") + "/rest/v1"
        self.headers = {"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}", "Content-Type": "application/json"}

    def request(self, method: str, table: str, query: dict[str, str] | None = None, payload: dict[str, Any] | None = None) -> Any:
        endpoint = f"{self.base_url}/{table}"
        if query:
            endpoint += "?" + urllib.parse.urlencode(query, safe=".,")
        request = urllib.request.Request(endpoint, data=json.dumps(payload).encode() if payload is not None else None, headers={**self.headers, "Prefer": "return=representation"}, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode()
                return json.loads(body) if body else None
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"Supabase {method} {table} failed ({error.code}): {detail}") from error


def payload(record: SourceRecord) -> dict[str, Any]:
    return {
        "name": record.name,
        "address": record.source_address or f"Ubicación por coordenadas de Google Maps: {record.latitude:.7f}, {record.longitude:.7f}",
        "latitude": record.latitude,
        "longitude": record.longitude,
        "phone": record.phone,
        "description": "\n".join(("Registro importado desde Google Maps; pendiente de verificación comercial.", f"Categoría de origen: {record.source_category}.", f"Fuente: {record.google_maps_url}")),
        "is_active": False,
        "is_approved": False,
    }


def upsert_draft(api: SupabaseRest, record: SourceRecord) -> str:
    query = {"name": f"eq.{record.name}", "latitude": f"eq.{record.latitude}", "longitude": f"eq.{record.longitude}", "select": "id", "limit": "2"}
    matches = api.request("GET", "sport_complexes", query)
    if len(matches) > 1:
        raise RuntimeError("Existen varios complejos con el mismo nombre y coordenadas; resolver antes de reintentar.")
    if matches:
        return "existing"
    api.request("POST", "sport_complexes", payload=payload(record))
    return "inserted"


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa resultados de Google Maps como borradores de complejos de fútbol.")
    parser.add_argument("xlsx", type=Path, help="Ruta al export .xlsx de Google Maps")
    parser.add_argument("--dry-run", action="store_true", help="Valida y muestra el reporte sin conectarse a Supabase")
    args = parser.parse_args()
    if not args.xlsx.is_file():
        parser.error(f"No existe el archivo: {args.xlsx}")

    source_records = parse_records(args.xlsx)
    eligible, rejected = select_candidates(source_records)
    report: dict[str, Any] = {"sourceRecords": len(source_records), "eligibleDrafts": len(eligible), "rejectedRecords": len(rejected), "rejected": rejected, "limitations": ["No crea sport_courts porque el archivo no acredita capacidad, superficie, techo, iluminación ni precio.", "Cuando Google no exporta dirección, se guarda un localizador explícito con sus coordenadas reales; no se inventa una calle.", "Inserta exclusivamente borradores sin owner_id, con is_active=false e is_approved=false."]}
    if args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    if os.environ.get("IMPORT_GOOGLE_FOOTBALL_CONFIRM") != CONFIRMATION_VALUE:
        raise RuntimeError(f"Definí IMPORT_GOOGLE_FOOTBALL_CONFIRM={CONFIRMATION_VALUE} luego de revisar --dry-run.")
    supabase_url = os.environ.get("IMPORT_SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    service_role = os.environ.get("IMPORT_SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role:
        raise RuntimeError("Faltan IMPORT_SUPABASE_URL (o VITE_SUPABASE_URL) e IMPORT_SUPABASE_SERVICE_ROLE_KEY.")

    api = SupabaseRest(supabase_url, service_role)
    results = []
    for record in eligible:
        try:
            results.append({"sourceRow": record.source_row, "name": record.name, "action": upsert_draft(api, record)})
        except Exception as error:  # Continúa para entregar el reporte completo e idempotente.
            results.append({"sourceRow": record.source_row, "name": record.name, "action": "failed", "error": str(error)})
    failures = [result for result in results if result["action"] == "failed"]
    print(json.dumps({**report, "results": results, "failures": len(failures)}, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Importación cancelada: {error}", file=sys.stderr)
        raise SystemExit(1)
