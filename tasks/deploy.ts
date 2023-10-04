import { BigNumber, Contract, ContractFactory } from "ethers";
import { task } from "hardhat/config";

task("deploy-live", "Deploy contract in live mode (token address shall be provided)")
  .addParam("tokenAddress", "Token address")
  .setAction(async (taskArgs, hre) => {
    console.log("Deploying contract in live mode...");

    const fund_contract_factory: ContractFactory = await hre.ethers.getContractFactory("InvestmentFund");
    const fund_instance: Contract = await fund_contract_factory
      .deploy(taskArgs.tokenAddress);
    await fund_instance.deployed();
  
    console.log(`InvestmentFund deployed to ${fund_instance.address} with token address ${taskArgs.tokenAddress}`);
  });

  task("deploy-test", "Deploy contract in test mode (MockToken will be deployed as token)")
  .addParam("tokenSupply", "MockToken supply")
  .setAction(async (taskArgs, hre) => {
    const token_supply: BigNumber = BigNumber.from(taskArgs.tokenSupply);

    console.log("Deploying contract in test mode...");

    const token_contract_factory: ContractFactory = await hre.ethers.getContractFactory("MockERC20Token");
    const token_instance: Contract = await token_contract_factory
      .deploy(token_supply);
    await token_instance.deployed();

    const fund_contract_factory: ContractFactory = await hre.ethers.getContractFactory("InvestmentFund");
    const fund_instance: Contract = await fund_contract_factory
      .deploy(token_instance.address);
    await fund_instance.deployed();
  
    console.log(`InvestmentFund deployed to ${fund_instance.address} with MockToken address ${token_instance.address}`);
  });
