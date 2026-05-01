"""Tests for /api/v1/auth/* endpoints."""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import (
    create_access_token,
    decode_token,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.models.user import PasswordResetToken, User

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
FORGOT_URL = "/api/v1/auth/forgot-password"
RESET_URL = "/api/v1/auth/reset-password"

VALID_USER = {
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "password123",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _register(client: AsyncClient, payload: dict | None = None) -> dict:
    payload = payload or VALID_USER
    r = await client.post(REGISTER_URL, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------------------
# Security unit tests (no DB / HTTP required)
# ---------------------------------------------------------------------------

def test_password_hash_and_verify():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_access_token_roundtrip():
    token = create_access_token("42")
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "42"
    assert payload["type"] == "access"


def test_decode_token_wrong_type_raises():
    from jose import JWTError
    token = create_access_token("42")
    with pytest.raises(JWTError):
        decode_token(token, expected_type="refresh")


def test_generate_reset_token_is_unique():
    tokens = {generate_reset_token() for _ in range(50)}
    assert len(tokens) == 50


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------

async def test_register_success(client: AsyncClient):
    r = await client.post(REGISTER_URL, json=VALID_USER)
    assert r.status_code == 201
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_register_tokens_are_valid_jwts(client: AsyncClient):
    body = await _register(client)
    access_payload = decode_token(body["access_token"], expected_type="access")
    refresh_payload = decode_token(body["refresh_token"], expected_type="refresh")
    assert access_payload["sub"] == refresh_payload["sub"]


async def test_register_duplicate_email_returns_400(client: AsyncClient):
    await _register(client)
    r = await client.post(REGISTER_URL, json=VALID_USER)
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


async def test_register_short_password_returns_422(client: AsyncClient):
    r = await client.post(
        REGISTER_URL,
        json={**VALID_USER, "password": "short"},
    )
    assert r.status_code == 422


async def test_register_short_full_name_returns_422(client: AsyncClient):
    r = await client.post(
        REGISTER_URL,
        json={**VALID_USER, "full_name": "A"},
    )
    assert r.status_code == 422


async def test_register_invalid_email_returns_422(client: AsyncClient):
    r = await client.post(
        REGISTER_URL,
        json={**VALID_USER, "email": "not-an-email"},
    )
    assert r.status_code == 422


async def test_register_creates_user_in_db(client: AsyncClient, session: AsyncSession):
    await _register(client)
    result = await session.execute(select(User).where(User.email == VALID_USER["email"]))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.full_name == VALID_USER["full_name"]
    assert user.is_active is True
    assert user.is_verified is False
    # password must be stored hashed, never plain-text
    assert user.hashed_password != VALID_USER["password"]
    assert verify_password(VALID_USER["password"], user.hashed_password)


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------

async def test_login_success(client: AsyncClient):
    await _register(client)
    r = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_tokens_carry_correct_subject(client: AsyncClient, session: AsyncSession):
    await _register(client)
    r = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    payload = decode_token(r.json()["access_token"], expected_type="access")

    result = await session.execute(select(User).where(User.email == VALID_USER["email"]))
    user = result.scalar_one()
    assert payload["sub"] == str(user.id)


async def test_login_wrong_password_returns_401(client: AsyncClient):
    await _register(client)
    r = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": "wrongpassword",
    })
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid credentials"


async def test_login_unknown_email_returns_401(client: AsyncClient):
    r = await client.post(LOGIN_URL, json={
        "email": "nobody@example.com",
        "password": "password123",
    })
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid credentials"


async def test_login_inactive_user_returns_403(client: AsyncClient, session: AsyncSession):
    await _register(client)
    result = await session.execute(select(User).where(User.email == VALID_USER["email"]))
    user = result.scalar_one()
    user.is_active = False
    await session.commit()

    r = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    assert r.status_code == 403


async def test_login_wrong_and_unknown_return_same_message(client: AsyncClient):
    """Prevent email enumeration: wrong-password and unknown-email return identical responses."""
    await _register(client)
    r_wrong_pw = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"], "password": "bad"
    })
    r_no_user = await client.post(LOGIN_URL, json={
        "email": "ghost@example.com", "password": "bad"
    })
    assert r_wrong_pw.status_code == r_no_user.status_code == 401
    assert r_wrong_pw.json()["detail"] == r_no_user.json()["detail"]


# ---------------------------------------------------------------------------
# POST /forgot-password
# ---------------------------------------------------------------------------

async def test_forgot_password_known_email_returns_token(client: AsyncClient):
    await _register(client)
    r = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    assert r.status_code == 200
    body = r.json()
    assert "message" in body
    assert body["reset_token"] is not None
    assert len(body["reset_token"]) > 20


async def test_forgot_password_unknown_email_returns_no_token(client: AsyncClient):
    """Unknown email must not leak whether the address exists."""
    r = await client.post(FORGOT_URL, json={"email": "ghost@example.com"})
    assert r.status_code == 200
    body = r.json()
    assert "message" in body
    assert body["reset_token"] is None


async def test_forgot_password_same_message_for_known_and_unknown(client: AsyncClient):
    await _register(client)
    r_known = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    r_unknown = await client.post(FORGOT_URL, json={"email": "ghost@example.com"})
    assert r_known.json()["message"] == r_unknown.json()["message"]


async def test_forgot_password_invalidates_old_tokens(
    client: AsyncClient, session: AsyncSession
):
    await _register(client)
    r1 = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    first_token = r1.json()["reset_token"]

    r2 = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    second_token = r2.json()["reset_token"]

    assert first_token != second_token

    # old token should be marked used in DB
    result = await session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == first_token)
    )
    old = result.scalar_one_or_none()
    assert old is not None
    assert old.used is True


async def test_forgot_password_token_stored_in_db(
    client: AsyncClient, session: AsyncSession
):
    await _register(client)
    r = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    token_value = r.json()["reset_token"]

    result = await session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token_value)
    )
    db_token = result.scalar_one_or_none()
    assert db_token is not None
    assert db_token.used is False
    assert db_token.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# POST /reset-password
# ---------------------------------------------------------------------------

async def test_reset_password_success(client: AsyncClient):
    await _register(client)
    fp = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    token = fp.json()["reset_token"]

    r = await client.post(RESET_URL, json={"token": token, "new_password": "newpassword99"})
    assert r.status_code == 200
    assert r.json()["message"] == "Password reset successful"


async def test_reset_password_allows_login_with_new_password(client: AsyncClient):
    await _register(client)
    fp = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    token = fp.json()["reset_token"]

    await client.post(RESET_URL, json={"token": token, "new_password": "newpassword99"})

    r = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": "newpassword99",
    })
    assert r.status_code == 200


async def test_reset_password_old_password_no_longer_works(client: AsyncClient):
    await _register(client)
    fp = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    token = fp.json()["reset_token"]
    await client.post(RESET_URL, json={"token": token, "new_password": "newpassword99"})

    r = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],  # old password
    })
    assert r.status_code == 401


async def test_reset_password_token_cannot_be_reused(client: AsyncClient):
    await _register(client)
    fp = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    token = fp.json()["reset_token"]

    await client.post(RESET_URL, json={"token": token, "new_password": "newpassword99"})
    r = await client.post(RESET_URL, json={"token": token, "new_password": "anotherpass99"})
    assert r.status_code == 400


async def test_reset_password_invalid_token_returns_400(client: AsyncClient):
    r = await client.post(RESET_URL, json={"token": "fake-token", "new_password": "newpassword99"})
    assert r.status_code == 400


async def test_reset_password_expired_token_returns_400(
    client: AsyncClient, session: AsyncSession
):
    await _register(client)
    fp = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    token_value = fp.json()["reset_token"]

    # Back-date the token in DB to simulate expiry
    result = await session.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token_value)
    )
    db_token = result.scalar_one()
    db_token.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=2)
    await session.commit()

    r = await client.post(RESET_URL, json={"token": token_value, "new_password": "newpassword99"})
    assert r.status_code == 400


async def test_reset_password_short_new_password_returns_422(client: AsyncClient):
    r = await client.post(RESET_URL, json={"token": "anytoken", "new_password": "short"})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Full end-to-end flow
# ---------------------------------------------------------------------------

async def test_full_register_login_forgot_reset_flow(client: AsyncClient):
    # 1. Register
    reg = await client.post(REGISTER_URL, json=VALID_USER)
    assert reg.status_code == 201

    # 2. Login with original password
    login1 = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    assert login1.status_code == 200

    # 3. Forgot password
    fp = await client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
    assert fp.status_code == 200
    token = fp.json()["reset_token"]
    assert token is not None

    # 4. Reset password
    rp = await client.post(RESET_URL, json={"token": token, "new_password": "brandnewpass1"})
    assert rp.status_code == 200

    # 5. Old password rejected
    old_login = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    assert old_login.status_code == 401

    # 6. New password accepted
    new_login = await client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": "brandnewpass1",
    })
    assert new_login.status_code == 200
    body = new_login.json()
    assert "access_token" in body
    assert decode_token(body["access_token"], expected_type="access")["sub"]
