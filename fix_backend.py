import os

main_path = 'backend/app/main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_py = f.read()

# I need to add AppleIdTokenRequest. Let's find "from pydantic import BaseModel"
if "class AppleIdTokenRequest" not in main_py:
    # let's just append it after the "from typing import Optional"
    imports_to_add = """
from pydantic import BaseModel
class AppleIdTokenRequest(BaseModel):
    id_token: str
    nonce: Optional[str] = None
"""
    main_py = main_py.replace("from typing import Optional", "from typing import Optional\n" + imports_to_add)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_py)

print("Fixed main.py!")
