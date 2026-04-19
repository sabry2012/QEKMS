import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "qekms_db"

async def check_admins():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n--- Checking Admins Collection ---")
    try:
        admins = await db["admins"].find().to_list(100)
        if not admins:
            print("No admins found in 'admins' collection.")
        else:
            for admin in admins:
                print(f"Email: {admin.get('email')}, Role: {admin.get('role')}, Active: {admin.get('is_active')}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check_admins())
