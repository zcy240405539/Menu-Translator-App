from types import SimpleNamespace

from app.services import auth_service


class FakeDatabase:
    def __init__(self):
        self.deleted = []
        self.committed = False
        self.rolled_back = False

    def delete(self, value):
        self.deleted.append(value)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


def test_delete_user_account_removes_auth_and_profile(monkeypatch):
    deleted_auth_ids = []
    client = SimpleNamespace(
        auth=SimpleNamespace(
            admin=SimpleNamespace(delete_user=deleted_auth_ids.append),
        ),
    )
    monkeypatch.setattr(auth_service, "get_supabase_client", lambda: client)
    database = FakeDatabase()
    user = SimpleNamespace(id="user-123")

    auth_service.delete_user_account(database, user)

    assert deleted_auth_ids == ["user-123"]
    assert database.deleted == [user]
    assert database.committed is True
    assert database.rolled_back is False
