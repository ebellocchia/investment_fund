import { expect } from "chai";
import { Signer } from "ethers";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";

//
// Tests for AFTER_INVESTMENT state
//
describe("InvestmentFund.AFTER_INVESTMENT", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initAfterInvestmentTestContext();
  });

  it("should allow investors to withdraw their funds", async () => {
    let total_amount: number = (await test_ctx.investment_fund.totalDepositedFunds()).toNumber();
    const inv_multiplier: number = (await test_ctx.investment_fund.investmentMultiplier()).toNumber();

    for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      const curr_signer: Signer = test_ctx.accounts.signers[i];
      const curr_address: string = await curr_signer.getAddress();
      const curr_amount: number = Math.floor((constants.DUMMY_AMOUNT * i * inv_multiplier) / constants.MULTIPLIER_DECIMALS);
      const initial_balance: number = (await test_ctx.mock_token.balanceOf(curr_address)).toNumber();

      total_amount -= curr_amount;

      // Withdraw to account
      await expect(await test_ctx.investment_fund.connect(curr_signer).investorWithdrawAll())
        .to.emit(test_ctx.investment_fund, "InvestorAllFundsWithdrawn")
        .withArgs(curr_address, curr_amount);
      // Check state
      expect(await test_ctx.mock_token.balanceOf(curr_address))
        .to.equal(initial_balance + curr_amount);
      expect(await test_ctx.investment_fund.numberOfInvestors())
        .to.equal(constants.TOTAL_TEST_INVESTORS - i);
      expect(await test_ctx.investment_fund.depositOfInvestor(curr_address))
        .to.equal(0);
      expect(await test_ctx.investment_fund.totalDepositedFunds())
        .to.equal(total_amount);

      const investors: string[] = await test_ctx.investment_fund.allInvestors();
      expect(investors.length)
        .to.equal(constants.TOTAL_TEST_INVESTORS - i);
      expect(investors.indexOf(curr_address))
        .to.equal(-1);
    }
  });

  it("should allow fund manager to return funds to investors singularly", async () => {
    let total_amount: number = (await test_ctx.investment_fund.totalDepositedFunds()).toNumber();
    const inv_multiplier: number = (await test_ctx.investment_fund.investmentMultiplier()).toNumber();

    for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      const curr_signer: Signer = test_ctx.accounts.signers[i];
      const curr_address: string = await curr_signer.getAddress();
      const curr_amount: number = Math.floor((constants.DUMMY_AMOUNT * i * inv_multiplier) / constants.MULTIPLIER_DECIMALS);
      const initial_balance: number = (await test_ctx.mock_token.balanceOf(curr_address)).toNumber();
      
      total_amount -= curr_amount;

      // Withdraw to investor
      await expect(await test_ctx.investment_fund.fundManagerReturnFundsToInvestor(curr_address))
        .to.emit(test_ctx.investment_fund, "FundManagerFundsReturnedToInvestor")
        .withArgs(curr_address, curr_amount);
      // Check state
      expect(await test_ctx.mock_token.balanceOf(curr_address))
        .to.equal(initial_balance + curr_amount);
      expect(await test_ctx.investment_fund.numberOfInvestors())
        .to.equal(constants.TOTAL_TEST_INVESTORS - i);
      expect(await test_ctx.investment_fund.depositOfInvestor(curr_address))
        .to.equal(0);
      expect(await test_ctx.investment_fund.totalDepositedFunds())
        .to.equal(total_amount);

      const investors: string[] = await test_ctx.investment_fund.allInvestors();
      expect(investors.length)
        .to.equal(constants.TOTAL_TEST_INVESTORS - i);
      expect(investors.indexOf(curr_address))
        .to.equal(-1);
    }
  });

  it("should allow fund manager to return funds to all investors", async () => {
    // Store initial balances
    const initial_balances: number[] = [];
    for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      const curr_address: string = await test_ctx.accounts.signers[i].getAddress();
      initial_balances.push((await test_ctx.mock_token.balanceOf(curr_address)).toNumber());
    }

    // Withdraw to all investor
    await expect(await test_ctx.investment_fund.fundManagerReturnFundsToAllInvestors())
      .to.emit(test_ctx.investment_fund, "FundManagerFundsReturnedToAllInvestors");
    // Check state
    expect(await test_ctx.investment_fund.numberOfInvestors())
      .to.equal(0,);
    expect((await test_ctx.investment_fund.allInvestors()).length)
      .to.equal(0);

    // Verify all balances
    const inv_multiplier: number = (await test_ctx.investment_fund.investmentMultiplier()).toNumber();
    for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      const curr_address: string = await test_ctx.accounts.signers[i].getAddress();
      const curr_amount = Math.floor((constants.DUMMY_AMOUNT * i * inv_multiplier) / constants.MULTIPLIER_DECIMALS);
      expect(await test_ctx.mock_token.balanceOf(curr_address))
        .to.equal(initial_balances[i - 1] + curr_amount);
    }
  });

  it("should go to INITIAL state when stopInvestorsWithdraw is called", async () => {
    const fund_manager_address: string = await test_ctx.accounts.fund_manager.getAddress();
    const initial_balance: number = (await test_ctx.mock_token.balanceOf(fund_manager_address)).toNumber();
    const total_amount: number = (await test_ctx.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    await expect(await test_ctx.investment_fund.stopInvestorsWithdraw())
      .to.emit(test_ctx.investment_fund, "InvestorsWithdrawStopped");

    // Check state (the remaining funds are transferred to the fund manager)
    expect(await test_ctx.investment_fund.currState())
      .to.equal(constants.InvestmentStates.INITIAL);
    expect(await test_ctx.investment_fund.totalDepositedFunds())
      .to.equal(0);
    expect(await test_ctx.mock_token.balanceOf(fund_manager_address))
      .to.equal(initial_balance + total_amount);
  });

  it("should revert if fund manager deposit and withdraw are called with invalid parameters", async () => {
    const target_address: string = await test_ctx.accounts.signers[0].getAddress();

    // Withdraw all to reset funds
    await test_ctx.investment_fund.fundManagerReturnFundsToAllInvestors();

    await expect(test_ctx.investment_fund.fundManagerReturnFundsToInvestor(target_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(0);
    await expect(test_ctx.investment_fund.investorWithdrawAll())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(0);
  });

  it("should revert if not allowed functions are called", async () => {
    const dummy_address: string = await test_ctx.accounts.signers[0].getAddress();
  
    await expect(test_ctx.investment_fund.setPendingFundManager(dummy_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");;
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
    await expect(test_ctx.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.fundManagerWithdraw(constants.DUMMY_AMOUNT))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.startInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.stopInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.startInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
  });
});
