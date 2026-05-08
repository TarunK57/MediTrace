const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MediTrace Contracts", function () {
  let batchNFT, handoffLogger, coldChainLogger, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const BatchNFT = await ethers.getContractFactory("BatchNFT");
    batchNFT = await BatchNFT.deploy();
    await batchNFT.waitForDeployment();

    const HandoffLogger = await ethers.getContractFactory("HandoffLogger");
    handoffLogger = await HandoffLogger.deploy();
    await handoffLogger.waitForDeployment();

    const ColdChainLogger = await ethers.getContractFactory("ColdChainLogger");
    coldChainLogger = await ColdChainLogger.deploy();
    await coldChainLogger.waitForDeployment();
  });

  describe("BatchNFT", function () {
    it("Can mint a batch successfully", async function () {
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 365;
      const mfg = Math.floor(Date.now() / 1000);
      await batchNFT.mintBatch("BATCH001", "Ibuprofen", "Ibuprofen", "200mg", "PharmaLtd", "CDSCO/2024/001", mfg, expiry);
      const batch = await batchNFT.getBatch("BATCH001");
      expect(batch.medicineName).to.equal("Ibuprofen");
      expect(batch.status).to.equal("active");
    });

    it("Cannot mint same batchId twice", async function () {
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 365;
      const mfg = Math.floor(Date.now() / 1000);
      await batchNFT.mintBatch("BATCH002", "Paracetamol", "Paracetamol", "500mg", "PharmaLtd", "CDSCO/2024/002", mfg, expiry);
      await expect(
        batchNFT.mintBatch("BATCH002", "Paracetamol", "Paracetamol", "500mg", "PharmaLtd", "CDSCO/2024/002", mfg, expiry)
      ).to.be.reverted;
    });

    it("isBatchValid returns true for active batch", async function () {
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 365;
      const mfg = Math.floor(Date.now() / 1000);
      await batchNFT.mintBatch("BATCH003", "Amoxicillin", "Amoxicillin", "250mg", "PharmaLtd", "CDSCO/2024/003", mfg, expiry);
      expect(await batchNFT.isBatchValid("BATCH003")).to.equal(true);
    });

    it("isBatchValid returns false after revoke", async function () {
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 365;
      const mfg = Math.floor(Date.now() / 1000);
      await batchNFT.mintBatch("BATCH004", "Aspirin", "Aspirin", "100mg", "PharmaLtd", "CDSCO/2024/004", mfg, expiry);
      await batchNFT.revokeBatch("BATCH004");
      expect(await batchNFT.isBatchValid("BATCH004")).to.equal(false);
    });

    it("Only owner can mint", async function () {
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 365;
      const mfg = Math.floor(Date.now() / 1000);
      await expect(
        batchNFT.connect(addr1).mintBatch("BATCH005", "Test", "Test", "10mg", "PharmaLtd", "CDSCO/2024/005", mfg, expiry)
      ).to.be.reverted;
    });
  });

  describe("HandoffLogger", function () {
    it("Can log a handoff", async function () {
      await handoffLogger.logHandoff("BATCH001", "manufacturer", "cnf_agent", "PharmaLtd", "QuickLogistics", "QR-TOKEN-001", 123456789, 987654321);
      const handoffs = await handoffLogger.getHandoffs("BATCH001");
      expect(handoffs.length).to.equal(1);
      expect(handoffs[0].fromEntity).to.equal("manufacturer");
    });

    it("Multiple handoffs stack correctly", async function () {
      await handoffLogger.logHandoff("BATCH001", "manufacturer", "cnf_agent", "PharmaLtd", "QuickLogistics", "QR-TOKEN-001", 123456789, 987654321);
      await handoffLogger.logHandoff("BATCH001", "cnf_agent", "stockist", "QuickLogistics", "MedStock", "QR-TOKEN-002", 123456789, 987654321);
      const count = await handoffLogger.getHandoffCount("BATCH001");
      expect(count).to.equal(2n);
    });
  });

  describe("ColdChainLogger", function () {
    it("Can log temperature reading", async function () {
      await coldChainLogger.logTemperature("BATCH001", 400, "Mumbai Warehouse", "SENSOR-001", false);
      const readings = await coldChainLogger.getReadings("BATCH001");
      expect(readings.length).to.equal(1);
    });

    it("isBreached returns false before anomaly", async function () {
      expect(await coldChainLogger.isBreached("BATCH001")).to.equal(false);
    });

    it("isBreached returns true after anomaly", async function () {
      await coldChainLogger.logTemperature("BATCH001", 2500, "Mumbai Warehouse", "SENSOR-001", true);
      expect(await coldChainLogger.isBreached("BATCH001")).to.equal(true);
    });

    it("getLatestTemperature returns correct value", async function () {
      await coldChainLogger.logTemperature("BATCH001", 400, "Mumbai Warehouse", "SENSOR-001", false);
      await coldChainLogger.logTemperature("BATCH001", 600, "Delhi Warehouse", "SENSOR-002", false);
      const latest = await coldChainLogger.getLatestTemperature("BATCH001");
      expect(latest).to.equal(600n);
    });
  });
});