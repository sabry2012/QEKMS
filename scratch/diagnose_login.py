import asyncio
import sys
import os

# Add src to path
sys.path.append(os.getcwd())

from motor.motor_asyncio import AsyncIOMotorClient
from src.helpers.security import verify_password, get_password_hash
from src.models.AdminModel import AdminModel
from src.helpers.database import connect_to_mongo, get_db

async def diagnose():
    await connect_to_mongo()
    db = get_db()
    
    email = "sabrygomaasem@gmail.com"
    password = "admin123"
    
    print(f"\n--- Diagnostic for {email} ---")
    
    # 1. Manual check in DB
    doc = await db["admins"].find_one({"email": email})
    if not doc:
        print("Document NOT found by 'email' field.")
        # Try finding any admin
        all_admins = await db["admins"].find().to_list(10)
        print(f"Total admins in DB: {len(all_admins)}")
        for a in all_admins:
            print(f"  Found admin with keys: {list(a.keys())}")
            if "email" in a: print(f"    email: {a['email']}")
            if "Email" in a: print(f"    Email: {a['Email']}")
    else:
        print("Document found.")
        hashed = doc.get("password") or doc.get("Password")
        print(f"Hashed password in DB: {hashed}")
        
        # 2. Check normalization
        normalized_doc = AdminModel._normalize(doc)
        print(f"Normalized email: {normalized_doc.get('email')}")
        
        # 3. Verify password
        is_valid = verify_password(password, hashed)
        print(f"Password 'admin123' valid? {is_valid}")
        
        # 4. Generate new hash for comparison
        new_hash = get_password_hash(password)
        print(f"Newly generated hash for 'admin123': {new_hash}")
        is_valid_new = verify_password(password, new_hash)
        print(f"Newly generated hash valid? {is_valid_new}")

if __name__ == "__main__":
    asyncio.run(diagnose())
