
import hmac, hashlib
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

master = b"01234567890123456789012345678901" # 32 bytes
info = b"sig"
salt = b""

hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=info)
signing_key = hkdf.derive(master)

data = "test|nonce|12345".encode("utf-8")
sig = hmac.new(signing_key, data, hashlib.sha256).digest()

print(f"Key Hex: {signing_key.hex()}")
print(f"Sig Hex: {sig.hex()}")
print(f"Key Prefix: {signing_key.hex()[:6]}")
