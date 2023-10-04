import { expect } from "chai";
import { Contract, Signer } from "ethers";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";

//
// Tests for INITIAL state
//
describe("InvestmentFund.INITIAL", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initConstructedTestContext();
  });

  it("should construct contract correctly", async () => {
    const fund_manager_address: string = await test_ctx.accounts.fund_manager.getAddress();

    expect(await test_ctx.investment_fund.fundToken())
      .to.equal(test_ctx.mock_token.address);
    expect(await test_ctx.investment_fund.fundManager())
      .to.equal(fund_manager_address);
    expect(await test_ctx.investment_fund.pendingFundManager())
      .to.equal(constants.NULL_ADDRESS);
    expect(await test_ctx.investment_fund.remainingFundsAddr())
      .to.equal(fund_manager_address);
    expect(await test_ctx.investment_fund.depositMultipleOf())
      .to.equal(1);
    expect(await test_ctx.investment_fund.minInvestorDeposit())
      .to.equal(1);
    expect(await test_ctx.investment_fund.maxInvestorDeposit())
      .to.equal(constants.UINT256_MAX);
    expect(await test_ctx.investment_fund.currState())
      .to.equal(constants.InvestmentStates.INITIAL);
    expect(await test_ctx.investment_fund.totalAmountBeforeInvestment())
      .to.equal(0);
    expect(await test_ctx.investment_fund.totalAmountAfterInvestment())
      .to.equal(0);
    expect(await test_ctx.investment_fund.investmentMultiplier())
      .to.equal(constants.MIN_MULTIPLIER);
    expect(await test_ctx.investment_fund.numberOfInvestors())
      .to.equal(0);
    expect((await test_ctx.investment_fund.allInvestors()).length)
      .to.equal(0);
    expect(await test_ctx.investment_fund.totalDepositedFunds())
      .to.equal(0);
  });

  it("should allow to call set functions with valid parameters", async () => {
    const fund_manager_address: string = await test_ctx.accounts.fund_manager.getAddress();
    const other_address: string = await test_ctx.accounts.signers[0].getAddress();
  
    // setRemainingFundsAddress
    await expect(await test_ctx.investment_fund.setRemainingFundsAddress(other_address))
      .to.emit(test_ctx.investment_fund, "RemainingFundsAddressChanged")
      .withArgs(fund_manager_address, other_address);
    expect(await test_ctx.investment_fund.remainingFundsAddr())
      .to.equal(other_address);

    // setFundToken
    const mock_token_2: Contract = await utils.deployMockERC20TokenContract(test_ctx.accounts, 10);
    await expect(await test_ctx.investment_fund.setFundToken(mock_token_2.address))
      .to.emit(test_ctx.investment_fund, "FundTokenChanged")
      .withArgs(test_ctx.mock_token.address, mock_token_2.address);
    expect(await test_ctx.investment_fund.fundToken())
      .to.equal(mock_token_2.address);

    // setDepositMultipleOf
    await expect(await test_ctx.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF))
      .to.emit(test_ctx.investment_fund, "DepositMultipleOfChanged")
      .withArgs(1, constants.NEW_MULTIPLE_OF);
    expect(await test_ctx.investment_fund.depositMultipleOf())
      .to.equal(constants.NEW_MULTIPLE_OF);

    // setMinInvestorDeposit
    await expect(await test_ctx.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT))
      .to.emit(test_ctx.investment_fund, "MinInvestorDepositChanged")
      .withArgs(1, constants.NEW_MIN_AMOUNT);
    expect(await test_ctx.investment_fund.minInvestorDeposit())
      .to.equal(constants.NEW_MIN_AMOUNT);

    // setMaxInvestorDeposit
    await expect(await test_ctx.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT))
      .to.emit(test_ctx.investment_fund, "MaxInvestorDepositChanged")
      .withArgs(constants.UINT256_MAX, constants.NEW_MAX_AMOUNT);
    expect(await test_ctx.investment_fund.maxInvestorDeposit())
      .to.equal(constants.NEW_MAX_AMOUNT);
  });

  it("should go to BEFORE_INVESTMENT state when startInvestorsDeposit is called", async () => {
    await expect(await test_ctx.investment_fund.startInvestorsDeposit())
      .to.emit(test_ctx.investment_fund, "InvestorsDepositStarted");
    expect(await test_ctx.investment_fund.currState())
      .to.equal(constants.InvestmentStates.BEFORE_INVESTMENT);
  });

  it("should revert if set functions are called with invalid parameters", async () => {
    // Set parameters
    await test_ctx.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT);
    await test_ctx.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT);
    await test_ctx.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF);

    // Check reverts
    await expect(test_ctx.investment_fund.setDepositMultipleOf(0))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(0);
    await expect(test_ctx.investment_fund.setMinInvestorDeposit(0))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(0);
    await expect(test_ctx.investment_fund.setMinInvestorDeposit(constants.NEW_MAX_AMOUNT + 1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(constants.NEW_MAX_AMOUNT + 1);
    await expect(test_ctx.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT + (constants.NEW_MULTIPLE_OF / 2)))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(constants.NEW_MIN_AMOUNT + (constants.NEW_MULTIPLE_OF / 2));
    await expect(test_ctx.investment_fund.setMaxInvestorDeposit(0))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(0);
    await expect(test_ctx.investment_fund.setMaxInvestorDeposit(constants.NEW_MIN_AMOUNT - 1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(constants.NEW_MIN_AMOUNT - 1);
    await expect(test_ctx.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT - (constants.NEW_MULTIPLE_OF / 2)))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "ValueError")
      .withArgs(constants.NEW_MAX_AMOUNT - (constants.NEW_MULTIPLE_OF / 2));
  });

  it("should revert if set functions are not called by the fund manager", async () => {
    const other_account: Signer = test_ctx.accounts.signers[0];
    const other_address: string = await other_account.getAddress();

    await expect(test_ctx.investment_fund.connect(other_account).setRemainingFundsAddress(other_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).setFundToken(test_ctx.mock_token.address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).setDepositMultipleOf(1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).setMinInvestorDeposit(1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).setMaxInvestorDeposit(1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");

    await expect(test_ctx.investment_fund.connect(other_account).startInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).stopInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).startInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
    await expect(test_ctx.investment_fund.connect(other_account).stopInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerCallerError");
  });

  it("should revert if not allowed functions are called", async () => {
    const dummy_address: string = await test_ctx.accounts.signers[0].getAddress();

    await expect(test_ctx.investment_fund.investorDeposit(constants.DUMMY_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.investorWithdrawAll())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerWithdraw(constants.DUMMY_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerWithdrawAll())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerReturnFundsToInvestor(dummy_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerReturnFundsToAllInvestors())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.stopInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.startInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.stopInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
  });
});
