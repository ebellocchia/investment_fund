//
// Requires
//
const truffleAssert = require('truffle-assertions');
const utils = require('./Utils.js');

//
// Tests
//

//
// Tests for changing the fund manager
//
contract('InvestmentFund.ChangeFundManager', (accounts) => {
  // Initial steps
  beforeEach(async () => {
    await utils.initContracts(this, accounts);
  });

  // Test fund manager change
  it('should change the fund manager is changed with valid parameters', async () => {
    // Request fund manager change
    let tx = await this.investment_fund.setPendingFundManager(accounts[1]);

    // Check
    truffleAssert.eventEmitted(tx, 'FundManagerPendingSet', (ev) => { return ev.pendingAddress == accounts[1] });
    assert.equal(await this.investment_fund.pendingFundManager(), accounts[1], 'Invalid pendingFundManager after setPendingFundManager is called');

    // Accept fund manager
    tx = await this.investment_fund.acceptFundManager({ from: accounts[1] });

    // Check
    truffleAssert.eventEmitted(tx, 'FundManagerChanged', (ev) => { return ev.oldAddress == this.fund_manager && ev.newAddress == accounts[1]; });
    assert.equal(await this.investment_fund.fundManager(), accounts[1], 'Invalid fundManager after acceptFundManager is called');
    assert.equal(await this.investment_fund.remainingFundsAddr(), accounts[1], 'Invalid remainingFundsAddr after acceptFundManager is called');
    assert.equal(await this.investment_fund.pendingFundManager(), 0, 'Invalid pendingFundManager after acceptFundManager is called');
  });


  // Test fund manager change
  it('should revert if fund manager is changed with invalid parameters', async () => {
    // Set the same fund manager
    await truffleAssert.reverts(this.investment_fund.setPendingFundManager(this.fund_manager), 'InvestmentFund: fund manager shall be different from the current one');

    // Accept from the wrong account
    await this.investment_fund.setPendingFundManager(accounts[1]);
    await truffleAssert.reverts(this.investment_fund.acceptFundManager({ from: accounts[2] }), 'InvestmentFund: address shall be the pending fund manager');
  });
});
