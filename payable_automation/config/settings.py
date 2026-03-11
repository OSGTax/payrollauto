"""
Central configuration for folder paths, file types, and workflow settings.

All paths are relative to a configurable ROOT_DIR (defaults to ./ap_workspace).
"""

import json
import os
from pathlib import Path

DEFAULT_ROOT = Path("./ap_workspace")

# Folder layout under ROOT_DIR
FOLDERS = {
    "inbox": "1_inbox",             # raw PDFs / images land here
    "sorted": "2_sorted",           # after intake groups by vendor
    "pm_review": "3_pm_review",     # coded PDFs sent to PMs (sub-folders per PM)
    "pm_completed": "4_pm_completed",  # PMs drop coded files back here
    "export_ready": "5_export_ready",  # CSV/XML files ready for CE upload
    "archive": "6_archive",         # processed originals archived here
}

SUPPORTED_IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}
SUPPORTED_PDF_TYPES = {".pdf"}
SUPPORTED_FILE_TYPES = SUPPORTED_PDF_TYPES | SUPPORTED_IMAGE_TYPES


def load_config(config_path: str | Path | None = None) -> dict:
    """Load the workspace config JSON. Falls back to defaults."""
    if config_path and Path(config_path).exists():
        with open(config_path) as f:
            return json.load(f)
    return {
        "root_dir": str(DEFAULT_ROOT),
        "vendors_file": "config/vendors.csv",
        "job_codes_file": "config/job_codes.csv",
        "cost_types_file": "config/cost_types.csv",
        "pm_assignments_file": "config/pm_assignments.csv",
        "export_format": "csv",  # "csv" or "xml"
    }


def ensure_workspace(root_dir: str | Path | None = None) -> Path:
    """Create the full folder tree under root_dir if it doesn't exist."""
    root = Path(root_dir) if root_dir else DEFAULT_ROOT
    for folder in FOLDERS.values():
        (root / folder).mkdir(parents=True, exist_ok=True)
    return root
