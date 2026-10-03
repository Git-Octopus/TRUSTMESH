# TrustMesh Backend Server (Dev B Lead)

The core backend application for **TrustMesh**, providing wallet-based authentication, user profile management, claim creation, off-chain evidence storage, cryptographic hashing, email OTP verification, live trust score calculation, and bidirectional Web3 blockchain event synchronization.

Built with **Node.js**, **Express**, **MongoDB / Mongoose**, **Ethers.js**, **Multer**, and **Nodemailer**.

---

## 1. Architecture Overview

TrustMesh strictly adheres to on-chain vs. off-chain data discipline:
- **On-Chain (`TrustMesh.sol`)**: Stores claim ID counters, user claim mappings, authorized verifier lists, claim lifecycle states (`PENDING`, `VERIFIED`, `REJECTED`, `REVOKED`), and 32-byte SHA-256 evidence reference fingerprints.
- **Off-Chain (Express + MongoDB)**: Stores rich biographical data, multimedia evidence documents (PDFs, images), email verification states, and audit trails.

```
       +--------------------------------------------------------------+
       |               Frontend Client (React + Vite)                |
       +------------------------------+-------------------------------+
                                      |
                      HTTP REST APIs  |  MetaMask Web3 (JSON-RPC)
                                      v
       +------------------------------+-------------------------------+
       |             TrustMesh Backend API (Port 5000)                |
       |                                                              |
       |  - Auth Controller (Nonce challenge, Ethers signature verify)|
       |  - Profile Controller (Bio, skills, education, experience)   |
       |  - Claim Controller (Draft/submit, evidence upload, hash)    |
       |  - Verification Engine (Rules, OTP validation, history)      |
       |  - Trust Score Service (Dynamic 0-100 weighted calculation)  |
       |  - Web3 Listener (Mined block events -> MongoDB sync)        |
       +--------------+-------------------------------+---------------+
                      |                               |
                      v                               v
        +-------------+-------------+   +-------------+-------------+
        |     MongoDB Database      |   | Ganache / Hardhat Node    |
        |  - Users, Profiles        |   | - TrustMesh.sol Contract  |
        |  - Claims, Verifications  |   | - On-chain state & events |
        |  - OTP Tokens             |   |   (ClaimVerified, etc.)   |
        +---------------------------+   +---------------------------+
```

---

## 2. Verification Engine & Trust Score Formula

### Verification Engine Rule
```
IF email_verified AND evidence_valid AND verifier_authorized AND verifier_approved
THEN claim_status = VERIFIED
ELSE claim_status = VERIFICATION_PENDING / REJECTED
```

### Trust Score Calculation (`trustScoreService.js`)
- **Base Score**: 50 points
- **Weightings**:
  - `Organization` / `Education`: **+10 pts**
  - `Mentor/Client` / `Experience`: **+8 pts**
  - `Peer` / `Skill` / `Project`: **+3 pts**
  - `Self`: **+0 pts**
  - Other: **+2 pts**
- **Anti-Gaming / Duplicate Verifier Dampening**:
  - Maximum of **2 full-credit verifications** per unique verifier wallet.
  - Subsequent verifications from the same verifier receive **50% dampened credit** (`Math.round(points * 0.5)`).
- **Scale**: Clamped between **0** and **100**.
- **Reputation Badges**:
  - `Master of Trust` (Score &ge; 90)
  - `Verified Expert` (Score &ge; 75)
  - `Trusted Contributor` (Score &ge; 60)
  - `Rising Member` (Score < 60)
  - `Institutional Endorsed` (&ge; 2 Organization verifications)
  - `Client Approved` (&ge; 3 Mentor/Client verifications)

---

## 3. API Reference

### Base URL: `http://localhost:5000/api`

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/nonce` | Public | Issue a cryptographic nonce and sign-in message for wallet address |
| `POST` | `/api/auth/login` | Public | Verify Ethereum wallet signature (`ethers.verifyMessage`) and issue JWT |
| `POST` | `/api/auth/register` | Public | Register or initialize user wallet, profile, and roles |
| `POST` | `/api/auth/send-otp` | Bearer | Generate 6-digit OTP, salt & hash, dispatch verification email |
| `POST` | `/api/auth/verify-otp` | Bearer | Verify OTP code, set `emailVerified=true` on User model |

### Profiles (`/api/profile`)
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/profile` | Bearer | Create user profile |
| `GET` | `/api/profile/:wallet` | Public | Get public profile by wallet address (includes user data, claims, live trust score) |
| `PUT` | `/api/profile` | Bearer | Update profile headline, bio, education, skills, experience, and profileImage |

### Claims & Evidence (`/api/claims`)
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/claims` | Bearer | Create claim (status: `DRAFT` or `SUBMITTED`) |
| `GET` | `/api/claims` | Public | List claims with optional filtering (`profileId`, `userId`, `status`, `type`) |
| `GET` | `/api/claims/:id` | Public | Get single claim with populated verification details |
| `PUT` | `/api/claims/:id` | Bearer (Owner/Admin) | Update draft claim metadata |
| `DELETE` | `/api/claims/:id` | Bearer (Owner/Admin) | Delete draft claim |
| `POST` | `/api/claims/:id/evidence` | Bearer (Owner) | Upload evidence file (`multipart/form-data`), validate MIME/size/duplicate, compute SHA-256 |

### Verification Engine & Sync (`/api/verification`)
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/verification/hash` | Public | Compute SHA-256 for data/text and check for duplicate evidence hashes |
| `POST` | `/api/verification/evidence-check` | Bearer (Owner) | Run automated evidence checks and advance status to `VERIFICATION_PENDING` |
| `POST` | `/api/verification/request` | Bearer (Owner) | Mark claim `VERIFICATION_PENDING` and notify verifier |
| `POST` | `/api/verification/sync` | Bearer (Verifier/Admin) | Record on-chain verification transaction result and update claim status |
| `GET` | `/api/verification/history/:claimId` | Public | Retrieve chronological verification audit trail |
| `GET` | `/api/trust-score/:profileId` | Public | Compute and return live trust score (0-100), source breakdown, and badges |

### Authorized Verifiers (`/api/verifiers`)
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/verifiers` | Public | List all authorized verifiers |
| `POST` | `/api/verifiers` | Bearer (Admin) | Register/authorize verifier off-chain record (mirrors on-chain `registerVerifier`) |
| `DELETE` | `/api/verifiers/:wallet` | Bearer (Admin) | Revoke verifier authorization |

### System Health
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health check endpoint returning service status |

---

## 4. Blockchain Event Synchronization (`web3Listener.js`)

The Web3 listener subscribes to the `TrustMesh.sol` smart contract on Ganache/Hardhat:
- **`ClaimVerified`**: Updates MongoDB `Claim.status = 'VERIFIED'`, sets `transactionHash`, and creates an immutable `Verification` audit entry.
- **`ClaimRejected`**: Updates `Claim.status = 'REJECTED'`, documents rejection reason.
- **`VerificationRevoked`**: Updates `Claim.status = 'REVOKED'`.
- **`VerifierRegistered`**: Updates matching user's role to `'verifier'`.
- **`VerifierRevoked`**: Reverts user's role to `'owner'`.

---

## 5. Quick Start & Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (local instance on port 27017, or MongoDB Atlas URI)

### 2. Configure Environment
Create `.env` inside `server/`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/trustmesh
JWT_SECRET=super_secret_jwt_key_trustmesh_2026
RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
OTP_EXPIRY_MINUTES=5
MAX_UPLOAD_MB=5
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Automated Tests
```bash
npm test
```
*Executes comprehensive Jest + Supertest suite with in-memory MongoDB.*

### 6. Run End-to-End Demo Script
```bash
node scripts/e2eIntegration.js
```
