"""
Inbox scanner - finds and categorizes raw invoice files.

Scans the inbox folder for PDFs and images, groups them by vendor
when possible (using filename patterns or subfolder names), and
converts images to PDF for uniform downstream processing.
"""

import csv
import shutil
from pathlib import Path

from payable_automation.config.settings import (
    FOLDERS,
    SUPPORTED_FILE_TYPES,
    SUPPORTED_IMAGE_TYPES,
    SUPPORTED_PDF_TYPES,
)


def scan_inbox(root_dir: Path) -> list[dict]:
    """
    Scan the inbox folder and return a list of file records.

    Each record: {"path": Path, "type": "pdf"|"image", "vendor_hint": str}

    Vendor hint is derived from:
      - subfolder name if the file is inside a vendor-named subfolder
      - filename prefix before the first underscore or dash
    """
    inbox = root_dir / FOLDERS["inbox"]
    records = []

    for filepath in sorted(inbox.rglob("*")):
        if not filepath.is_file():
            continue
        suffix = filepath.suffix.lower()
        if suffix not in SUPPORTED_FILE_TYPES:
            continue

        # Derive vendor hint
        relative = filepath.relative_to(inbox)
        if len(relative.parts) > 1:
            vendor_hint = relative.parts[0]
        else:
            stem = filepath.stem
            for sep in ("_", "-", " "):
                if sep in stem:
                    vendor_hint = stem.split(sep)[0].strip()
                    break
            else:
                vendor_hint = ""

        file_type = "pdf" if suffix in SUPPORTED_PDF_TYPES else "image"
        records.append({
            "path": filepath,
            "type": file_type,
            "vendor_hint": vendor_hint,
        })

    return records


def match_vendors(records: list[dict], vendors_csv: Path) -> list[dict]:
    """
    Attempt to match vendor_hint against the vendor list.

    Updates each record in-place with 'vendor_code' and 'vendor_name'
    if a match is found (case-insensitive substring match).
    """
    vendors = _load_vendor_list(vendors_csv)

    for rec in records:
        hint = rec["vendor_hint"].lower()
        if not hint:
            rec["vendor_code"] = ""
            rec["vendor_name"] = ""
            continue

        matched = False
        for vendor in vendors:
            if hint in vendor["name"].lower() or hint == vendor["code"].lower():
                rec["vendor_code"] = vendor["code"]
                rec["vendor_name"] = vendor["name"]
                matched = True
                break

        if not matched:
            rec["vendor_code"] = ""
            rec["vendor_name"] = rec["vendor_hint"]

    return records


def move_to_sorted(records: list[dict], root_dir: Path) -> list[dict]:
    """
    Move scanned files from inbox into the sorted folder,
    organized by vendor name (or 'unmatched' if no vendor).
    """
    sorted_dir = root_dir / FOLDERS["sorted"]

    for rec in records:
        vendor_folder = rec.get("vendor_name") or rec.get("vendor_hint") or "unmatched"
        # Sanitize folder name
        vendor_folder = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in vendor_folder
        ).strip()
        dest_dir = sorted_dir / vendor_folder
        dest_dir.mkdir(parents=True, exist_ok=True)

        src = rec["path"]
        dest = dest_dir / src.name

        # Handle name collisions
        counter = 1
        while dest.exists():
            dest = dest_dir / f"{src.stem}_{counter}{src.suffix}"
            counter += 1

        shutil.move(str(src), str(dest))
        rec["sorted_path"] = dest

    return records


def _load_vendor_list(vendors_csv: Path) -> list[dict]:
    """Load vendor CSV with columns: code, name, default_gl (optional)."""
    vendors = []
    if not vendors_csv.exists():
        return vendors

    with open(vendors_csv, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vendors.append({
                "code": row.get("code", "").strip(),
                "name": row.get("name", "").strip(),
                "default_gl": row.get("default_gl", "").strip(),
            })
    return vendors
