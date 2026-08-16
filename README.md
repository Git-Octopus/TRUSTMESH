# TrustMesh

TrustMesh is a decentralized claim verification and trust score platform.

## Repository Structure

```
trustmesh/
├── client/        # Vite + React + Tailwind CSS frontend
├── server/        # Node.js + Express + Mongoose backend
├── blockchain/    # Solidity + Hardhat smart contracts
├── uploads/       # Off-chain local evidence storage
└── docs/          # Architecture diagrams, API references, and demo scripts
```

## Quick Start

1. Install dependencies in each workspace:
   ```bash
   cd client && npm install
   cd ../server && npm install
   cd ../blockchain && npm install
   ```

2. Available Root Scripts:
   - `npm run client` - Starts the Vite dev server for the client
   - `npm run server` - Starts the Express backend dev server
   - `npm run chain` - Starts the local Hardhat node
   - `npm run deploy` - Deploys smart contracts to Ganache network
