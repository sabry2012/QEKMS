from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes, keywrap, hmac
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import os
import base64
import logging
from datetime import datetime, timezone
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from src.config import settings
from src.services.AuditService import AuditService

logger = logging.getLogger(__name__)

# Persistent server key path. Docker mounts /app/keys as writable.
SERVER_EC_KEY_PATH = os.getenv("SERVER_EC_KEY_PATH", "keys/server_ec_private.pem")

class QEKMS_service:
    def __init__(self):
        self.settings = settings
        self.audit = AuditService()
        self._server_private_key = self._load_or_generate_server_key()
        self.last_entropy_result = None
        self.last_entropy_passed = None
        self.generated_keys_count = 0

    def _load_or_generate_server_key(self):
        """Load persistent server ECDH key or generate new one."""
        os.makedirs(os.path.dirname(SERVER_EC_KEY_PATH) or ".", exist_ok=True)
        if os.path.exists(SERVER_EC_KEY_PATH):
            with open(SERVER_EC_KEY_PATH, "rb") as f:
                return serialization.load_pem_private_key(f.read(), password=None)
        else:
            private_key = ec.generate_private_key(ec.SECP256R1())
            with open(SERVER_EC_KEY_PATH, "wb") as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            return private_key

    def get_server_public_key(self) -> str:
        """Return base64 encoded PEM public key."""
        public_key = self._server_private_key.public_key()
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return base64.b64encode(pem).decode("utf-8")

    def derive_user_wrapping_key(self, client_public_key_b64: str) -> bytes:
        """Perform ECDH and return the raw 256-bit shared secret as the wrapping key."""
        client_pem = base64.b64decode(client_public_key_b64)
        client_public_key = serialization.load_pem_public_key(client_pem)
        
        # In SubtleCrypto, deriving AES-KW from ECDH uses the raw shared secret bits.
        shared_secret = self._server_private_key.exchange(ec.ECDH(), client_public_key)
        return shared_secret

    def wrap_key(self, plain_key: bytes, wrapping_key: bytes) -> str:
        """Wrap a key using AES-KW."""
        wrapped = keywrap.aes_key_wrap(wrapping_key, plain_key)
        return base64.b64encode(wrapped).decode("utf-8")

    async def validate_entropy(self, bitstring: str) -> bool:
        """
        NIST SP 800-22 Monobit Test (simplified).
        Checks if the proportion of 1s and 0s is roughly equal.
        """
        if not bitstring: return False
        ones = bitstring.count('1')
        n = len(bitstring)
        proportion = ones / n
        # Acceptance range for Monobit test (roughly 0.5 +/- tolerance)
        return 0.4 <= proportion <= 0.6

    def _track_key_generation(self, bitstring: str, passed: bool, n_qubits: int, source: str):
        ones = bitstring.count("1") if bitstring else 0
        zeros = bitstring.count("0") if bitstring else 0
        total = len(bitstring)
        self.generated_keys_count += 1
        self.last_entropy_passed = passed
        self.last_entropy_result = {
            "source": source,
            "bit_length": total,
            "ones": ones,
            "zeros": zeros,
            "ones_ratio": round(ones / total, 4) if total else 0,
            "n_qubits": n_qubits,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    def get_quantum_status(self) -> dict:
        return {
            "last_entropy_result": self.last_entropy_result,
            "passed": self.last_entropy_passed,
            "generated_keys": self.generated_keys_count,
        }

    async def force_recalibrate(self, user_id: str = "unknown"):
        """Forcibly generate a throwaway key just to recalibrate entropy/jitter."""
        previous_quality = self.last_entropy_result.get("quality") if self.last_entropy_result else None
        
        # Generation process automatically updates last_entropy_result
        await self.generate_key(user_id=user_id)
        
        if self.last_entropy_result:
            self.last_entropy_result["recalibrated_at"] = datetime.now(timezone.utc).isoformat()
            if previous_quality is not None:
                self.last_entropy_result["previous_quality"] = previous_quality

    async def generate_key(self, user_id: str = "unknown") -> bytes:
        """Generate a cryptographically random 256-bit key using a quantum circuit with validation."""
        target_bits = 256
        n_qubits = min(self.settings.N_QUBITS, 64)
        accumulated_bitstring = ""
        
        backend = AerSimulator()
        
        try:
            while len(accumulated_bitstring) < target_bits:
                qc = QuantumCircuit(n_qubits, n_qubits)
                qc.h(range(n_qubits))
                qc.measure(range(n_qubits), range(n_qubits))
                    
                job = backend.run(qc, shots=1)
                result = job.result().get_counts()
                bitstring = list(result.keys())[0].replace(' ', '')
                accumulated_bitstring += bitstring
            
            # Trim to exact length
            accumulated_bitstring = accumulated_bitstring[:target_bits]
            
            # ── Entropy & Quality Validation ──
            is_valid = await self.validate_entropy(accumulated_bitstring)
            quality_score = proportion * 2 if (proportion := accumulated_bitstring.count('1')/len(accumulated_bitstring)) <= 0.5 else (1 - proportion) * 2
            
            jitter = os.urandom(1)[0] / 255.0 * 10 # Simulated jitter in ms
            
            if not is_valid:
                self._track_key_generation(accumulated_bitstring, False, n_qubits, "fallback")
                self.last_entropy_result["quality"] = round(quality_score, 4)
                self.last_entropy_result["jitter_ms"] = round(jitter, 2)
                
                logger.warning("Quantum entropy failed monobit test. Falling back to PRNG.")
                fallback_key = os.urandom(32)
                try:
                    await self.audit.log(
                        "KEY_GENERATED",
                        user_id=user_id,
                        details={
                            "source": "fallback",
                            "entropy_passed": False,
                            "reason": "monobit_test_failed",
                            "quality": round(quality_score, 4),
                            "jitter_ms": round(jitter, 2),
                            "n_qubits": n_qubits,
                            "bit_length": len(accumulated_bitstring),
                            "generated_keys": self.generated_keys_count,
                            "raw_bitstring": accumulated_bitstring,
                            "final_key_hex": fallback_key.hex(),
                        },
                    )
                except Exception as audit_error:
                    logger.warning(f"Quantum audit logging failed: {audit_error}")
                return fallback_key

            self._track_key_generation(accumulated_bitstring, True, n_qubits, "quantum")
            self.last_entropy_result["quality"] = round(quality_score, 4)
            self.last_entropy_result["jitter_ms"] = round(jitter, 2)
            
            try:
                await self.audit.log(
                    "KEY_GENERATED",
                    user_id=user_id,
                    details={
                        "source": "quantum",
                        "entropy_passed": True,
                        "quality": round(quality_score, 4),
                        "jitter_ms": round(jitter, 2),
                        "n_qubits": n_qubits,
                        "bit_length": len(accumulated_bitstring),
                        "generated_keys": self.generated_keys_count,
                        "raw_bitstring": accumulated_bitstring,
                        "final_key_hex": int(accumulated_bitstring, 2).to_bytes(32, byteorder='big').hex(),
                    },
                )
            except Exception as audit_error:
                logger.warning(f"Quantum audit logging failed: {audit_error}")
            
        except Exception as e:
            self._track_key_generation(accumulated_bitstring, False, n_qubits, "fallback")
            fallback_key = os.urandom(32)
            try:
                await self.audit.log(
                    "KEY_GENERATED",
                    user_id=user_id,
                    details={
                        "source": "fallback",
                        "entropy_passed": False,
                        "reason": "quantum_simulator_error",
                        "error": str(e),
                        "n_qubits": n_qubits,
                        "bit_length": len(accumulated_bitstring),
                        "generated_keys": self.generated_keys_count,
                        "raw_bitstring": accumulated_bitstring,
                        "final_key_hex": fallback_key.hex(),
                    },
                )
            except Exception as audit_error:
                logger.warning(f"Quantum audit logging failed: {audit_error}")
            logger.warning(f"Quantum simulator error, falling back to os.urandom: {e}")
            return fallback_key

        # Convert bitstring to 32 bytes
        int_val = int(accumulated_bitstring, 2)
        return int_val.to_bytes(32, byteorder='big')

    def encrypt_aes_gcm(self, plaintext: bytes, key: bytes, associated_data: bytes = None) -> str:
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
        encrypted_blob = nonce + ciphertext
        return base64.b64encode(encrypted_blob).decode("utf-8")

    def decrypt_aes_gcm(self, encrypted_b64: str, key: bytes, associated_data: bytes = None) -> bytes:
        try:
            aesgcm = AESGCM(key)
            encrypted_blob = base64.b64decode(encrypted_b64)
            nonce = encrypted_blob[:12]
            ciphertext = encrypted_blob[12:]
            return aesgcm.decrypt(nonce, ciphertext, associated_data)
        except Exception as e:
            logger.error(f"AES-GCM decryption failed: {e}")
            raise

    def derive_signing_key(self, master_key: bytes) -> bytes:
        """Derive a 32-byte signing key from the master key via HKDF."""
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"",
            info=b"sig",
        )
        return hkdf.derive(master_key)

    def derive_encryption_key(self, master_key: bytes) -> bytes:
        """Derive a 32-byte encryption key from the master key via HKDF."""
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"",
            info=b"enc",
        )
        return hkdf.derive(master_key)

    def verify_hmac(self, data: bytes, signature: bytes, key: bytes) -> bool:
        """Verify an HMAC-SHA256 signature."""
        h = hmac.HMAC(key, hashes.SHA256())
        h.update(data)
        try:
            h.verify(signature)
            return True
        except Exception as e:
            logger.warning(f"HMAC verification failure: {e}")
            return False
