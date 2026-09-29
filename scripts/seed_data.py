"""
Seed initial test and admin users into the database.
Run with:
    python -m scripts.seed_data
"""

import asyncio
import logging
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.company import Company
from app.models.user import User, UserRole, UserStatus
from app.services.password_service import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

USERS_TO_SEED = [
    {
        "mobile_number": "9000000001",
        "email": "superadmin@renttrack.com",
        "first_name": "Super",
        "last_name": "Admin",
        "role": UserRole.super_admin,
        "status": UserStatus.active,
        "password": "Password123!",
    },
    {
        "mobile_number": "9000000002",
        "email": "admin@renttrack.com",
        "first_name": "Fleet",
        "last_name": "Admin",
        "role": UserRole.admin,
        "status": UserStatus.active,
        "password": "Password123!",
    },
    {
        "mobile_number": "9000000003",
        "email": "driver@renttrack.com",
        "first_name": "Ramesh",
        "last_name": "Kumar",
        "role": UserRole.user,
        "status": UserStatus.active,
        "password": "Password123!",
    },
]

async def seed():
    async with AsyncSessionLocal() as session:
        # 1. Seed or get primary company
        result = await session.execute(
            select(Company).where(Company.name == "RentTrack Logistics")
        )
        company = result.scalar_one_or_none()
        if not company:
            company = Company(name="RentTrack Logistics", city="Mumbai")
            session.add(company)
            await session.flush()
            logger.info("Created default company: RentTrack Logistics (ID: %s)", company.id)
        else:
            logger.info("Found existing company: RentTrack Logistics (ID: %s)", company.id)

        # 2. Seed users
        for u in USERS_TO_SEED:
            res = await session.execute(
                select(User).where(User.mobile_number == u["mobile_number"])
            )
            existing_user = res.scalar_one_or_none()
            if not existing_user:
                new_user = User(
                    mobile_number=u["mobile_number"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    role=u["role"],
                    status=u["status"],
                    company_id=company.id,
                )
                session.add(new_user)
                logger.info("Created user: %s (%s, Role: %s)", u["email"], u["mobile_number"], u["role"].value)
            else:
                existing_user.email = u["email"]
                existing_user.password_hash = hash_password(u["password"])
                existing_user.status = u["status"]
                existing_user.role = u["role"]
                existing_user.company_id = company.id
                logger.info("Updated existing user: %s (%s)", u["email"], u["mobile_number"])

        await session.commit()
        logger.info("Seeding completed successfully!")
        print("\nDefault Seed Accounts:")
        print("----------------------------------------------------------------------")
        for u in USERS_TO_SEED:
            print(f"Role: {u['role'].value:<12} | Email: {u['email']:<24} | Mobile: {u['mobile_number']} | Password: {u['password']}")
        print("----------------------------------------------------------------------\n")

if __name__ == "__main__":
    asyncio.run(seed())
