const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying MediTrace contracts...");

  const BatchNFT = await hre.ethers.getContractFactory("BatchNFT");
  const batchNFT = await BatchNFT.deploy();
  await batchNFT.waitForDeployment();
  const batchNFTAddress = await batchNFT.getAddress();
  console.log("BatchNFT deployed to:", batchNFTAddress);

  const HandoffLogger = await hre.ethers.getContractFactory("HandoffLogger");
  const handoffLogger = await HandoffLogger.deploy();
  await handoffLogger.waitForDeployment();
  const handoffLoggerAddress = await handoffLogger.getAddress();
  console.log("HandoffLogger deployed to:", handoffLoggerAddress);

  const ColdChainLogger = await hre.ethers.getContractFactory("ColdChainLogger");
  const coldChainLogger = await ColdChainLogger.deploy();
  await coldChainLogger.waitForDeployment();
  const coldChainLoggerAddress = await coldChainLogger.getAddress();
  console.log("ColdChainLogger deployed to:", coldChainLoggerAddress);

  const addresses = {
    BatchNFT: batchNFTAddress,
    HandoffLogger: handoffLoggerAddress,
    ColdChainLogger: coldChainLoggerAddress,
    network: "hardhat-local",
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployedAddresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("Saved to deployedAddresses.json");

  const envPath = path.join(__dirname, "../../backend/.env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(/BATCH_NFT_CONTRACT_ADDRESS=.*/, "BATCH_NFT_CONTRACT_ADDRESS=" + batchNFTAddress);
  envContent = envContent.replace(/HANDOFF_CONTRACT_ADDRESS=.*/, "HANDOFF_CONTRACT_ADDRESS=" + handoffLoggerAddress);
  envContent = envContent.replace(/COLDCHAIN_CONTRACT_ADDRESS=.*/, "COLDCHAIN_CONTRACT_ADDRESS=" + coldChainLoggerAddress);
  fs.writeFileSync(envPath, envContent);
  console.log("backend/.env updated with contract addresses");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});