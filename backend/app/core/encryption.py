import base64
from cryptography.fernet import Fernet
from app.config import settings

# Fernet requires 32 url-safe base64-encoded bytes
_key_bytes = settings.encryption_key.encode()[:32].ljust(32, b'0')[:32]
_fernet = Fernet(base64.urlsafe_b64encode(_key_bytes))

def encrypt(data: str) -> str:
    return _fernet.encrypt(data.encode()).decode()

def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()
