# TrustMesh

**TrustMesh** is a decentralized credential verification and trust score platform that bridges off-chain professional identities with on-chain cryptographic attestations.

---

## 1. System Architecture & Team Split

TrustMesh is developed across three core disciplines:

| Role | Lead | Responsibilities |
|---|---|---|
| **Dev A** | Frontend Lead | React + Vite UI, TailwindCSS, MetaMask/Web3 wallet connection, user screens |
| **Dev B** | Backend Lead | Express API, MongoDB, wallet auth (Ethers signatures), OTP email verification, document SHA-256 hashing, Verification Engine, live trust scoring, and blockchain synchronization |
| **Dev C** | Blockchain Lead | Solidity smart contracts (`TrustMesh.sol`), Hardhat node, Ganache deployment, on-chain event emissions, and automated ABI exports |

### Architectural Flow

```
                      +------------------------------------------+
                      |         Frontend (React + Vite)          |
                      +---------------------+--------------------+
                                            |
                         REST API Requests  |  MetaMask Web3 Transactions
                                            v
                      +---------------------+--------------------+
                      |    TrustMesh Express Backend Server     |
                      |          (Node.js + Mongoose)            |
                      |                                          |
                      |  - Wallet Authentication (Ethers/JWT)    |
                      |  - Profiles, Claims & Evidence Storage   |
                      |  - SHA-256 Hashing & Multi-MIME Validate|
                      |  - OTP Verification (Nodemailer)         |
                      |  - Verification Engine (Rules Evaluator) |
                      |  - Trust Score Service (0-100 Weighted)  |
                      |  - Web3 Listener (Ganache / Hardhat Sync)|
                      +----------+--------------------+----------+
                                 |                    |
                                 v                    v
                  +--------------+----+        +------+-------------------+
                  |  MongoDB Storage  |        |    Blockchain Core       |
                  | - Users & Nonces  |        | - TrustMesh.sol          |
                  | - Profiles        |        | - Hardhat / Ganache Node |
                  | - Claims & Audit  |        | - Immutable Events       |
                  | - OTP Records     |        |   (ClaimVerified, etc.)  |
                  +-------------------+        +--------------------------+
```

---

## 2. Backend Implementation (Dev B Lead)

The backend provides the authoritative off-chain data indexing, credential validation pipeline, and trust scoring engine.

### Key Modules:
- **Authentication (`/api/auth`)**: Cryptographic login using wallet signatures (`ethers.verifyMessage`). No passwords stored. Issues signed JWT sessions with role-based access (`owner`, `verifier`, `admin`).
- **Profile Management (`/api/profile`)**: Manage professional identity, education history, work experience, skill tags, and public shareable URLs.
- **Claims & Evidence (`/api/claims`)**: Support for Claim lifecycle (`DRAFT` &rarr; `SUBMITTED` &rarr; `EVIDENCE_CHECK` &rarr; `VERIFICATION_PENDING` &rarr; `VERIFIED` / `REJECTED` / `REVOKED`). Multer-based evidence uploads with strict MIME/size gating and SHA-256 hash generation.
- **Verification Engine (`/api/verification`)**:
  - Implements canonical verification rule:
    ```
    IF email_verified AND evidence_valid AND verifier_authorized AND verifier_approved
    THEN claim_status = VERIFIED
    ELSE claim_status = VERIFICATION_PENDING / REJECTED
    ```
- **Trust Score Engine (`/api/trust-score/:profileId`)**:
  - **Base starting score**: 50 points
  - **Organization / Education Claim**: +10 points
  - **Mentor / Client Claim**: +8 points
  - **Peer / Skill / Project Claim**: +3 points
  - **Self-Claimed**: +0 points
  - **Anti-Collusion / Dampening**: Maximum 2 full-credit claims per unique verifier; subsequent claims receive 50% credit.
  - **Score Range**: Clamped between 0 and 100.
  - **Reputation Badges**: `Master of Trust` (&ge;90), `Verified Expert` (&ge;75), `Trusted Contributor` (&ge;60), `Rising Member` (<60), `Institutional Endorsed`, `Client Approved`.
- **Blockchain Sync Listener (`web3Listener.js`)**: Real-time listener for smart contract events (`ClaimVerified`, `ClaimRejected`, `VerificationRevoked`, `VerifierRegistered`, `VerifierRevoked`) ensuring database status strictly mirrors the blockchain.

---

## 3. API Reference

All routes are served under `http://localhost:5000/api`.

| Route | Method | Access | Description |
|---|---|---|---|
| `/auth/nonce` | `POST` | Public | Issue a cryptographic nonce for sign-in |
| `/auth/login` | `POST` | Public | Verify wallet signature and issue JWT |
| `/auth/register` | `POST` | Public | Register/initialize wallet user record |
| `/auth/send-otp` | `POST` | Bearer | Send 6-digit OTP verification email |
| `/auth/verify-otp` | `POST` | Bearer | Verify OTP code and set `emailVerified=true` |
| `/profile/:wallet` | `GET` | Public | Fetch public profile, claims, and live trust score |
| `/profile` | `POST` | Bearer | Initialize user profile |
| `/profile` | `PUT` | Bearer | Update user profile details |
| `/claims` | `POST` | Bearer | Create a new claim (`DRAFT` / `SUBMITTED`) |
| `/claims` | `GET` | Public | List claims with query filters |
| `/claims/:id` | `GET` | Public | Fetch single claim by ID with verification details |
| `/claims/:id` | `PUT` | Bearer | Update draft claim metadata |
| `/claims/:id` | `DELETE` | Bearer | Delete draft claim |
| `/claims/:id/evidence` | `POST` | Bearer | Upload evidence document & compute SHA-256 |
| `/verification/hash` | `POST` | Public | Generate SHA-256 fingerprint & check duplicates |
| `/verification/evidence-check` | `POST` | Bearer | Run automated evidence pipeline checks |
| `/verification/request` | `POST` | Bearer | Request review from an authorized verifier |
| `/verification/sync` | `POST` | Verifier/Admin | Record on-chain result into verification audit collection |
| `/verification/history/:claimId` | `GET` | Public | Retrieve complete verification event audit log |
| `/trust-score/:profileId` | `GET` | Public | Fetch dynamic trust score, breakdown, and badges |
| `/verifiers` | `GET` | Public | List authorized verifiers |
| `/verifiers` | `POST` | Admin | Register and authorize a new verifier |
| `/verifiers/:wallet` | `DELETE` | Admin | Revoke verifier authorization |
| `/health` | `GET` | Public | System status and health monitor |

---

## 4. Blockchain Core (`blockchain/`)

The Solidity contract [`blockchain/contracts/TrustMesh.sol`](file:///c:/Academics/others/TRUSTMESH/blockchain/contracts/TrustMesh.sol) provides on-chain verifiable registry:
- **`registerProfile()`**: Registers claimant wallet address.
- **`createClaim(claimType, referenceHash)`**: Records new claim on-chain with evidence SHA-256 hash.
- **`requestVerification(claimId)`**: Claimant triggers verification workflow.
- **`verifyClaim(claimId)`**: Authorized verifier stamps claim on-chain.
- **`rejectClaim(claimId, reason)`**: Authorized verifier documents rejection reason.
- **`revokeVerification(claimId)`**: Authorized verifier revokes existing verification.
- **`registerVerifier(address)` / `revokeVerifier(address)`**: Owner-only administration of verifiers.

---

## 5. Quick Start & Execution

### 1. Install Dependencies
```bash
# In project root
cd client && npm install
cd ../server && npm install
cd ../blockchain && npm install
```

### 2. Available Scripts
From the repository root:
- `npm run server` - Starts the Express backend development server (`http://localhost:5000`)
- `npm run client` - Starts the Vite development server for the frontend (`http://localhost:5173`)
- `npm run chain` - Starts the local Hardhat blockchain node
- `npm run deploy` - Deploys contracts to Ganache and auto-exports ABI to client and server
- `npm run test:server` - Runs the comprehensive backend test suite (Jest + Supertest)
- `npm run test:chain` - Runs the smart contract unit tests (Hardhat + Mocha/Chai)
- `npm run demo` - Executes the complete end-to-end integration demo script

### 3. Running Backend Tests
```bash
cd server
npm test
```

### 4. Running Python Specification Verification Tests
```bash
pytest tests/test_backend.py
```
