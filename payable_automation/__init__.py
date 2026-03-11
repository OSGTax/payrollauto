"""
Payable Automation - Accounts Payable Invoice Processing Workflow

Automates the intake, coding, distribution, and export of vendor invoices
for upload into ComputerEase (CE).

Workflow:
  1. INTAKE   - Pull raw PDFs/images from an inbox folder
  2. PROCESS  - Combine by job/PM, stamp with job-code dropdown fields
  3. DISTRIBUTE - Save coded PDFs into per-PM review folders
  4. EXPORT   - Convert PM-coded invoices into CSV/XML for CE import
"""

__version__ = "0.1.0"
