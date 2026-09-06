import time
try:
    import jwt
except ImportError:
    print("Please run: pip install PyJWT")
    exit(1)

print("=== Apple Secret Key Generator ===")
print("请确保你把从苹果下载的 .p8 文件放到了这个目录，并改名为 key.p8")
print("---------------------------------")

TEAM_ID = "FAW3L87AQ7"
# 【关键】这里必须是网页版的 Services ID，绝不能是 iOS 的 Bundle ID！
CLIENT_ID = "com.agentscottystudio.aimenuapp.web"

key_id = input("请输入你的 10 位 Key ID (例如 ABC123DEFG): ").strip()

try:
    with open("key.p8", "r") as f:
        private_key = f.read()
except FileNotFoundError:
    print("❌ 错误：找不到 key.p8 文件。请将你的 p8 文件重命名为 key.p8 并放在同一目录下。")
    exit(1)

headers = {
    "kid": key_id,
    "alg": "ES256"
}

payload = {
    "iss": TEAM_ID,
    "iat": int(time.time()),
    "exp": int(time.time()) + (86400 * 180),  # 180天后过期
    "aud": "https://appleid.apple.com",
    "sub": CLIENT_ID,  # 这是导致你之前失败的罪魁祸首，必须是 .web 的 ID
}

try:
    secret = jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
    print("\n✅ 生成成功！请复制下方整段内容，填入 Supabase 的 Secret Key 框：\n")
    print(secret)
    print("\n---------------------------------")
except Exception as e:
    print(f"❌ 生成失败: {e}")
