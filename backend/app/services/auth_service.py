import os
from sqlalchemy.orm import Session
from app.core.models import User, UserSubscription
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Hardcoded password for mock Google users in development/testing
MOCK_GOOGLE_PASSWORD = "GoogleMockUserPassword123!"


def get_supabase_client():
    """Create a stateless, request-scoped Supabase client using the Service Role Key.
    This prevents cross-request authorization token pollution.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase credentials missing in environment variables.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def ensure_user_subscription(db: Session, user_id: str) -> None:
    """Ensure a UserSubscription row exists in the database for the given user ID."""
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
    if not sub:
        sub = UserSubscription(
            user_id=user_id,
            plan="free",
            status="active",
            is_expired=False
        )
        db.add(sub)
        db.commit()


def register_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    phone: str = None,
    diets: list = None,
    allergies: list = None,
    budget: str = None,
    taste: str = None,
    preferred_language: str = "zh",
) -> dict:
    """Create a user account in Supabase Auth and save profile preferences in local database."""
    client = get_supabase_client()

    # 1. Register in Supabase Auth using admin API (so we can set email_confirm=True immediately)
    try:
        auth_res = client.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "username": username,
                "phone": phone
            }
        })
    except Exception as e:
        # Check if email already registered
        error_msg = str(e).lower()
        if "already registered" in error_msg or "already exists" in error_msg or "email_exists" in error_msg:
            raise ValueError("Email already registered")
        raise ValueError(f"Supabase sign up failed: {str(e)}")

    supabase_uid = auth_res.user.id

    # 2. Insert user profile and subscription into our local SQL database
    try:
        user_profile = User(
            id=supabase_uid,
            username=username,
            email=email,
            role="normal",
            phone=phone,
            diets=diets or [],
            allergies=allergies or [],
            budget=budget,
            taste=taste,
            preferred_language=preferred_language,
        )
        db.add(user_profile)

        # Create default free subscription
        sub = UserSubscription(
            user_id=supabase_uid,
            plan="free",
            status="active",
            is_expired=False
        )
        db.add(sub)

        db.commit()
        db.refresh(user_profile)
    except Exception as e:
        # Rollback db transaction and delete user from Supabase to maintain consistency
        db.rollback()
        try:
            client.auth.admin.delete_user(supabase_uid)
        except Exception:
            pass
        
        # Check uniqueness constraint failures
        error_msg = str(e).lower()
        if "username" in error_msg:
            raise ValueError("Username already taken")
        if "email" in error_msg:
            raise ValueError("Email already registered")
        raise ValueError(f"Database registration failed: {str(e)}")

    # 3. Log user in to get active session JWT token
    login_res = client.auth.sign_in_with_password({
        "email": email,
        "password": password
    })

    return {
        "token": login_res.session.access_token,
        "user": user_profile
    }


def login_user(db: Session, email: str, password: str) -> dict:
    """Authenticate email/password against Supabase Auth and return profile info with JWT token."""
    client = get_supabase_client()

    try:
        login_res = client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except Exception as e:
        raise ValueError("Invalid email or password")

    supabase_uid = login_res.user.id
    access_token = login_res.session.access_token

    # Find or auto-create profile
    user_profile = db.query(User).filter(User.id == supabase_uid).first()
    if not user_profile:
        # Self-healing profile registration
        user_metadata = login_res.user.user_metadata or {}
        username = user_metadata.get("username") or email.split("@")[0]
        user_profile = User(
            id=supabase_uid,
            username=username,
            email=email,
            phone=user_metadata.get("phone"),
            diets=[],
            allergies=[],
            preferred_language="zh",
        )
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)

    ensure_user_subscription(db, user_profile.id)

    return {
        "token": access_token,
        "user": user_profile
    }


def get_user_from_token(db: Session, token: str) -> User | None:
    """Retrieve and verify Supabase Auth user via JWT token, then fetch local profile."""
    if not token:
        return None
    
    client = get_supabase_client()
    try:
        auth_user_res = client.auth.get_user(token)
    except Exception:
        # Invalid / expired token
        return None

    supabase_user = auth_user_res.user
    user_profile = db.query(User).filter(User.id == supabase_user.id).first()
    
    if not user_profile:
        # Self-healing profile creation (e.g. if registered externally or database was reset)
        user_metadata = supabase_user.user_metadata or {}
        username = user_metadata.get("username") or user_metadata.get("name") or supabase_user.email.split("@")[0]
        
        # Ensure unique username
        base_username = username
        suffix = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{suffix}"
            suffix += 1

        user_profile = User(
            id=supabase_user.id,
            username=username,
            email=supabase_user.email,
            phone=supabase_user.phone or user_metadata.get("phone"),
            avatar_url=user_metadata.get("avatar_url"),
            diets=[],
            allergies=[],
            preferred_language="zh",
        )
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)

    ensure_user_subscription(db, user_profile.id)
    return user_profile


def google_login_or_register(db: Session, email: str, name: str, avatar_url: str = None) -> dict:
    """Handle Google login by either authenticating or registering user on Supabase Auth via admin API."""
    client = get_supabase_client()

    # Check if user already exists locally
    user_profile = db.query(User).filter(User.email == email).first()
    
    if not user_profile:
        # Create user in Supabase Auth first
        username = name or email.split("@")[0]
        base_username = username
        suffix = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{suffix}"
            suffix += 1

        # We first try to create user via admin API
        supabase_uid = None
        try:
            auth_res = client.auth.admin.create_user({
                "email": email,
                "password": MOCK_GOOGLE_PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "username": username,
                    "name": name,
                    "avatar_url": avatar_url
                }
            })
            supabase_uid = auth_res.user.id
        except Exception as e:
            # If user already exists in Supabase (e.g. database dropped but auth persisted)
            # We can search in Supabase auth list or try to sign in
            error_msg = str(e).lower()
            if "already registered" in error_msg or "already exists" in error_msg or "email_exists" in error_msg:
                # Sign in directly to get UID
                try:
                    login_res = client.auth.sign_in_with_password({
                        "email": email,
                        "password": MOCK_GOOGLE_PASSWORD
                    })
                    supabase_uid = login_res.user.id
                except Exception:
                    pass
            
            if not supabase_uid:
                raise ValueError(f"Supabase Auth provisioning failed: {str(e)}")

        # Create user locally
        user_profile = User(
            id=supabase_uid,
            username=username,
            email=email,
            avatar_url=avatar_url,
            diets=[],
            allergies=[],
            preferred_language="zh",
        )
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)

    # Sign in to get access token JWT
    try:
        login_res = client.auth.sign_in_with_password({
            "email": email,
            "password": MOCK_GOOGLE_PASSWORD
        })
        access_token = login_res.session.access_token
    except Exception as e:
        raise ValueError(f"Google login session generation failed: {str(e)}")

    ensure_user_subscription(db, user_profile.id)

    return {
        "token": access_token,
        "user": user_profile
    }
