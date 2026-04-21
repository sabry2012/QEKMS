import asyncio
import os
import sys
# Add current directory to path for src imports
sys.path.append(os.getcwd())

from src.helpers.database import connect_to_mongo, get_db

async def migrate_users():
    os.environ["MONGODB_URL"] = "mongodb://localhost:27018"
    os.environ["DATABASE_NAME"] = "qekms_db"
    
    await connect_to_mongo()
    db = get_db()
    
    # Add channels_created_total = current channel count for all existing users
    # This is a fair starting point for the migration.
    # Alternatively, set to 0. The user said 'even if they delete them', 
    # but we don't have history of deleted channels.
    
    from src.models.AccountModel import AccountModel
    from src.models.ChannelModel import ChannelModel
    
    users = await AccountModel.get_all()
    print(f"Found {len(users)} users to migrate.")
    
    for user in users:
        current_active = await ChannelModel.count_user_channels(user["email"])
        await AccountModel.update(user["id"], {
            "channels_created_total": current_active,
            "plan": "free" # Reset all to free as requested
        })
        print(f"Migrated {user['email']}: count={current_active}, plan=free")

if __name__ == "__main__":
    asyncio.run(migrate_users())
