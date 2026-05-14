from app.core.encryption import encrypt, decrypt

def test_encrypt_decrypt():
    original = '{"host": "localhost", "password": "secret"}'
    encrypted = encrypt(original)
    assert encrypted != original
    decrypted = decrypt(encrypted)
    assert decrypted == original
