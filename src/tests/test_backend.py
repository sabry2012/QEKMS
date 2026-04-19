import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.models.AccountModel import AccountModel

client = TestClient(app)

def test_read_root():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_failure(monkeypatch):
    async def _missing_account(email: str):
        return None

    monkeypatch.setattr(AccountModel, "get_by_email", _missing_account)
    response = client.post("/auth/login", json={"email": "wrong@test.com", "password": "bad", "role": "account"})
    assert response.status_code == 401

def test_quantum_keys_mock():
    # If using local qiskit without limits, this should generate a 32-byte key stream
    response = client.get("/process/generate_key")
    assert response.status_code == 200
    assert "message" in response.json()

def test_quantum_status():
    response = client.get("/system/quantum-status")
    assert response.status_code == 200
    data = response.json()
    assert "last_entropy_result" in data
    assert "passed" in data
    assert "generated_keys" in data
