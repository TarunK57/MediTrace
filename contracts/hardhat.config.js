require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC || "",
      accounts: process.env.PRIVATE_KEY !== "PLACEHOLDER" ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
