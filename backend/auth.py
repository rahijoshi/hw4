"""Password hashing.

The three seed accounts already carry hashes of the form
`pbkdf2_sha256$<salt>$<hex digest>`. Reverse-engineering the test account
(`test@campuscustoms.yale.edu` / `password`) against known PBKDF2 iteration
counts showed the digest is PBKDF2-HMAC-SHA256 with **120,000 iterations**,
salt used as raw UTF-8 bytes. New accounts use the same scheme so every row
in `users` — seeded or signed up through the site — is verified by the same
code path.

Nothing here ever stores or logs a plaintext password; only the salted
digest is written to the database.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

SCHEME = "pbkdf2_sha256"
ITERATIONS = 120_000  # fixed — see module docstring; not stored per-hash

# This format has no slot for the iteration count (unlike Django's real
# pbkdf2_sha256, which is 4 fields: algo$iterations$salt$hash). That is a
# real limitation: raising ITERATIONS later would make every existing hash
# unverifiable unless it's migrated first. Documented in output/harness.md.


def hash_password(password: str, *, salt: str | None = None) -> str:
    """Hash a password for storage. `salt` is only passed in tests."""
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS)
    return f"{SCHEME}${salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Check a login attempt against a stored hash. Never raises on bad input."""
    parts = stored_hash.split("$")
    if len(parts) != 3:
        return False
    scheme, salt, hex_digest = parts
    if scheme != SCHEME:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS)
    # constant-time compare so a login attempt can't be timed to learn the hash
    return hmac.compare_digest(candidate.hex(), hex_digest)
