# Quantum Encryption Key Management System (QEKMS) 🚀

QEKMS is an enterprise-grade platform designed to generate and manage structurally robust cryptographic keys using true quantum randomness. By leveraging IBM's **Qiskit** quantum simulators, the system bridges the gap between quantum-mechanical entropy and classical **AES-GCM** encryption, providing a secure, post-quantum infrastructure for mission-critical communications.

## 🏗️ Architecture Explanation

The project has been scaled into a highly reliable 3-tier containerized architecture:

### 1. Quantum Backend (FastAPI + Python)
- Simulates qubits to extract perfect entropy bits via **Qiskit AerSimulator**.
- Converts them strictly to binary, avoiding integer overflow exceptions dynamically.
- Implements **JWT HTTP-Only Authentication**, safeguarding E2E payloads against XSS attacks.
- Provides standard CRUD access and Role-Based Access Control (Admin / Users).

### 2. Dashboard Interface (React + Vite + TypeScript)
- A highly performant frontend deployed on **Nginx**.
- Implemented with **Axios Interceptors** to handle stateless cookie handshakes.
- Highly modern dynamic UI implemented via **TailwindCSS**.

### 3. Database Layer (MongoDB)
- Stateful persistence driven asynchronously via `motor` targeting `collections` securely mapping Admins, Accounts, and encrypted Channels.

---

## ⚙️ Setup Instructions

Ensure that you have **Docker** and **Docker Compose** installed on your host machine.

### 🐳 How to Run with Docker (Recommended)
You can deploy the entire stack immediately without installing python wrappers or node modules on your host OS.
1. Download or clone this repository.
2. From the root directory (where `docker-compose.yml` resides), run:
```bash
docker-compose up --build -d
```
3. Open your browser:
   - **Frontend Dashboard**: `http://localhost:80`
   - **Backend API Docs (Swagger)**: `http://localhost:8000/docs`

### 💻 How to Run Locally (Development)
If you prefer testing isolated areas:
1. **Backend**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirement.txt
   cd src
   uvicorn main:app --reload
   ```
2. **Frontend**:
   ```bash
   cd qekms-dashboard
   npm install
   npm run dev
   ```

---

## 🛡️ API Documentation Highlight

The full operational capabilities explore symmetric channel linkages dynamically paired over user configurations.
* `POST /auth/register/account`: Registers a stateless identity leveraging `bcrypt`.
* `POST /auth/login`: Issues a secure `Set-Cookie` tracking token via `pyjwt`.
* `GET /auth/me`: Resolves identities using interceptors natively.
* `GET /channels`: Spits all active quantum tunnels available to your local token context.
* `POST /process/encrypt`: Form-Data payload capable of handling Blob/File ingest streaming.

## 🧪 Testing

Automated pipeline triggers GitHub actions naturally covering testing. To run tests locally in the backend:
```bash
pytest src/tests/
```
