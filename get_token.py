import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.jwt_service import create_access_token

async def main():
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.role == 'super_admin'))
        if user:
            print(create_access_token(str(user.id), user.role.value, str(user.company_id) if user.company_id else None))
        else:
            print('No super admin found')

asyncio.run(main())
