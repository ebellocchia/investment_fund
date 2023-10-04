import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";

//
// Tests for BEFORE_INVESTMENT state
//
describe("InvestmentFund.BEFORE_INVESTMENT", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initBeforeInvestmentTestContext();
  });

  it("should allow investors deposit and withdraw with valid parameters", async () => {
    let total_amount: number = 0;

    // Simulate a deposit from all users
    for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      // Simulate more than one deposit per user
      for (let j = 1; j < (constants.MULTIPLE_DEPOSIT_NUM + 1); j++) {
        const curr_signer: Signer = test_ctx.accounts.signers[i];
        const curr_address: string = await curr_signer.getAddress();
        const curr_amount: number = (constants.DUMMY_AMOUNT / constants.MULTIPLE_DEPOSIT_NUM) * i;
        const initial_balance: number = (await test_ctx.mock_token.balanceOf(curr_address)).toNumber();

        total_amount += curr_amount;

        // Deposit from account
        await expect(await test_ctx.investment_fund.connect(curr_signer).investorDeposit(curr_amount))
          .to.emit(test_ctx.investment_fund, "InvestorFundsDeposited")
          .withArgs(curr_address, curr_amount);
        // Check state
        expect(await test_ctx.mock_token.balanceOf(curr_address))
          .to.equal(initial_balance - curr_amount);
        expect(await test_ctx.investment_fund.depositOfInvestor(curr_address))
          .to.equal(curr_amount * j);
        expect(await test_ctx.investment_fund.totalDepositedFunds())
          .to.equal(total_amount);

        const investors: string[] = await test_ctx.investment_fund.allInvestors();
        expect(investors.length)
          .to.equal(i);
        expect(investors.indexOf(curr_address))
          .to.equal(i - 1);
      }

      expect(await test_ctx.investment_fund.numberOfInvestors())
        .to.equal(i);
    }

    // Simulate a withdraw from all users
    for (let i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      const curr_signer: Signer = test_ctx.accounts.signers[i];
      const curr_address: string = await curr_signer.getAddress();
      const curr_amount: number = constants.DUMMY_AMOUNT * i;
      const initial_balance: number = (await test_ctx.mock_token.balanceOf(curr_address)).toNumber();

      total_amount -= curr_amount;

      // Withdraw to account
      await expect(await test_ctx.investment_fund.connect(curr_signer).investorWithdrawAll())
        .to.emit(test_ctx.investment_fund, "InvestorAllFundsWithdrawn")
        .withArgs(curr_address, curr_amount);
      // Check state
      expect(await test_ctx.mock_token.balanceOf(curr_address))
        .to.equal(initial_balance + curr_amount);
      expect(await test_ctx.investment_fund.depositOfInvestor(curr_address))
        .to.equal(0);
      expect(await test_ctx.investment_fund.numberOfInvestors())
        .to.equal(constants.TOTAL_TEST_INVESTORS - i);
      expect(await test_ctx.investment_fund.totalDepositedFunds())
        .to.equal(total_amount);

      const investors: string[] = await test_ctx.investment_fund.allInvestors();
      expect(investors.length)
        .to.equal(constants.TOTAL_TEST_INVESTORS - i);
      expect(investors.indexOf(curr_address))
       .to.equal(-1);
    }
  });

  it("should go to DURING_INVESTMENT state when stopInvestorsDeposit is called", async () => {
    // Simulate some deposits
    await utils.initInvestorsDeposit(test_ctx.accounts, test_ctx.investment_fund);
    const total_deposit: BigNumber = await test_ctx.investment_fund.totalDepositedFunds();

    // Go to next state
    await expect(await test_ctx.investment_fund.stopInvestorsDeposit())
      .to.emit(test_ctx.investment_fund, "InvestorsDepositStopped");
    // Check state
    expect(await test_ctx.investment_fund.currState())
      .to.equal(constants.InvestmentStates.DURING_INVESTMENT);
    expect(await test_ctx.investment_fund.totalAmountBeforeInvestment())
      .to.equal(total_deposit);
    expect(await test_ctx.investment_fund.totalAmountAfterInvestment())
      .to.equal(0);
  });

  it("should revert if investors deposit and withdraw are called with invalid parameters", async () => {
    const investor_account: Signer = test_ctx.accounts.signers[0];
    const multiple_deposit_of: number = (await test_ctx.investment_fund.depositMultipleOf()).toNumber();
    const min_investment: number = (await test_ctx.investment_fund.minInvestorDeposit()).toNumber();
    const max_investment: number = (await test_ctx.investment_fund.maxInvestorDeposit()).toNumber();

    await expect(test_ctx.investment_fund.connect(investor_account).investorDeposit(0))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(0);
    await expect(test_ctx.investment_fund.connect(investor_account).investorDeposit(min_investment - 1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(min_investment - 1);
    await expect(test_ctx.investment_fund.connect(investor_account).investorDeposit(max_investment + 1))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(max_investment + 1);
    await expect(test_ctx.investment_fund.connect(investor_account).investorDeposit(min_investment + multiple_deposit_of / 2))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "AmountError")
      .withArgs(min_investment + multiple_deposit_of / 2);
    await expect(test_ctx.investment_fund.connect(investor_account).investorWithdrawAll())
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
    await expect(test_ctx.investment_fund.startInvestorsDeposit())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.startInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
    await expect(test_ctx.investment_fund.stopInvestorsWithdraw())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "InvestmentStateError");
  });
});
