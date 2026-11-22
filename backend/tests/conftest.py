import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.seed import PASSWORDS, seed_database


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.drop_all()
        db.create_all()
        seed_database()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def login(client):
    def _login(email, rol):
        res = client.post("/api/auth/login", json={"email": email, "password": PASSWORDS[rol]})
        assert res.status_code == 200, res.get_json()
        return {"Authorization": f"Bearer {res.get_json()['access_token']}"}

    return _login
