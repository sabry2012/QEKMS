# Quantum Encryption Key Management System (QEKMS)

A secure key management and encrypted communication platform that combines quantum-inspired randomness with modern classical cryptography.

QEKMS demonstrates a practical cryptographic key lifecycle using **Qiskit AerSimulator**, **ECDH**, **HKDF**, and **AES-256-GCM**, with a containerized backend, frontend dashboard, and database architecture.

> **Note:** QEKMS uses Qiskit AerSimulator for quantum-circuit simulation. It does not generate randomness from physical quantum hardware.

---

## 🚀 Key Features

- 🔐 Cryptographic key generation using quantum-inspired entropy
- ⚛️ Qiskit AerSimulator-based quantum circuit simulation
- 🔑 ECDH key agreement
- 🧬 HKDF-based key derivation
- 🛡️ AES-256-GCM authenticated encryption
- 🔄 Cryptographic key lifecycle management
- 👤 JWT-based HTTP-only authentication
- 🧑‍💼 Role-Based Access Control (Admin / User)
- 🌐 RESTful API using FastAPI
- 💻 React + TypeScript dashboard
- 🗄️ MongoDB persistence
- 🐳 Dockerized deployment
- 📊 Swagger / OpenAPI API documentation
- 🧪 Automated testing with Pytest

---

## 🏗️ System Architecture

QEKMS follows a three-tier containerized architecture:

```text
┌─────────────────────────────────────────────┐
│              React Dashboard                │
│        React + TypeScript + Vite            │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       ▼
┌─────────────────────────────────────────────┐
│               Quantum Backend               │
│          FastAPI + Python + Qiskit          │
│                                             │
│  Authentication • Key Management • Crypto   │
└──────────────────────┬──────────────────────┘
                       │
                       │ Async Database Access
                       ▼
┌─────────────────────────────────────────────┐
│                 Database                    │
│                  MongoDB                    │
└─────────────────────────────────────────────┘
```

---

## ⚛️ Quantum-Inspired Key Generation

The system uses **Qiskit AerSimulator** to simulate quantum circuits and extract entropy from simulated qubit measurements.

The generated entropy is processed into a binary representation and used as an input to the cryptographic key-generation workflow.

```text
Quantum Circuit Simulation
          │
          ▼
   Qubit Measurements
          │
          ▼
    Entropy Extraction
          │
          ▼
      Bitstring
          │
          ▼
   Cryptographic Key
```

> The simulator provides a quantum-inspired source of entropy for this project. It is not equivalent to randomness obtained from a physical quantum processor.

---

## 🔐 Cryptographic Workflow

QEKMS separates **key agreement**, **key derivation**, and **data encryption** into distinct stages.

```text
ECDH Key Agreement
        │
        ▼
   Shared Secret
        │
        ▼
       HKDF
        │
        ▼
 Derived Encryption Key
        │
        ▼
 AES-256-GCM Encryption
        │
        ▼
Encrypted Data + Authentication Tag
```

### ECDH

Elliptic Curve Diffie-Hellman is used to establish a shared secret between communicating parties.

### HKDF

HKDF derives cryptographically suitable key material from the ECDH shared secret.

### AES-256-GCM

The derived key is used with AES-256-GCM to provide:

- Confidentiality
- Integrity
- Authentication

---

## 🧩 Technology Stack

### Backend

- Python
- FastAPI
- Qiskit
- Qiskit AerSimulator
- PyJWT
- bcrypt
- Motor

### Frontend

- React
- TypeScript
- Vite
- Axios
- Tailwind CSS

### Database

- MongoDB

### Infrastructure

- Docker
- Docker Compose
- Nginx

### Testing

- Pytest

---

## 🛡️ Authentication & Authorization

QEKMS implements authentication and access control mechanisms including:

- JWT authentication
- HTTP-only cookies
- Role-Based Access Control
- Admin and User roles
- Password hashing using bcrypt
- Protected API endpoints

The frontend uses Axios interceptors to manage authenticated API communication.

---

## 🌐 API Overview

The backend exposes a RESTful API documented through Swagger / OpenAPI.

### Authentication

```text
POST /auth/register/account
POST /auth/login
GET  /auth/me
```

### Channels

```text
GET /channels
```

### Encryption

```text
POST /process/encrypt
```

The encryption endpoint supports payload processing for encrypted communication workflows.

For complete API details, start the backend and open:

```text
http://localhost:8000/docs
```

---

## 🐳 Docker Deployment

Docker Compose is the recommended way to run the complete QEKMS environment.

### Requirements

- Docker
- Docker Compose
- Git

### Start the Application

From the project root directory:

```bash
docker-compose up --build -d
```

### Access the Services

Frontend:

```text
http://localhost:80
```

Backend API:

```text
http://localhost:8000
```

Swagger API Documentation:

```text
http://localhost:8000/docs
```

---

## 💻 Local Development

### Backend

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Linux/macOS:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirement.txt
```

Run the backend:

```bash
cd src
uvicorn main:app --reload
```

### Frontend

Open another terminal:

```bash
cd qekms-dashboard
npm install
npm run dev
```

---

## 🧪 Testing

Run the backend test suite with:

```bash
pytest src/tests/
```

The project can also use GitHub Actions for automated testing workflows.

---

## 📁 Project Structure

```text
QEKMS/
│
├── src/
│   ├── main.py
│   └── tests/
│
├── qekms-dashboard/
│
├── docker-compose.yml
├── Dockerfile
├── requirement.txt
└── README.md
```

> The exact project structure may vary depending on the current development branch.

---

## 🎯 Project Goals

QEKMS was developed as a practical project to explore the integration of:

- Quantum computing concepts
- Cryptographic key management
- Modern authenticated encryption
- Secure authentication
- RESTful API development
- Containerized infrastructure
- Modern web application architecture

The project demonstrates how these technologies can work together in a complete security-oriented application.

---

## ⚠️ Security & Project Scope

QEKMS is an educational and engineering project demonstrating cryptographic concepts and key-management workflows.

It should not be considered a production-ready replacement for a certified enterprise Key Management System (KMS), Hardware Security Module (HSM), or physical Quantum Random Number Generator (QRNG).

Cryptographic implementations should be independently reviewed and tested before being used in production environments.

---

## 👨‍💻 Author

**Sabry Gomaa**

Junior Network Engineer | IT Support | Cybersecurity | Automation

- GitHub: [@sabry2012](https://github.com/sabry2012)
- LinkedIn: [Sabry Gomaa](https://www.linkedin.com/in/sabry-gomaa-b2306923a/)

---

⭐ If you find this project useful, consider giving it a star.
