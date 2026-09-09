# TrustMesh API Reference (Dev B Backend Specification)

## Base URL
`http://localhost:5000/api`

---

## 1. Authentication (Wallet Signature & OTP)
No passwords used; all authentication is wallet-based via Ethers message signing.

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/nonce` | Public | Issue a cryptographic nonce and sign-in message for a wallet address |
| `POST` | `/api/auth/login` | Public | Verify Ethereum wallet signature (`ethers.verifyMessage`) and issue JWT |
| `POST` | `/api/auth/send-otp` | Bearer (Owner) | Generate 6-digit OTP, hash+store, and dispatch verification email |
| `POST` | `/api/auth/verify-otp` | Bearer (Owner) | Verify OTP code, set `emailVerified=true` on User model |

---

## 2. Profiles & Trust Identity
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/profile` | Bearer (Owner) | Create user profile |
| `GET` | `/api/profile/:wallet` | Public | Get public profile by wallet address (includes user data, claims, and live trust score) |
| `PUT` | `/api/profile` | Bearer (Owner) | Update profile headline, bio, education, skills, experience, and profileImage |

---

## 3. Claims & Evidence
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/claims` | Bearer (Owner) | Create claim (status: `DRAFT` or `SUBMITTED`) |
| `GET` | `/api/claims/:id` | Public | Get single claim with verification details |
| `GET` | `/api/claims?profileId=&userId=&status=&type=` | Public | List claims with optional filtering |
| `POST` | `/api/claims/:id/evidence` | Bearer (Owner) | Upload evidence file (`multipart/form-data`), validate MIME/size/duplicate, compute SHA-256 |

---

## 4. Verification Engine & Blockchain Sync
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/verification/hash` | Public | Compute SHA-256 for data/text and check for duplicate evidence hashes |
| `POST` | `/api/verification/evidence-check` | Bearer (Owner) | Run automated evidence checks and move status to `EVIDENCE_CHECK` / `VERIFICATION_PENDING` |
| `POST` | `/api/verification/request` | Bearer (Owner) | Mark claim `VERIFICATION_PENDING` and notify verifier |
| `POST` | `/api/verification/sync` | Bearer (Verifier/Admin) | Record on-chain verification transaction result and update claim status |
| `GET` | `/api/trust-score/:profileId` | Public | Compute and return live trust score (0-100), source breakdown, and badges |

---

## 5. Authorized Verifiers
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/verifiers` | Public | List authorized verifiers |
| `POST` | `/api/verifiers` | Bearer (Admin) | Register/authorize verifier off-chain record (mirrors on-chain `registerVerifier`) |

---

## 6. System & Health
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health check endpoint returning service status |
