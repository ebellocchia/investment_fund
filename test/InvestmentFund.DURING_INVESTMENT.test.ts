import { expect } from "chai";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";

//
// Tests for DURING_INVESTMENT state
//
describe("InvestmentFund.DURING_INVESTMENT", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initDuringInvestmentTestContext();
  });

  it("should allow fund manager deposit and withdraw with valid parameters", async () => {
    const fund_manager_address: string = await test_ctx.accounts.fund_manager.getAddress();
  
    const total_deposit: number = (await test_ctx.investment_fund.totalDepositedFunds()).toNumber();
    const initial_owner_bal: number = (await test_ctx.mock_token.balanceOf(fund_manager_address)).toNumber();

    const withdraw_amount: number = total_deposit / 2;
    const deposit_amount: number = total_deposit / 4;

    // Test withdraw
    await expect(await test_ctx.investment_fund.fundManagerWithdraw(withdraw_amount))
      .to.emit(test_ctx.investment_fund, "FundManagerFundsWithdrawn")
      .withArgs(fund_manager_address, withdraw_amount);
    expect(await test_ctx.mock_token.balanceOf(fund_manager_address))
      .to.equal(initial_owner_bal + withdraw_amount);
    expect(await test_ctx.investment_fund.totalDepositedFunds())
      .to.equal(total_deposit - withdraw_amount);
    // Test deposit
    await expect(await test_ctx.investment_fund.fundManagerDeposit(deposit_amount))
      .to.emit(test_ctx.investment_fund, "FundManagerFundsDeposited")
      .withArgs(fund_manager_address, deposit_amount); 
    expect(await test_ctx.mock_token.balanceOf(fund_manager_address))
      .to.equal(initial_owner_bal + withdraw_amount - deposit_amount);
    expect(await test_ctx.investment_fund.totalDepositedFunds())
      .to.equal(withdraw_amount + deposit_amount);
    // Test withdraw all
    await expect(await test_ctx.investment_fund.fundManagerWithdrawAll())
      .to.emit(test_ctx.investment_fund, "FundManagerFundsWithdrawn")
      .withArgs(fund_manager_address, total_deposit - withdraw_amount + deposit_amount); 
    expect(await test_ctx.mock_token.balanceOf(fund_manager_address))
      .to.equal(initial_owner_bal + total_deposit);
    expect(await test_ctx.investment_fund.totalDepositedFunds())
      .to.equal(0);
  });

  it("should go to AFTER_INVESTMENT state when startInvestorsWithdraw is called", async () => {
    // Simulate some deposits
    await test_ctx.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT);
    const amount_before_inv: number = (await test_ctx.investment_fund.totalAmountBeforeInvestment()).toNumber();
    const deposit_before_inv: number = (await test_ctx.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    await expect(await test_ctx.investment_fund.startInvestorsWithdraw())
      .to.emit(test_ctx.investment_fund, "InvestorsWithdrawStarted");
    // Compute new values
    const amount_after_inv: number = (await test_ctx.investment_fund.totalAmountAfterInvestment()).toNumber();
    const inv_multiplier: number = Math.floor((amount_after_inv * constants.MULTIPLIER_DECIMALS) / amount_before_inv);

    // Check contract state
    expect(await test_ctx.investment_fund.currState())
      .to.equal(constants.InvestmentStates.AFTER_INVESTMENT);
    expect(await test_ctx.investment_fund.totalAmountAfterInvestment())
      .to.equal(deposit_before_inv);
    expect(await test_ctx.investment_fund.investmentMultiplier())
      .to.equal(inv_multiplier);
  });

  it("should revert if fund manager deposit and withdraw are called with invalid parameters", async () => {
    await expect(test_ctx.investment_fund.fundManagerDeposit(0))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(0);
    await expect(test_ctx.investment_fund.fundManagerWithdraw(0))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(0);
  });

  it("should revert if not allowed functions are called", async () => {
    const dummy_address: string = await test_ctx.accounts.signers[0].getAddress();
  
    await expect(test_ctx.investment_fund.setPendingFundManager(dummy_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.acceptFundManager())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.setRemainingFundsAddress(dummy_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.setFundToken(test_ctx.mock_token.address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.investorDeposit(constants.DUMMY_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.investorWithdrawAll())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerReturnFundsToInvestor(dummy_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerReturnFundsToAllInvestors())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.startInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.stopInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.stopInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
  });
});
