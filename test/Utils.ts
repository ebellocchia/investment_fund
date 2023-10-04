import { Contract, ContractFactory, Signer } from "ethers";
import hre from "hardhat";
import * as constants from "./Constants";

//
// Interfaces
//

export interface Accounts {
  signers: Signer[];
  owner: Signer;
  fund_manager: Signer;
}

export interface InvestorDeposit {
  amount: number;
  index: number;
}

export interface TestContext {
  accounts: Accounts;
  mock_token: Contract;
  investment_fund: Contract;
}

//
// Exported functions
//

export async function deployMockERC20TokenContract(
  accounts: Accounts,
  initialSupply: number
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("MockERC20Token");
  const instance: Contract = await contract_factory
    .connect(accounts.fund_manager)
    .deploy(initialSupply);
  await instance.deployed();

  return instance;
}

export async function initInvestorsDeposit(
  accounts: Accounts,
  investmentFund: Contract
) : Promise<void> {
  for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
    const curr_amount: number = constants.DUMMY_AMOUNT * i;
    const curr_signer: Signer = accounts.signers[i];

    await investmentFund.connect(curr_signer).investorDeposit(curr_amount);
  }
}

export async function initConstructedTestContext() : Promise<TestContext> {
  const accounts: Accounts = await initAccounts();
  const mock_token: Contract = await deployMockERC20TokenContract(accounts, constants.TOKEN_SUPPLY);
  const investment_fund: Contract = await deployInvestmentFundContract(mock_token);

  return {
    accounts,
    mock_token,
    investment_fund
  };
}

export async function initBeforeInvestmentTestContext() : Promise<TestContext> {
  const text_ctx: TestContext = await initConstructedTestContext();

  await initInvestors(text_ctx.accounts, text_ctx.investment_fund, text_ctx.mock_token);
  await initInvestmentParams(text_ctx.investment_fund);
  await text_ctx.investment_fund.startInvestorsDeposit();

  return text_ctx;
}

export async function initDuringInvestmentTestContext() : Promise<TestContext> {
  const text_ctx: TestContext = await initBeforeInvestmentTestContext();

  await initInvestorsDeposit(text_ctx.accounts, text_ctx.investment_fund);
  await text_ctx.investment_fund.stopInvestorsDeposit();

  return text_ctx;
}

export async function initAfterInvestmentTestContext() : Promise<TestContext> {
  const text_ctx: TestContext = await initDuringInvestmentTestContext();

  await text_ctx.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT);
  await text_ctx.investment_fund.startInvestorsWithdraw();

  return text_ctx;
}

export async function getInvestorAddress(
  investmentFund: Contract,
  index: number
) : Promise<string> {
  return (await investmentFund.investors(index));
}

export async function getInvestorDeposit(
  investmentFund: Contract,
  investorAddress: string
) : Promise<number> {
  return (await investmentFund.depositOfInvestor(investorAddress)).toNumber();
}

//
// Not exported functions
//

async function initAccounts() : Promise<Accounts> {
  const all_signers: Signer[] = await hre.ethers.getSigners();

  const owner: Signer = all_signers[0];
  const fund_manager: Signer = all_signers[0];
  const signers: Signer[] = [];
  for (let i = 1; i < all_signers.length; i++) {
    signers.push(all_signers[i])
  }

  return {
    fund_manager,
    owner,
    signers,
  };
}

async function deployInvestmentFundContract(
  mockToken: Contract
) : Promise<Contract> {
  const contract_factory: ContractFactory = await hre.ethers.getContractFactory("InvestmentFund");
  const instance: Contract = await contract_factory.deploy(mockToken.address);
  await instance.deployed();

  return instance;
}

async function initInvestors(
  accounts: Accounts,
  investmentFund: Contract,
  mockToken: Contract
) : Promise<void> {
  // Approve token spending for fund manager
  await mockToken
    .connect(accounts.fund_manager)
    .approve(investmentFund.address, constants.TOKEN_SUPPLY);

  // Approve mock token spending to all users and transfer them some tokens
  for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
    const curr_amount: number = constants.DUMMY_AMOUNT * 2 * i;
    const curr_signer: Signer = accounts.signers[i];

    await mockToken
      .connect(curr_signer)
      .approve(investmentFund.address, constants.TOKEN_SUPPLY);
    await mockToken.transfer(await curr_signer.getAddress(), curr_amount);
  }
}

async function initInvestmentParams(
  investmentFund: Contract
) : Promise<void> {
  await investmentFund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF);
  await investmentFund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT);
  await investmentFund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT);
}
