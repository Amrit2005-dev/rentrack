from fastapi import APIRouter

from app.api.v1.endpoints import auth
from app.api.v1.endpoints import registration
from app.api.v1.endpoints import vehicles
from app.api.v1.endpoints import drivers
from app.api.v1.endpoints import trips
from app.api.v1.endpoints import users

api_router = APIRouter()

# ── Core auth & users (all mounted under /auth) ───────────────────────────────
api_router.include_router(auth.router,         prefix="/auth",         tags=["Authentication"])
# /auth/me, /auth/users CRUD are now in auth.py — users.py kept for compat
api_router.include_router(users.router,        prefix="/auth",         tags=["Users"])

# ── Onboarding ────────────────────────────────────────────────────────────────
api_router.include_router(registration.router, prefix="/registration",  tags=["Registration"])

# ── Fleet & ops ───────────────────────────────────────────────────────────────
api_router.include_router(vehicles.router,     prefix="/vehicles",      tags=["Vehicles"])
api_router.include_router(drivers.router,      prefix="/drivers",       tags=["Drivers"])
api_router.include_router(trips.router,        prefix="/trips",         tags=["Trips"])

# ── Billing modules (Phase 4) ─────────────────────────────────────────────────
from app.api.v1.endpoints import challans, quotations, invoices, ledger, tds, reports
api_router.include_router(challans.router,     prefix="/challans",      tags=["Challans"])
api_router.include_router(quotations.router,   prefix="/quotations",    tags=["Quotations"])
api_router.include_router(invoices.router,     prefix="/invoices",      tags=["Invoices"])
api_router.include_router(ledger.router,       prefix="/ledger",        tags=["Ledger"])
api_router.include_router(tds.router,          prefix="/tds",           tags=["TDS"])
api_router.include_router(reports.router,      prefix="/reports",       tags=["Reports"])

# ── New routers — frontend integration ────────────────────────────────────────
from app.api.v1.endpoints import (
    billing,
    clients,
    rate_cards,
    driver_collections,
    dashboard,
    organizations,
)
# /billing aliases /invoices — the frontend calls /billing/
api_router.include_router(billing.router,            prefix="/billing",             tags=["Billing"])
api_router.include_router(clients.router,            prefix="/clients",             tags=["Clients"])
api_router.include_router(rate_cards.router,         prefix="/rate-cards",          tags=["Rate Cards"])
api_router.include_router(driver_collections.router, prefix="/driver-collections",  tags=["Driver Collections"])
api_router.include_router(dashboard.router,          prefix="/dashboard",           tags=["Dashboard"])
api_router.include_router(organizations.router,      prefix="/organizations",       tags=["Organizations"])
