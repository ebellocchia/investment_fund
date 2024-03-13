import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// Plugin
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "hardhat-docgen";
// Tasks
import "./tasks/deploy";
// Dotenv
import "dotenv/config";

const config: HardhatUserConfig = {
  // Networks
  networks: {
    // Default
    hardhat: {},
    // Localhost
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    // BSC testnet
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC,
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {mnemonic: process.env.MNEMONIC}
    },
    // BSC mainnet
    bsc: {
      url: process.env.BSC_MAINNET_RPC,
      chainId: 56,
      gasPrice: 20000000000,
      accounts: {mnemonic: process.env.MNEMONIC}
    },
    // Polygon testnet (Mumbai)
    polygonMumbai: {
      url: process.env.POLYGON_TESTNET_RPC,
      chainId: 80001,
      gasLimit: 10000000,
      gasPrice: 300000000000,
      accounts: {mnemonic: process.env.MNEMONIC}
    },
    // Polygon mainnet
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC,
      chainId: 137,
      gasLimit: 10000000,
      gasPrice: 300000000000,
      accounts: {mnemonic: process.env.MNEMONIC}
    },
    // Ethereum testnet (Sepolia)
    ethereumSepolia: {
      url: process.env.ETH_TESTNET_RPC,
      chainId: 11155111,
      accounts: {mnemonic: process.env.MNEMONIC}
    },
    // Ethereum mainnet
    ethereum: {
      url: process.env.ETH_MAINNET_RPC,
      chainId: 1,
      accounts: {mnemonic: process.env.MNEMONIC}
    }
  },
  // Compiler
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  // ABI export
  abiExporter: {
    path: "./abi",
    clear: true,
    flat: false,
    only: [":InvestmentFund$"],
    runOnCompile: true
  },
  // Contract size
  contractSizer: {
    only: [":InvestmentFund$"],
    runOnCompile: true
  },
  // Documentation generation
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: true
  },
  // Contract verification
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY
    }
  }
};

export default config;
