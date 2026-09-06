# TrustMesh Blockchain Layer (Dev C)

The decentralized verification registry and smart contract core for **TrustMesh**, built with Solidity `^0.8.20`, Hardhat, and Ethers.js.

---

## 1. Architecture & Design

`TrustMesh.sol` serves as the decentralized source of truth for all credential verifications. While rich profile metadata and raw evidence documents are stored off-chain (MongoDB and file storage), cryptographic fingerprints (SHA-256 hashes), claim lifecycle statuses, and verifier attestations are immutably recorded on-chain.

```
       +-------------------------------------------------------------+
       |                       TrustMesh.sol                         |
       |-------------------------------------------------------------|
       |  State:                                                     |
       |  - claims: mapping(uint256 => Claim)                        |
       |  - userClaims: mapping(address => uint256[])                |
       |  - authorizedVerifiers: mapping(address => bool)            |
       |  - registeredProfiles: mapping(address => bool)             |
       |  - claimCounter: uint256                                    |
       |-------------------------------------------------------------|
       |  Key Methods:                                               |
       |  + registerProfile()                                        |
       |  + createClaim(claimType, referenceHash) -> uint256         |
       |  + requestVerification(claimId)                             |
       |  + verifyClaim(claimId)             [onlyAuthorizedVerifier]|
       |  + rejectClaim(claimId, reason)     [onlyAuthorizedVerifier]|
       |  + revokeVerification(claimId)      [onlyAuthorizedVerifier]|
       |  + registerVerifier(verifier)       [onlyOwner]             |
       |  + revokeVerifier(verifier)         [onlyOwner]             |
       |  + getClaim(claimId) -> Claim                               |
       |  + getUserClaims(user) -> uint256[]                         |
       +-------------------------------------------------------------+
```

### Claim Lifecycle Statuses
- `PENDING` (`0`): Claim created by claimant; waiting for authorized verifier review.
- `VERIFIED` (`1`): Verified and approved by an authorized verifier with on-chain signature.
- `REJECTED` (`2`): Rejected by an authorized verifier with a documented reason.
- `REVOKED` (`3`): Previously verified claim revoked by an authorized verifier. Past historical events remain fully queryable.

---

## 2. Emitted Events (Canonical Specification)

All critical state transitions emit indexed events for off-chain indexing and backend synchronization:

| Event | Parameters | Purpose |
|-------|------------|---------|
| `ProfileRegistered` | `address indexed user, uint256 timestamp` | User profile wallet initialization |
| `ClaimCreated` | `uint256 indexed claimId, address indexed claimant, uint256 timestamp` | New claim submitted |
| `VerificationRequested` | `uint256 indexed claimId, address indexed claimant, uint256 timestamp` | Claimant triggers verification |
| `ClaimVerified` | `uint256 indexed claimId, address indexed claimant, address indexed verifier, uint256 timestamp` | Claim approved on-chain |
| `ClaimRejected` | `uint256 indexed claimId, address indexed claimant, address indexed verifier, string reason, uint256 timestamp` | Claim rejected with reason |
| `VerificationRevoked` | `uint256 indexed claimId, address indexed verifier, uint256 timestamp` | Verified claim revoked |
| `VerifierRegistered` | `address indexed verifier, uint256 timestamp` | Verifier authorization granted |
| `VerifierRevoked` | `address indexed verifier, uint256 timestamp` | Verifier authorization removed |

---

## 3. Quick Start & Commands

### Prerequisites
- Node.js (v18+ recommended)
- Local Ethereum node (Hardhat built-in node or Ganache on `http://127.0.0.1:7545`)

### Install Dependencies
```bash
npm install
```

### Compile Smart Contracts
```bash
npx hardhat compile
```

### Run Comprehensive Test Suite
```bash
npx hardhat test
```
*Current test suite achieves 100% pass rate across 30 unit and edge-case tests.*

### Deploy to Local Network
```bash
# In-memory Hardhat deployment (tests deployment & auto-exports ABI)
npx hardhat run scripts/deploy.js

# Or against local Ganache instance (port 7545)
npx hardhat run scripts/deploy.js --network ganache
```

---

## 4. Automated ABI & Address Export

Running `scripts/deploy.js` automatically writes contract data (`address`, `abi`, `network`, `deployer`, `deployedAt`) directly into:
1. **Frontend**: `client/src/contracts/TrustMesh.json` (Consumed by Dev A / MetaMask)
2. **Backend**: `server/src/contracts/TrustMesh.json` (Consumed by Dev B / `web3Listener.js`)

This eliminates any manual copy-pasting of ABI or contract addresses between repos.
