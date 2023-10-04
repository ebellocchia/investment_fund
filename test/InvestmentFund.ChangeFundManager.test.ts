import { expect } from "chai";
import { Signer } from "ethers";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";

//
// Tests for changing the fund manager
//
describe("InvestmentFund.ChangeFundManager", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initConstructedTestContext();
  });

  it("should change the fund manager is changed with valid parameters", async () => {
    const fund_manager_address: string = await test_ctx.accounts.fund_manager.getAddress();
    const other_account: Signer = test_ctx.accounts.signers[0];
    const other_address: string = await other_account.getAddress();
  
    // Request fund manager change
    await expect(await test_ctx.investment_fund.setPendingFundManager(other_address))
      .to.emit(test_ctx.investment_fund, "FundManagerPendingSet")
      .withArgs(other_address);
    // Check
    expect(await test_ctx.investment_fund.pendingFundManager())
      .to.equal(other_address);

    // Accept fund manager
    await expect(await test_ctx.investment_fund.connect(other_account).acceptFundManager())
      .to.emit(test_ctx.investment_fund, "FundManagerChanged")
      .withArgs(fund_manager_address, other_address);
    // Check
    expect(await test_ctx.investment_fund.fundManager())
      .to.equal(other_address);
    expect(await test_ctx.investment_fund.remainingFundsAddr())
      .to.equal(other_address);
    expect(await test_ctx.investment_fund.pendingFundManager())
      .to.equal(constants.NULL_ADDRESS);
  });

  it("should revert if fund manager is changed with invalid parameters", async () => {
    const fund_manager_address: string = await test_ctx.accounts.fund_manager.getAddress();
    const other_address: string = await test_ctx.accounts.signers[0].getAddress();

    // Set the same fund manager
    await expect(test_ctx.investment_fund.setPendingFundManager(fund_manager_address))
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerChangeError");
    // Accept from the wrong account
    await test_ctx.investment_fund.setPendingFundManager(other_address);
    await expect(test_ctx.investment_fund.connect(test_ctx.accounts.signers[2]).acceptFundManager())
      .to.be.revertedWithCustomError(test_ctx.investment_fund, "FundManagerChangeError");
  });
});
