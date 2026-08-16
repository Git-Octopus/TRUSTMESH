const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying TrustMesh contract...");

  const TrustMesh = await hre.ethers.getContractFactory("TrustMesh");
  const trustMesh = await TrustMesh.deploy();

  await trustMesh.waitForDeployment();

  const contractAddress = await trustMesh.getAddress();
  console.log("TrustMesh deployed to:", contractAddress);

  const artifact = await hre.artifacts.readArtifact("TrustMesh");

  const contractData = {
    address: contractAddress,
    abi: artifact.abi,
  };

  const clientContractsDir = path.join(__dirname, "../../client/src/contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  const outputPath = path.join(clientContractsDir, "TrustMesh.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));

  console.log(`Wrote contract address and ABI to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
