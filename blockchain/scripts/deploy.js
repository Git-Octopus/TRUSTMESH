const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("-----------------------------------------");
  console.log("TrustMesh Contract Deployment Starting...");
  console.log("-----------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  const TrustMesh = await hre.ethers.getContractFactory("TrustMesh");
  const trustMesh = await TrustMesh.deploy();

  await trustMesh.waitForDeployment();

  const contractAddress = await trustMesh.getAddress();
  console.log("TrustMesh successfully deployed to:", contractAddress);

  const artifact = await hre.artifacts.readArtifact("TrustMesh");

  const contractData = {
    address: contractAddress,
    network: hre.network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // 1. Write to Client contracts directory (for Dev A)
  const clientContractsDir = path.join(__dirname, "../../client/src/contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }
  const clientOutputPath = path.join(clientContractsDir, "TrustMesh.json");
  fs.writeFileSync(clientOutputPath, JSON.stringify(contractData, null, 2));
  console.log(`[Dev A] Wrote contract address and ABI to ${clientOutputPath}`);

  // 2. Write to Server contracts directory (for Dev B & Web3 sync listener)
  const serverContractsDir = path.join(__dirname, "../../server/src/contracts");
  if (!fs.existsSync(serverContractsDir)) {
    fs.mkdirSync(serverContractsDir, { recursive: true });
  }
  const serverOutputPath = path.join(serverContractsDir, "TrustMesh.json");
  fs.writeFileSync(serverOutputPath, JSON.stringify(contractData, null, 2));
  console.log(`[Dev B] Wrote contract address and ABI to ${serverOutputPath}`);

  console.log("-----------------------------------------");
  console.log("Deployment and ABI export complete!");
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
