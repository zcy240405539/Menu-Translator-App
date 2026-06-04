import os
from dotenv import load_dotenv

# Load env
if os.path.exists(".env"):
    load_dotenv(dotenv_path=".env")
elif os.path.exists("backend/.env"):
    load_dotenv(dotenv_path="backend/.env")
else:
    load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to database: {DATABASE_URL[:30]}...")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Running migration to add 'role' column to 'users' table...")
    try:
        # Add column
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'normal';"))
        
        # Check constraint (try to add, catch if already exists)
        try:
            conn.execute(text("ALTER TABLE users ADD CONSTRAINT chk_user_role CHECK (role IN ('super user', 'admin', 'normal'));"))
            print("Check constraint chk_user_role added successfully.")
        except Exception as e:
            print("Check constraint might already exist:", e)
            
        conn.commit()
        print("Migration completed successfully!")
    except Exception as e:
        print("Migration failed:", e)
