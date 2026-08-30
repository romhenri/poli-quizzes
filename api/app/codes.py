"""Short, shareable, unguessable ids."""

import secrets

# Crockford-ish base32: no 0/O or 1/l/I to confuse anyone typing a link.
# Exactly 32 symbols, so `byte % 32` carries no modulo bias.
ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"


def new_id(length: int) -> str:
    """A short public code or a long edit key; only the length differs."""
    return "".join(ALPHABET[b % 32] for b in secrets.token_bytes(length))
