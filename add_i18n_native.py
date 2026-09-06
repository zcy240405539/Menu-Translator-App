import json
import os
import glob

locales_dir = r"C:\Workspace\Menu-Translator-App\frontend\locales"
json_files = glob.glob(os.path.join(locales_dir, "*.json"))

translations = {
    "en": {
        "changePassword": "Change Password",
        "setPassword": "Set Password",
        "currentPassword": "Current Password",
        "newPassword": "New Password",
        "changePasswordSuccess": "Password updated successfully.",
        "changePasswordFailed": "Failed to update password. Please check your current password.",
        "updating": "Updating...",
        "deleteConfirmText": "DELETE",
        "authRequired": "Authentication Required",
        "authRequiredDesc": "For security reasons, you must log in to permanently delete your account and data.",
        "loginToContinue": "Log In to Continue",
        "dangerZone": "Danger Zone",
        "dangerZoneDesc": "This action will permanently delete your account and all your saved data. It cannot be undone.",
        "deleteAccount": "Delete My Account",
        "confirmDeletion": "Confirm Deletion",
        "confirmDeletionDesc": "Type DELETE below to confirm.",
        "cancel": "Cancel",
        "confirmDelete": "Confirm Delete",
        "deleting": "Deleting...",
        "deleteSuccess": "Account Deleted Successfully",
        "deleteSuccessDesc": "All your data has been permanently removed.",
        "returnHome": "Return to Home",
        "deleteFailed": "Failed to delete account. Please try again."
    },
    "zh-cn": {
        "changePassword": "更改密码",
        "setPassword": "设置密码",
        "currentPassword": "当前密码",
        "newPassword": "新密码",
        "changePasswordSuccess": "密码更新成功。",
        "changePasswordFailed": "密码更新失败，请检查您的当前密码。",
        "updating": "更新中...",
        "deleteConfirmText": "DELETE",
        "authRequired": "需要进行身份验证",
        "authRequiredDesc": "为了安全起见，您必须登录才能永久删除您的账号和数据。",
        "loginToContinue": "登录以继续",
        "dangerZone": "危险区域",
        "dangerZoneDesc": "此操作将永久删除您的账号及所有保存的数据。此操作无法撤销。",
        "deleteAccount": "删除我的账号",
        "confirmDeletion": "确认删除",
        "confirmDeletionDesc": "在下方输入 DELETE 以确认。",
        "cancel": "取消",
        "confirmDelete": "确认删除",
        "deleting": "删除中...",
        "deleteSuccess": "账号已成功删除",
        "deleteSuccessDesc": "您的所有数据已被永久移除。",
        "returnHome": "返回首页",
        "deleteFailed": "删除账号失败，请重试。"
    },
    "zh-Hant": {
        "changePassword": "更改密碼",
        "setPassword": "設置密碼",
        "currentPassword": "當前密碼",
        "newPassword": "新密碼",
        "changePasswordSuccess": "密碼更新成功。",
        "changePasswordFailed": "密碼更新失敗，請檢查您的當前密碼。",
        "updating": "更新中...",
        "deleteConfirmText": "DELETE",
        "authRequired": "需要進行身份驗證",
        "authRequiredDesc": "為了安全起見，您必須登入才能永久刪除您的帳號和數據。",
        "loginToContinue": "登入以繼續",
        "dangerZone": "危險區域",
        "dangerZoneDesc": "此操作將永久刪除您的帳號及所有保存的數據。此操作無法撤銷。",
        "deleteAccount": "刪除我的帳號",
        "confirmDeletion": "確認刪除",
        "confirmDeletionDesc": "在下方輸入 DELETE 以確認。",
        "cancel": "取消",
        "confirmDelete": "確認刪除",
        "deleting": "刪除中...",
        "deleteSuccess": "帳號已成功刪除",
        "deleteSuccessDesc": "您的所有數據已被永久移除。",
        "returnHome": "返回首頁",
        "deleteFailed": "刪除帳號失敗，請重試。"
    },
    "ja": {
        "changePassword": "パスワードの変更",
        "setPassword": "パスワードを設定する",
        "currentPassword": "現在のパスワード",
        "newPassword": "新しいパスワード",
        "changePasswordSuccess": "パスワードが更新されました。",
        "changePasswordFailed": "パスワードの更新に失敗しました。現在のパスワードを確認してください。",
        "updating": "更新中...",
        "deleteConfirmText": "DELETE",
        "authRequired": "認証が必要です",
        "authRequiredDesc": "セキュリティ上の理由から、アカウントとデータを完全に削除するにはログインする必要があります。",
        "loginToContinue": "ログインして続行",
        "dangerZone": "危険ゾーン",
        "dangerZoneDesc": "この操作により、アカウントと保存されているすべてのデータが完全に削除されます。元に戻すことはできません。",
        "deleteAccount": "アカウントを削除",
        "confirmDeletion": "削除の確認",
        "confirmDeletionDesc": "確認のため下に DELETE と入力してください。",
        "cancel": "キャンセル",
        "confirmDelete": "削除を確認",
        "deleting": "削除中...",
        "deleteSuccess": "アカウントが削除されました",
        "deleteSuccessDesc": "すべてのデータが完全に削除されました。",
        "returnHome": "ホームに戻る",
        "deleteFailed": "アカウントの削除に失敗しました。もう一度お試しください。"
    },
    "ko": {
        "changePassword": "비밀번호 변경",
        "setPassword": "비밀번호 설정",
        "currentPassword": "현재 비밀번호",
        "newPassword": "새 비밀번호",
        "changePasswordSuccess": "비밀번호가 성공적으로 업데이트되었습니다.",
        "changePasswordFailed": "비밀번호 업데이트에 실패했습니다. 현재 비밀번호를 확인해 주세요.",
        "updating": "업데이트 중...",
        "deleteConfirmText": "DELETE",
        "authRequired": "인증 필요",
        "authRequiredDesc": "보안상의 이유로 계정과 데이터를 영구적으로 삭제하려면 로그인해야 합니다.",
        "loginToContinue": "계속하려면 로그인하세요",
        "dangerZone": "위험 구역",
        "dangerZoneDesc": "이 작업은 계정과 저장된 모든 데이터를 영구적으로 삭제합니다. 이 작업은 취소할 수 없습니다.",
        "deleteAccount": "내 계정 삭제",
        "confirmDeletion": "삭제 확인",
        "confirmDeletionDesc": "확인하려면 아래에 DELETE 를 입력하세요.",
        "cancel": "취소",
        "confirmDelete": "삭제 확인",
        "deleting": "삭제 중...",
        "deleteSuccess": "계정이 성공적으로 삭제되었습니다",
        "deleteSuccessDesc": "모든 데이터가 영구적으로 제거되었습니다.",
        "returnHome": "홈으로 돌아가기",
        "deleteFailed": "계정 삭제에 실패했습니다. 다시 시도해 주세요."
    }
}

fallback_translations = translations["en"]

for filepath in json_files:
    basename = os.path.basename(filepath)
    lang_code = basename.replace(".json", "")
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    t = translations.get(lang_code, fallback_translations)
    
    if "settings" not in data:
        data["settings"] = {}
        
    # Add auth/account settings strings
    for k, v in t.items():
        data["settings"][k] = v
        
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

print("Added account translation keys to all locales.")
