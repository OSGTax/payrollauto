"""
Data models for invoices and coding entries.

These mirror the fields used in ComputerEase AP imports.
"""

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class Vendor:
    code: str           # CE vendor code (e.g. "V-1042")
    name: str           # display name
    default_gl: str = ""  # default GL account if known


@dataclass
class JobCode:
    code: str           # e.g. "2024-0137"
    description: str = ""
    pm: str = ""        # assigned project manager


@dataclass
class CostType:
    code: str           # e.g. "M" for Material, "S" for Sub, "O" for Other
    description: str = ""


@dataclass
class InvoiceLine:
    """A single cost-coded line on an invoice."""
    gl_account: str = ""
    job_code: str = ""
    cost_type: str = ""
    amount: float = 0.0
    description: str = ""
    description2: str = ""
    date2: Optional[date] = None
    qty: Optional[float] = None
    hrs: Optional[float] = None


@dataclass
class Invoice:
    """Represents one vendor invoice moving through the workflow."""
    source_file: str            # original filename
    vendor_code: str = ""
    vendor_name: str = ""
    invoice_number: str = ""
    invoice_date: Optional[date] = None
    po_number: str = ""
    subcontract_number: str = ""
    total_amount: float = 0.0
    description: str = ""
    assigned_pm: str = ""
    job_code: str = ""          # primary job (may have multiple lines)
    lines: list[InvoiceLine] = field(default_factory=list)
    status: str = "inbox"       # inbox | sorted | pm_review | coded | exported
    coded_file: str = ""        # path to the PDF with dropdown fields filled
