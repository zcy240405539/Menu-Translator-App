import os
import re

auth_service_path = 'backend/app/services/auth_service.py'
with open(auth_service_path, 'r', encoding='utf-8') as f:
    auth_service = f.read()

apple_login_func = """
def apple_login_with_id_token(db: Session, id_token: str, nonce: str | None = None) -> dict:
    client = get_supabase_client()
    try:
        creds = {"provider": "apple", "id_token": id_token}
        if nonce:
            creds["nonce"] = nonce
        login_res = client.auth.sign_in_with_id_token(creds)
    except Exception as e:
        raise ValueError(f"Failed to authenticate with Apple: {e}")

    supabase_uid = login_res.user.id
    access_token = login_res.session.access_token

    user = db.query(User).filter(User.id == supabase_uid).first()
    if not user:
        email = login_res.user.email
        name = login_res.user.user_metadata.get("name", "User")
        avatar_url = login_res.user.user_metadata.get("avatar_url")
        user = User(
            id=supabase_uid,
            email=email,
            name=name,
            avatar_url=avatar_url
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    ensure_user_subscription(db, user.id)

    return {
        "access_token": access_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "role": user.role.value
        }
    }
"""

if "def apple_login_with_id_token" not in auth_service:
    auth_service += "\n" + apple_login_func
    with open(auth_service_path, 'w', encoding='utf-8') as f:
        f.write(auth_service)

main_path = 'backend/app/main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_py = f.read()

if "class AppleIdTokenRequest(BaseModel):" not in main_py:
    # insert class after other models
    imports_to_add = """
class AppleIdTokenRequest(BaseModel):
    id_token: str
    nonce: str | None = None
"""
    main_py = main_py.replace("class UserResponse(BaseModel):", imports_to_add + "\nclass UserResponse(BaseModel):")

if "@app.post(\"/auth/apple/id_token\")" not in main_py:
    endpoint = """
@app.post("/auth/apple/id_token")
def login_with_apple_id_token(req: AppleIdTokenRequest, db: Session = Depends(get_db)):
    try:
        from app.services.auth_service import apple_login_with_id_token
        return apple_login_with_id_token(db, req.id_token, req.nonce)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
"""
    main_py += "\n" + endpoint
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_py)

print("Updated backend auth!")
