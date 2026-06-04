import os
import sys
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
    print("Dropping tables user_sessions and users if they exist...")
    # Drop user_sessions first because of possible foreign keys (though we didn't define explicit FKs, let's be safe)
    conn.execute(text("DROP TABLE IF EXISTS user_sessions CASCADE;"))
    conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
    conn.commit()
    print("Tables dropped successfully!")
