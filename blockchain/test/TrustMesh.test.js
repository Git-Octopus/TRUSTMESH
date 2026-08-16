const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustMesh", function () {
  let trustMesh, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const TrustMesh = await ethers.getContractFactory("TrustMesh");
    trustMesh = await TrustMesh.deploy();
    await trustMesh.waitForDeployment();
  });

  it("Should set the correct owner", async function () {
    expect(await trustMesh.owner()).to.equal(owner.address);
  });

  it("Should create a new claim", async function () {
    await trustMesh.connect(addr1).createClaim("QmEvidenceHashSample");
    expect(await trustMesh.claimCount()).to.equal(1);

    const claim = await trustMesh.claims(1);
    expect(claim.claimant).to.equal(addr1.address);
    expect(claim.evidenceHash).to.equal("QmEvidenceHashSample");
    expect(claim.isVerified).to.equal(false);
  });
});
