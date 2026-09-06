const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustMesh Smart Contract (Dev C)", function () {
  let trustMesh;
  let owner, verifier1, verifier2, claimant1, claimant2, unauthorizedUser;

  const CLAIM_TYPE_SKILL = "Skill";
  const CLAIM_TYPE_EXP = "Experience";
  const HASH_SAMPLE_1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const HASH_SAMPLE_2 = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

  // ClaimStatus enum matching contract:
  // 0: PENDING, 1: VERIFIED, 2: REJECTED, 3: REVOKED
  const Status = {
    PENDING: 0,
    VERIFIED: 1,
    REJECTED: 2,
    REVOKED: 3,
  };

  beforeEach(async function () {
    [owner, verifier1, verifier2, claimant1, claimant2, unauthorizedUser] = await ethers.getSigners();

    const TrustMesh = await ethers.getContractFactory("TrustMesh");
    trustMesh = await TrustMesh.deploy();
    await trustMesh.waitForDeployment();

    // Authorize verifier1 as official verifier for testing
    await trustMesh.connect(owner).registerVerifier(verifier1.address);
  });

  describe("1. Deployment and Initial State", function () {
    it("Should set the deployer as the owner", async function () {
      expect(await trustMesh.owner()).to.equal(owner.address);
    });

    it("Should authorize deployer as default verifier", async function () {
      expect(await trustMesh.authorizedVerifiers(owner.address)).to.be.true;
    });

    it("Should initialize claimCounter to zero", async function () {
      expect(await trustMesh.claimCounter()).to.equal(0);
    });

    it("Should register authorized verifier correctly", async function () {
      expect(await trustMesh.authorizedVerifiers(verifier1.address)).to.be.true;
      expect(await trustMesh.authorizedVerifiers(unauthorizedUser.address)).to.be.false;
    });
  });

  describe("2. Profile Registration", function () {
    it("Should allow any wallet to register a profile and emit ProfileRegistered", async function () {
      const tx = await trustMesh.connect(claimant1).registerProfile();
      await expect(tx)
        .to.emit(trustMesh, "ProfileRegistered")
        .withArgs(claimant1.address, (await ethers.provider.getBlock(tx.blockNumber)).timestamp);

      expect(await trustMesh.registeredProfiles(claimant1.address)).to.be.true;
    });
  });

  describe("3. Claim Creation", function () {
    it("Should create a new claim and emit ClaimCreated event", async function () {
      const tx = await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "ClaimCreated")
        .withArgs(1, claimant1.address, blockTimestamp);

      expect(await trustMesh.claimCounter()).to.equal(1);

      const claim = await trustMesh.getClaim(1);
      expect(claim.id).to.equal(1);
      expect(claim.claimant).to.equal(claimant1.address);
      expect(claim.claimType).to.equal(CLAIM_TYPE_SKILL);
      expect(claim.referenceHash).to.equal(HASH_SAMPLE_1);
      expect(claim.status).to.equal(Status.PENDING);
      expect(claim.verifier).to.equal(ethers.ZeroAddress);
    });

    it("Should track user claim IDs in userClaims mapping", async function () {
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_EXP, HASH_SAMPLE_2);

      const claimsList = await trustMesh.getUserClaims(claimant1.address);
      expect(claimsList.length).to.equal(2);
      expect(claimsList[0]).to.equal(1);
      expect(claimsList[1]).to.equal(2);
    });

    it("Should revert if claimType is empty", async function () {
      await expect(
        trustMesh.connect(claimant1).createClaim("", HASH_SAMPLE_1)
      ).to.be.revertedWith("Claim type cannot be empty");
    });

    it("Should revert if referenceHash is empty", async function () {
      await expect(
        trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, "")
      ).to.be.revertedWith("Reference hash cannot be empty");
    });
  });

  describe("4. Verification Request Workflow", function () {
    beforeEach(async function () {
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
    });

    it("Should allow the claimant to request verification and emit VerificationRequested", async function () {
      const tx = await trustMesh.connect(claimant1).requestVerification(1);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "VerificationRequested")
        .withArgs(1, claimant1.address, blockTimestamp);
    });

    it("Should revert if non-claimant requests verification", async function () {
      await expect(
        trustMesh.connect(claimant2).requestVerification(1)
      ).to.be.revertedWith("Not claimant");
    });
  });

  describe("5. Claim Verification (Approval)", function () {
    beforeEach(async function () {
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
    });

    it("Should allow authorized verifier to verify claim and emit ClaimVerified", async function () {
      const tx = await trustMesh.connect(verifier1).verifyClaim(1);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "ClaimVerified")
        .withArgs(1, claimant1.address, verifier1.address, blockTimestamp);

      const claim = await trustMesh.getClaim(1);
      expect(claim.status).to.equal(Status.VERIFIED);
      expect(claim.verifier).to.equal(verifier1.address);
    });

    it("Should revert if unauthorized user attempts to verify claim", async function () {
      await expect(
        trustMesh.connect(unauthorizedUser).verifyClaim(1)
      ).to.be.revertedWith("Not authorized verifier");
    });

    it("Should revert if verifying an already verified claim (duplicate check)", async function () {
      await trustMesh.connect(verifier1).verifyClaim(1);
      await expect(
        trustMesh.connect(verifier1).verifyClaim(1)
      ).to.be.revertedWith("Claim is not pending");
    });

    it("Should revert if verifying invalid claim ID", async function () {
      await expect(
        trustMesh.connect(verifier1).verifyClaim(999)
      ).to.be.revertedWith("Invalid claim ID");
    });
  });

  describe("6. Claim Rejection", function () {
    beforeEach(async function () {
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
    });

    it("Should allow authorized verifier to reject claim with reason and emit ClaimRejected", async function () {
      const reason = "Evidence document signature mismatch";
      const tx = await trustMesh.connect(verifier1).rejectClaim(1, reason);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "ClaimRejected")
        .withArgs(1, claimant1.address, verifier1.address, reason, blockTimestamp);

      const claim = await trustMesh.getClaim(1);
      expect(claim.status).to.equal(Status.REJECTED);
      expect(claim.verifier).to.equal(verifier1.address);
    });

    it("Should revert if unauthorized user attempts to reject claim", async function () {
      await expect(
        trustMesh.connect(unauthorizedUser).rejectClaim(1, "reason")
      ).to.be.revertedWith("Not authorized verifier");
    });

    it("Should revert if rejecting a non-pending claim", async function () {
      await trustMesh.connect(verifier1).verifyClaim(1);
      await expect(
        trustMesh.connect(verifier1).rejectClaim(1, "Should fail")
      ).to.be.revertedWith("Claim is not pending");
    });
  });

  describe("7. Verification Revocation", function () {
    beforeEach(async function () {
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
      await trustMesh.connect(verifier1).verifyClaim(1);
    });

    it("Should allow authorized verifier to revoke verified claim and emit VerificationRevoked", async function () {
      const tx = await trustMesh.connect(verifier1).revokeVerification(1);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "VerificationRevoked")
        .withArgs(1, verifier1.address, blockTimestamp);

      const claim = await trustMesh.getClaim(1);
      expect(claim.status).to.equal(Status.REVOKED);
    });

    it("Should revert if unauthorized user attempts to revoke", async function () {
      await expect(
        trustMesh.connect(unauthorizedUser).revokeVerification(1)
      ).to.be.revertedWith("Not authorized verifier");
    });

    it("Should revert if revoking an unverified or pending claim", async function () {
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_EXP, HASH_SAMPLE_2);
      await expect(
        trustMesh.connect(verifier1).revokeVerification(2)
      ).to.be.revertedWith("Claim is not verified");
    });
  });

  describe("8. On-Chain Event History & Auditability", function () {
    it("Should preserve all event logs queryable via queryFilter for permanent audit trail", async function () {
      // 1. Create claim
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
      // 2. Verify claim
      await trustMesh.connect(verifier1).verifyClaim(1);
      // 3. Revoke claim
      await trustMesh.connect(verifier1).revokeVerification(1);

      // Verify ClaimCreated event exists in history
      const createdFilter = trustMesh.filters.ClaimCreated(1);
      const createdEvents = await trustMesh.queryFilter(createdFilter);
      expect(createdEvents.length).to.equal(1);
      expect(createdEvents[0].args.claimant).to.equal(claimant1.address);

      // Verify ClaimVerified event exists in history
      const verifiedFilter = trustMesh.filters.ClaimVerified(1);
      const verifiedEvents = await trustMesh.queryFilter(verifiedFilter);
      expect(verifiedEvents.length).to.equal(1);
      expect(verifiedEvents[0].args.verifier).to.equal(verifier1.address);

      // Verify VerificationRevoked event exists in history
      const revokedFilter = trustMesh.filters.VerificationRevoked(1);
      const revokedEvents = await trustMesh.queryFilter(revokedFilter);
      expect(revokedEvents.length).to.equal(1);
      expect(revokedEvents[0].args.verifier).to.equal(verifier1.address);
    });
  });

  describe("9. Verifier Authorization Management (Owner only)", function () {
    it("Should allow owner to authorize and register new verifier", async function () {
      const tx = await trustMesh.connect(owner).registerVerifier(verifier2.address);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "VerifierRegistered")
        .withArgs(verifier2.address, blockTimestamp);

      expect(await trustMesh.authorizedVerifiers(verifier2.address)).to.be.true;

      // verifier2 can now verify claims
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
      await expect(trustMesh.connect(verifier2).verifyClaim(1)).to.not.be.reverted;
    });

    it("Should allow authorizeVerifier alias function", async function () {
      await trustMesh.connect(owner).authorizeVerifier(verifier2.address);
      expect(await trustMesh.authorizedVerifiers(verifier2.address)).to.be.true;
    });

    it("Should revert when non-owner attempts to register or authorize a verifier", async function () {
      await expect(
        trustMesh.connect(claimant1).registerVerifier(verifier2.address)
      ).to.be.revertedWith("Not owner");

      await expect(
        trustMesh.connect(claimant1).authorizeVerifier(verifier2.address)
      ).to.be.revertedWith("Not owner");
    });

    it("Should allow owner to revoke an authorized verifier", async function () {
      const tx = await trustMesh.connect(owner).revokeVerifier(verifier1.address);
      const receipt = await tx.wait();
      const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

      await expect(tx)
        .to.emit(trustMesh, "VerifierRevoked")
        .withArgs(verifier1.address, blockTimestamp);

      expect(await trustMesh.authorizedVerifiers(verifier1.address)).to.be.false;

      // Revoked verifier should now fail to verify claims
      await trustMesh.connect(claimant1).createClaim(CLAIM_TYPE_SKILL, HASH_SAMPLE_1);
      await expect(
        trustMesh.connect(verifier1).verifyClaim(1)
      ).to.be.revertedWith("Not authorized verifier");
    });

    it("Should revert if revoking an already unauthorized address", async function () {
      await expect(
        trustMesh.connect(owner).revokeVerifier(unauthorizedUser.address)
      ).to.be.revertedWith("Verifier not authorized");
    });

    it("Should revert when registering zero address", async function () {
      await expect(
        trustMesh.connect(owner).registerVerifier(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid verifier address");
    });
  });

  describe("10. Edge Cases and Query Bounds", function () {
    it("Should revert getClaim on non-existent claim ID 0 or out-of-bounds", async function () {
      await expect(trustMesh.getClaim(0)).to.be.revertedWith("Invalid claim ID");
      await expect(trustMesh.getClaim(100)).to.be.revertedWith("Invalid claim ID");
    });

    it("Should return empty array for user with no claims", async function () {
      const userClaims = await trustMesh.getUserClaims(unauthorizedUser.address);
      expect(userClaims.length).to.equal(0);
    });
  });
});
