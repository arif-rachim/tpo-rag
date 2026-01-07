#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Simple session-based authentication using Python stdlib only.

NO EXTERNAL DEPENDENCIES - Uses only:
- hashlib (sha256 for password scrambling)
- secrets (secure token generation)
- datetime (session expiration)

This is a basic authentication system for internal use. NOT suitable for
high-security production environments.
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Import configuration from centralized config
try:
    from config import (
        DEFAULT_ADMIN_USERNAME,
        DEFAULT_ADMIN_PASSWORD_HASH,
        SESSION_TIMEOUT_HOURS,
    )
except ImportError:
    # Fallback if config.py not available (e.g., during standalone testing)
    import os
    DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_PASSWORD_HASH = os.getenv(
        "DEFAULT_ADMIN_PASSWORD_HASH",
        "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"  # sha256("admin")
    )
    SESSION_TIMEOUT_HOURS = int(os.getenv("SESSION_TIMEOUT_HOURS", "8"))


# --------------------------------------------------------------------------- #
#  In-Memory Session Store
# --------------------------------------------------------------------------- #

# Format: {token: {username: str, expires: datetime, created: datetime}}
active_sessions: Dict[str, Dict[str, Any]] = {}


# --------------------------------------------------------------------------- #
#  Password Functions
# --------------------------------------------------------------------------- #

def scramble_password(password: str) -> str:
    """
    Simple password scrambling using SHA-256.

    NOTE: This is NOT bcrypt or proper password hashing!
    For internal use only. Use a proper password hashing library
    (like bcrypt or argon2) for production systems.

    Parameters
    ----------
    password : str
        Plain text password

    Returns
    -------
    str
        SHA-256 hash in hexadecimal format
    """
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verify a password against its hash.

    Parameters
    ----------
    plain_password : str
        Plain text password to verify
    password_hash : str
        Expected password hash

    Returns
    -------
    bool
        True if password matches, False otherwise
    """
    return scramble_password(plain_password) == password_hash


# --------------------------------------------------------------------------- #
#  User Authentication
# --------------------------------------------------------------------------- #

def authenticate_user(username: str, password: str) -> bool:
    """
    Authenticate a user by username and password.

    Currently supports only a single admin user from environment variables.
    Can be extended to support multiple users from a database.

    Parameters
    ----------
    username : str
        Username to authenticate
    password : str
        Plain text password

    Returns
    -------
    bool
        True if authentication successful, False otherwise
    """
    # Check username
    if username != DEFAULT_ADMIN_USERNAME:
        return False

    # Verify password
    return verify_password(password, DEFAULT_ADMIN_PASSWORD_HASH)


# --------------------------------------------------------------------------- #
#  Session Management
# --------------------------------------------------------------------------- #

def create_session(username: str) -> str:
    """
    Create a new session for a user.

    Generates a secure random token and stores session info in memory.

    Parameters
    ----------
    username : str
        Username to create session for

    Returns
    -------
    str
        Session token (32-byte URL-safe random string)
    """
    # Generate secure random token
    token = secrets.token_urlsafe(32)

    # Store session
    now = datetime.now()
    active_sessions[token] = {
        "username": username,
        "created": now,
        "expires": now + timedelta(hours=SESSION_TIMEOUT_HOURS),
        "last_activity": now,
    }

    return token


def validate_session(token: str) -> Optional[str]:
    """
    Validate a session token and return username if valid.

    Also updates last_activity timestamp and removes expired sessions.

    Parameters
    ----------
    token : str
        Session token to validate

    Returns
    -------
    Optional[str]
        Username if session is valid, None otherwise
    """
    # Clean expired sessions first (housekeeping)
    cleanup_expired_sessions()

    # Check if token exists
    if token not in active_sessions:
        return None

    session = active_sessions[token]

    # Check if expired
    if datetime.now() > session["expires"]:
        del active_sessions[token]
        return None

    # Update last activity
    session["last_activity"] = datetime.now()

    return session["username"]


def invalidate_session(token: str) -> bool:
    """
    Invalidate (delete) a session.

    Used for logout functionality.

    Parameters
    ----------
    token : str
        Session token to invalidate

    Returns
    -------
    bool
        True if session was found and deleted, False otherwise
    """
    if token in active_sessions:
        del active_sessions[token]
        return True
    return False


def cleanup_expired_sessions() -> int:
    """
    Remove all expired sessions from memory.

    Called periodically during session validation.

    Returns
    -------
    int
        Number of sessions removed
    """
    now = datetime.now()
    expired_tokens = [
        token for token, session in active_sessions.items()
        if now > session["expires"]
    ]

    for token in expired_tokens:
        del active_sessions[token]

    return len(expired_tokens)


def get_active_sessions_count() -> int:
    """
    Get the number of active sessions.

    Returns
    -------
    int
        Number of active sessions
    """
    cleanup_expired_sessions()
    return len(active_sessions)


# --------------------------------------------------------------------------- #
#  Utility Functions
# --------------------------------------------------------------------------- #

def generate_password_hash(password: str) -> str:
    """
    Generate a password hash for storing in .env file.

    Helper function for administrators to generate password hashes.

    Parameters
    ----------
    password : str
        Plain text password

    Returns
    -------
    str
        SHA-256 hash to store in DEFAULT_ADMIN_PASSWORD_HASH

    Example
    -------
    >>> generate_password_hash("mypassword")
    '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8'
    """
    return scramble_password(password)


# --------------------------------------------------------------------------- #
#  Module Testing
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    print("=== Auth Module Test ===")
    print()

    # Test password hashing
    test_password = "testpass123"
    hashed = generate_password_hash(test_password)
    print(f"Password: {test_password}")
    print(f"Hash: {hashed}")
    print(f"Verify: {verify_password(test_password, hashed)}")
    print()

    # Test authentication
    print(f"Admin username: {DEFAULT_ADMIN_USERNAME}")
    print(f"Admin password hash: {DEFAULT_ADMIN_PASSWORD_HASH}")
    print(f"Test auth with 'admin'/'admin': {authenticate_user('admin', 'admin')}")
    print(f"Test auth with wrong password: {authenticate_user('admin', 'wrong')}")
    print()

    # Test session management
    print("Creating session...")
    token = create_session("admin")
    print(f"Token: {token[:20]}...")
    print(f"Validate: {validate_session(token)}")
    print(f"Active sessions: {get_active_sessions_count()}")
    print()

    # Test logout
    print("Invalidating session...")
    invalidate_session(token)
    print(f"Validate after logout: {validate_session(token)}")
    print(f"Active sessions: {get_active_sessions_count()}")
