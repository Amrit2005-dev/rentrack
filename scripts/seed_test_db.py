import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.company import Company
from app.models.user import User, UserRole, UserStatus
from app.services.password_service import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        # Create a company
        company = Company(
            name="Test E2E Company",
            city="Test City"
        )
        db.add(company)
        await db.flush()

        # Create a super admin user
        user = User(
            mobile_number="9999999999",
            email="admin@test.com",
            password_hash=hash_password("password123"),
            first_name="Super",
            last_name="Admin",
            company_id=company.id,
            role=UserRole.super_admin,
            status=UserStatus.active,
        )
        db.add(user)
        await db.commit()
        print(f"Successfully seeded database with company {company.id} and admin user {user.id}")


if __name__ == "__main__":
    asyncio.run(seed())
