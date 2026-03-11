"""
PDF processing - convert images to PDF, combine files, and apply job-code fields.

Uses PyPDF2/pypdf for PDF manipulation and reportlab for generating
form field overlays. PIL/Pillow for image-to-PDF conversion.
"""

import csv
from pathlib import Path
from typing import Optional

try:
    from pypdf import PdfReader, PdfWriter, PageObject
    from pypdf.annotations import FreeText
except ImportError:
    PdfReader = PdfWriter = PageObject = FreeText = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.units import inch
except ImportError:
    rl_canvas = None

from payable_automation.config.settings import SUPPORTED_IMAGE_TYPES


def image_to_pdf(image_path: Path, output_path: Optional[Path] = None) -> Path:
    """Convert a single image file to a one-page PDF."""
    if Image is None:
        raise ImportError("Pillow is required: pip install Pillow")

    if output_path is None:
        output_path = image_path.with_suffix(".pdf")

    img = Image.open(image_path)
    if img.mode == "RGBA":
        img = img.convert("RGB")
    img.save(str(output_path), "PDF", resolution=150)
    return output_path


def convert_images_in_list(records: list[dict]) -> list[dict]:
    """Convert any image records to PDF, updating the sorted_path."""
    for rec in records:
        if rec["type"] != "image":
            continue

        src = rec.get("sorted_path", rec["path"])
        if src.suffix.lower() in SUPPORTED_IMAGE_TYPES:
            pdf_path = image_to_pdf(src)
            rec["sorted_path"] = pdf_path
            rec["type"] = "pdf"
            rec["converted_from_image"] = True

    return records


def combine_pdfs(pdf_paths: list[Path], output_path: Path) -> Path:
    """Merge multiple PDFs into a single file."""
    if PdfWriter is None:
        raise ImportError("pypdf is required: pip install pypdf")

    writer = PdfWriter()
    for pdf_path in pdf_paths:
        reader = PdfReader(str(pdf_path))
        for page in reader.pages:
            writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)

    return output_path


def group_by_job(records: list[dict], pm_assignments_csv: Path) -> dict[str, list[dict]]:
    """
    Group invoice records by job/PM assignment.

    Uses the pm_assignments CSV to look up which PM handles which vendor or job.
    Records without a match go into an 'unassigned' group.

    Returns: {pm_name: [records]}
    """
    assignments = _load_pm_assignments(pm_assignments_csv)

    groups: dict[str, list[dict]] = {}

    for rec in records:
        vendor = rec.get("vendor_name", "").lower()
        pm = "unassigned"

        for assignment in assignments:
            if vendor and vendor in assignment.get("vendor", "").lower():
                pm = assignment["pm"]
                rec["job_code"] = assignment.get("job_code", "")
                break

        groups.setdefault(pm, []).append(rec)

    return groups


def create_coding_overlay(
    job_codes: list[dict],
    cost_types: list[dict],
    gl_accounts: list[str],
    output_path: Path,
) -> Path:
    """
    Generate a one-page PDF overlay with form-style dropdown areas
    for job code, cost type, GL account, and amount.

    This overlay gets appended as a coding page to each invoice PDF
    so PMs can fill in the fields.
    """
    if rl_canvas is None:
        raise ImportError("reportlab is required: pip install reportlab")

    c = rl_canvas.Canvas(str(output_path), pagesize=letter)
    width, height = letter

    # Title
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1 * inch, height - 1 * inch, "INVOICE CODING SHEET")

    c.setFont("Helvetica", 9)
    c.drawString(1 * inch, height - 1.3 * inch, "Fill in the fields below and return to AP.")

    y = height - 1.8 * inch
    row_height = 0.35 * inch

    # Header row
    c.setFont("Helvetica-Bold", 10)
    headers = ["Job Code", "Cost Type", "GL Account", "Amount", "Description"]
    x_positions = [1 * inch, 2.8 * inch, 4.0 * inch, 5.5 * inch, 6.5 * inch]
    for header, x in zip(headers, x_positions):
        c.drawString(x, y, header)

    y -= 0.15 * inch
    c.line(1 * inch, y, width - 1 * inch, y)
    y -= row_height

    # Draw 10 blank coding rows with boxes
    c.setFont("Helvetica", 9)
    for row_num in range(10):
        for i, x in enumerate(x_positions):
            box_width = (x_positions[i + 1] - x - 0.1 * inch) if i < len(x_positions) - 1 else 1.2 * inch
            c.rect(x, y - 0.05 * inch, box_width, row_height - 0.05 * inch)
        y -= row_height

    # Reference section - list available codes
    y -= 0.3 * inch
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1 * inch, y, "Available Job Codes:")
    y -= 0.2 * inch
    c.setFont("Helvetica", 7)
    for jc in job_codes[:30]:  # limit to avoid overflow
        code_str = f"{jc.get('code', '')} - {jc.get('description', '')}"
        c.drawString(1 * inch, y, code_str)
        y -= 0.15 * inch
        if y < 1.5 * inch:
            break

    y -= 0.2 * inch
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1 * inch, y, "Cost Types:")
    y -= 0.2 * inch
    c.setFont("Helvetica", 8)
    for ct in cost_types:
        c.drawString(1 * inch, y, f"{ct.get('code', '')} - {ct.get('description', '')}")
        y -= 0.15 * inch

    c.save()
    return output_path


def apply_coding_page(
    invoice_pdf: Path,
    coding_overlay: Path,
    output_path: Path,
) -> Path:
    """Append the coding overlay page to the end of an invoice PDF."""
    if PdfWriter is None:
        raise ImportError("pypdf is required: pip install pypdf")

    writer = PdfWriter()

    invoice_reader = PdfReader(str(invoice_pdf))
    for page in invoice_reader.pages:
        writer.add_page(page)

    overlay_reader = PdfReader(str(coding_overlay))
    for page in overlay_reader.pages:
        writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)

    return output_path


def _load_pm_assignments(csv_path: Path) -> list[dict]:
    """Load PM assignment CSV: pm, vendor, job_code."""
    assignments = []
    if not csv_path.exists():
        return assignments

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            assignments.append({
                "pm": row.get("pm", "").strip(),
                "vendor": row.get("vendor", "").strip(),
                "job_code": row.get("job_code", "").strip(),
            })
    return assignments
