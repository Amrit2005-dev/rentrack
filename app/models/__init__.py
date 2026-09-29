# TMS Backend — models/__init__.py
# Purpose: Import all models so Alembic autogenerate detects them

from app.models.audit_log import AuditLog  # noqa: F401
from app.models.challan import Challan, ChallanItem  # noqa: F401
from app.models.client import Client  # noqa: F401
from app.models.company import Company  # noqa: F401
from app.models.driver import Driver  # noqa: F401
from app.models.ledger import LedgerEntry  # noqa: F401
from app.models.quotation import Quotation, TermsTemplate  # noqa: F401
from app.models.rate_card import RateCard  # noqa: F401
from app.models.registration import ApprovalHistory, RegistrationRequest  # noqa: F401
from app.models.trip import Notification, Trip, TripReceipt  # noqa: F401
from app.models.user import LoginHistory, RefreshToken, User  # noqa: F401
from app.models.vehicle import Vehicle  # noqa: F401
from app.models.invoice import Invoice, InvoiceItem  # noqa: F401
from app.models.tds_record import TDSRecord  # noqa: F401
from app.models.driver_collection import DriverCollection  # noqa: F401
from app.models.client_site import ClientSite  # noqa: F401
from app.models.physical_challan import PhysicalChallan  # noqa: F401
