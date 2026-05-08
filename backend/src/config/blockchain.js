const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);

// Load ABIs from the specified paths
const batchNFTAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../contracts/artifacts/contracts/BatchNFT.sol/BatchNFT.json'), 'utf8')
).abi;

const handoffAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../contracts/artifacts/contracts/HandoffLogger.sol/HandoffLogger.json'), 'utf8')
).abi;

const coldChainAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../contracts/artifacts/contracts/ColdChainLogger.sol/ColdChainLogger.json'), 'utf8')
).abi;

// Create contract instances
const batchNFTContract = new ethers.Contract(
  process.env.BATCH_NFT_CONTRACT_ADDRESS,
  batchNFTAbi,
  provider
);

const handoffContract = new ethers.Contract(
  process.env.HANDOFF_CONTRACT_ADDRESS,
  handoffAbi,
  provider
);

const coldChainContract = new ethers.Contract(
  process.env.COLDCHAIN_CONTRACT_ADDRESS,
  coldChainAbi,
  provider
);

// Create a signer using ADMIN_PRIVATE_KEY
const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

console.log("Blockchain config initialized");

module.exports = {
  provider,
  batchNFTContract,
  handoffContract,
  coldChainContract,
  signer
};
