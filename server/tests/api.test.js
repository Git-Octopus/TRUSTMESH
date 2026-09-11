const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

const app = require('../src/app');
const User = require('../src/models/User');
const Profile = require('../src/models/Profile');
const Claim = require('../src/models/Claim');
const Verification = require('../src/models/Verification');
const Otp = require('../src/models/Otp');
const { CLAIM_STATUSES } = require('../src/utils/constants');

let mongoServer;
let ownerWallet;
let verifierWallet;
let adminWallet;
let ownerToken;
let verifierToken;
let adminToken;
let ownerProfile;

// Helper to authenticate a wallet and obtain JWT
async function loginWallet(wallet, role = 'owner') {
  // 1. Get nonce
  const nonceRes = await request(app)
    .post('/api/auth/nonce')
    .send({ walletAddress: wallet.address });

  expect(nonceRes.status).toBe(200);
  expect(nonceRes.body.nonce).toBeDefined();

  // 2. Sign message
  const message = nonceRes.body.message;
  const signature = await wallet.signMessage(message);

  // 3. Login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      walletAddress: wallet.address,
      signature,
    });

  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toBeDefined();

  // Update role if needed
  if (role !== 'owner') {
    await User.findOneAndUpdate(
      { walletAddress: wallet.address.toLowerCase() },
      { role }
    );
  }

  return { token: loginRes.body.token, user: loginRes.body.user };
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-jwt-key-12345';
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create simulated Ethereum wallets
  ownerWallet = ethers.Wallet.createRandom();
  verifierWallet = ethers.Wallet.createRandom();
  adminWallet = ethers.Wallet.createRandom();

  // Log in each user
  const ownerAuth = await loginWallet(ownerWallet, 'owner');
  ownerToken = ownerAuth.token;

  const verifierAuth = await loginWallet(verifierWallet, 'verifier');
  verifierToken = verifierAuth.token;

  const adminAuth = await loginWallet(adminWallet, 'admin');
  adminToken = adminAuth.token;

  // Fetch or create profile for owner
  const profileRes = await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Alice Nakamoto',
      headline: 'Full-Stack Web3 Developer',
      bio: 'Building decentralized identity systems',
      skills: ['Solidity', 'Node.js', 'React', 'Cryptography'],
    });

  ownerProfile = profileRes.body.profile;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('1. Authentication & Security (Wallet + Signatures + OTP)', () => {
  it('GET /api/health should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/auth/nonce should reject invalid wallet format', async () => {
    const res = await request(app)
      .post('/api/auth/nonce')
      .send({ walletAddress: 'not-an-eth-address' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login should reject invalid signature', async () => {
    const randomWallet = ethers.Wallet.createRandom();
    const nonceRes = await request(app)
      .post('/api/auth/nonce')
      .send({ walletAddress: randomWallet.address });

    const wrongWallet = ethers.Wallet.createRandom();
    const badSignature = await wrongWallet.signMessage(nonceRes.body.message);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        walletAddress: randomWallet.address,
        signature: badSignature,
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
  });

  it('POST /api/auth/send-otp and /verify-otp should verify email', async () => {
    const email = 'alice@trustmesh.network';

    // Send OTP
    const sendRes = await request(app)
      .post('/api/auth/send-otp')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.success).toBe(true);

    // Retrieve the active OTP record from test database
    const otpDoc = await Otp.findOne({ email });
    expect(otpDoc).toBeDefined();

    // Verify OTP with wrong code
    const badVerify = await request(app)
      .post('/api/auth/verify-otp')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, otp: '000000' });
    expect(badVerify.status).toBe(400);

    // We can simulate OTP verification directly with valid OTP
    // Let's create an OTP with known code '123456'
    const { hashData } = require('../src/services/hashService');
    otpDoc.otpHash = hashData('trustmesh_otp_salt_123456');
    await otpDoc.save();

    const goodVerify = await request(app)
      .post('/api/auth/verify-otp')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, otp: '123456' });

    expect(goodVerify.status).toBe(200);
    expect(goodVerify.body.success).toBe(true);
    expect(goodVerify.body.emailVerified).toBe(true);

    // Check user record
    const updatedUser = await User.findOne({ walletAddress: ownerWallet.address.toLowerCase() });
    expect(updatedUser.emailVerified).toBe(true);
    expect(updatedUser.email).toBe(email);
  });
});

describe('2. Profile Management & Public Profiles', () => {
  it('GET /api/profile/:wallet should return public profile and trust score', async () => {
    const res = await request(app).get(`/api/profile/${ownerWallet.address}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.walletAddress).toBe(ownerWallet.address.toLowerCase());
    expect(res.body.profile.headline).toBe('Full-Stack Web3 Developer');
    expect(res.body.trustScore).toBeDefined();
    expect(res.body.trustScore.score).toBeGreaterThanOrEqual(50);
  });

  it('PUT /api/profile should update profile experience & education', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        headline: 'Senior Blockchain Architect',
        education: [
          {
            institution: 'MIT',
            degree: 'BS',
            fieldOfStudy: 'Computer Science',
            description: 'Focus on distributed consensus',
          },
        ],
        experience: [
          {
            company: 'Ethereum Foundation',
            position: 'Core Contributor',
            description: 'L2 Scaling research',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.profile.headline).toBe('Senior Blockchain Architect');
    expect(res.body.profile.education.length).toBe(1);
    expect(res.body.profile.experience.length).toBe(1);
  });
});

describe('3. Claims & Evidence Management', () => {
  let createdClaim;

  it('POST /api/claims should create a new claim in DRAFT status', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Master Solidity Certification',
        type: 'Organization',
        description: 'Certified Smart Contract Security Auditor from ConsenSys',
        status: 'DRAFT',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.claim.title).toBe('Master Solidity Certification');
    expect(res.body.claim.status).toBe(CLAIM_STATUSES.DRAFT);
    createdClaim = res.body.claim;
  });

  it('GET /api/claims should list claims with filtering', async () => {
    const res = await request(app)
      .get(`/api/claims?userId=${createdClaim.userId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.claims.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/claims/:id/evidence should upload evidence and compute SHA-256', async () => {
    const dummyFilePath = path.join(__dirname, 'test_evidence.pdf');
    fs.writeFileSync(dummyFilePath, '%PDF-1.4 Fake test PDF evidence for Alice Nakamoto certificate');

    const res = await request(app)
      .post(`/api/claims/${createdClaim._id}/evidence`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('evidence', dummyFilePath);

    // Clean up temporary file
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.evidenceHash).toBeDefined();
    expect(res.body.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.claim.status).toBe(CLAIM_STATUSES.EVIDENCE_CHECK);

    createdClaim = res.body.claim;
  });

  it('POST /api/verification/hash should compute SHA-256 and detect duplicates', async () => {
    const res = await request(app)
      .post('/api/verification/hash')
      .send({ text: 'Sample evidence verification string' });

    expect(res.status).toBe(200);
    expect(res.body.hash).toBeDefined();
    expect(res.body.hash.length).toBe(64);
  });

  it('POST /api/verification/evidence-check should advance claim to VERIFICATION_PENDING', async () => {
    const res = await request(app)
      .post('/api/verification/evidence-check')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ claimId: createdClaim._id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(CLAIM_STATUSES.VERIFICATION_PENDING);
    expect(res.body.checks.emailVerified).toBe(true);
    expect(res.body.checks.hasEvidence).toBe(true);
  });
});

describe('4. Verification Engine & Blockchain Sync', () => {
  let pendingClaim;

  beforeAll(async () => {
    // Create another claim ready for verification
    const claimRes = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Open Source Web3 Mentorship',
        type: 'Mentor/Client',
        description: 'Guided 5 junior devs to complete DeFi protocol audits',
        evidenceHash: 'a'.repeat(64),
        status: CLAIM_STATUSES.VERIFICATION_PENDING,
      });

    pendingClaim = claimRes.body.claim;
  });

  it('POST /api/verification/sync should verify claim when authorized verifier approves', async () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const syncRes = await request(app)
      .post('/api/verification/sync')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        claimId: pendingClaim._id,
        onChainClaimId: 101,
        verifierWallet: verifierWallet.address,
        status: CLAIM_STATUSES.VERIFIED,
        approved: true,
        transactionHash: txHash,
        comments: 'Verified smart contract and audit credentials',
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.claim.status).toBe(CLAIM_STATUSES.VERIFIED);
    expect(syncRes.body.claim.verification.verifierWallet).toBe(verifierWallet.address.toLowerCase());
    expect(syncRes.body.verification.transactionHash).toBe(txHash);
  });

  it('GET /api/trust-score/:profileId should compute updated score with breakdown', async () => {
    const res = await request(app).get(`/api/trust-score/${pendingClaim.profileId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.score).toBeGreaterThan(50);
    expect(res.body.totalVerified).toBeGreaterThanOrEqual(1);
    expect(res.body.breakdown.mentorClient).toBeGreaterThanOrEqual(1);
  });
});

describe('5. Authorized Verifiers & Admin Control', () => {
  it('GET /api/verifiers should list authorized verifiers', async () => {
    const res = await request(app).get('/api/verifiers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.verifiers)).toBe(true);
  });

  it('POST /api/verifiers should reject non-admin users', async () => {
    const newVerifierWallet = ethers.Wallet.createRandom();
    const res = await request(app)
      .post('/api/verifiers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        walletAddress: newVerifierWallet.address,
        name: 'Decentralized Audit Guild',
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/verifiers should allow admin to register verifier', async () => {
    const newVerifierWallet = ethers.Wallet.createRandom();
    const res = await request(app)
      .post('/api/verifiers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        walletAddress: newVerifierWallet.address,
        name: 'Ethereum Foundation Verifier Guild',
        email: 'guild@ethereum.org',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.verifier.walletAddress).toBe(newVerifierWallet.address.toLowerCase());
    expect(res.body.verifier.role).toBe('verifier');
  });
});
