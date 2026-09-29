# TMS Backend — revenue_service.py
# Module: 3 — Admin/User Core | Path: app/services/revenue_service.py
# Purpose: Revenue calculation engine

from __future__ import annotations

from decimal import Decimal

from app.schemas.dashboard import RevenueBreakdown


# Rate card DTO (used internally by revenue engine)
class RateCard:
    def __init__(
        self,
        base_fare: Decimal,
        per_km_rate: Decimal,
        per_ton_rate: Decimal,
        waiting_rate: Decimal,
    ) -> None:
        self.base_fare = Decimal(str(base_fare))
        self.per_km_rate = Decimal(str(per_km_rate))
        self.per_ton_rate = Decimal(str(per_ton_rate))
        self.waiting_rate = Decimal(str(waiting_rate))


async def calculate_trip_amount(
    distance_km: Decimal,
    weight_tons: Decimal,
    waiting_hours: Decimal,
    toll: Decimal,
    extra: Decimal,
    rate_card: RateCard,
    gst_rate: Decimal,
) -> RevenueBreakdown:
    """
    Calculate full trip revenue breakdown.

    Formula:
        base_fare        = rate_card.base_fare
        distance_charge  = distance_km × per_km_rate
        weight_charge    = weight_tons × per_ton_rate
        waiting_charge   = waiting_hours × waiting_rate
        subtotal         = base_fare + distance_charge + weight_charge + waiting_charge + toll + extra
        gst_amount       = subtotal × (gst_rate / 100)
        final_amount     = subtotal + gst_amount

    All arithmetic uses Decimal for financial precision.
    """
    distance_km = Decimal(str(distance_km))
    weight_tons = Decimal(str(weight_tons))
    waiting_hours = Decimal(str(waiting_hours))
    toll = Decimal(str(toll))
    extra = Decimal(str(extra))
    gst_rate = Decimal(str(gst_rate))

    base_fare = rate_card.base_fare
    distance_charge = distance_km * rate_card.per_km_rate
    weight_charge = weight_tons * rate_card.per_ton_rate
    waiting_charge = waiting_hours * rate_card.waiting_rate

    subtotal = base_fare + distance_charge + weight_charge + waiting_charge + toll + extra
    gst_amount = subtotal * (gst_rate / Decimal("100"))
    final_amount = subtotal + gst_amount

    return RevenueBreakdown(
        base_fare=base_fare,
        distance_charge=distance_charge,
        weight_charge=weight_charge,
        waiting_charge=waiting_charge,
        toll_charge=toll,
        extra_charge=extra,
        gst_amount=gst_amount,
        final_amount=final_amount,
    )
