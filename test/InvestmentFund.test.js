// Truffle assertion
const truffleAssert = require('truffle-assertions');

// Smart contracts
const MockToken = artifacts.require('MockToken');
const InvestmentFund = artifacts.require('InvestmentFund');

// Total investors for testing
const TOTAL_TEST_INVESTORS = 5;
// Contract states
const STATE_INITIAL = 0;
const STATE_BEFORE_INVESTMENT = 1;
const STATE_DURING_INVESTMENT = 2;
const STATE_AFTER_INVESTMENT = 3;
// Unlimited amount
const UNLIMITED_AMOUNT = 2**256 - 1;
// Multiplier decimals
const MULTIPLIER_DECIMALS = 1e12;
// Minimum multiplier
const MIN_MULTIPLIER = 1e12;
// Some constants to be used in tests
const TOKEN_SUPPLY = 1000000;
const NEW_MIN_AMOUNT = 100;
const NEW_MAX_AMOUNT = 100000;
const NEW_MULTIPLE_OF = 10;
const DUMMY_AMOUNT = 5000;

//
// Functions
//

// Initialize smart contracts
async function initContracts(obj, accounts) {
  // The first account will be the fund manager
  obj.fund_manager = accounts[0];
  // Create mock token
  obj.mock_token = await MockToken.new('MockToken', 'MT', TOKEN_SUPPLY, { from: obj.fund_manager });
  // Create investment fund
  obj.investment_fund = await InvestmentFund.new(obj.mock_token.address);
}

// Initialize investors
async function initInvestors(obj, accounts) {
  // Approve token spending for fund manager
  await obj.mock_token.approve(obj.investment_fund.address, TOKEN_SUPPLY, { from: obj.fund_manager });

  // Approve mock token spending to all users and transfer them some tokens
  for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
    let amount = 1000 * i;

    await obj.mock_token.approve(obj.investment_fund.address, TOKEN_SUPPLY, { from: accounts[i] });
    await obj.mock_token.transfer(accounts[i], amount);
  }
}

// Initialize investors deposit
async function initInvestorsDeposit(obj, accounts) {
  // Simulate a deposit from all users
  for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
    let amount = 500 * i;
    await obj.investment_fund.investorDeposit(amount, { from: accounts[i] });
  }
}

// Initialize investment parameters
async function initInvestmentParams(obj) {
  // setDepositMultipleOf
  await obj.investment_fund.setDepositMultipleOf(NEW_MULTIPLE_OF);
  // setMinInvestorDeposit
  await obj.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT);
  // setMaxInvestorDeposit
  await obj.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT);
}

// Initialize before investment state
async function initBeforeInvestmentState(obj, accounts) {
  await initContracts(obj, accounts);
  await initInvestors(obj, accounts);
  await initInvestmentParams(obj, accounts);
  await obj.investment_fund.startInvestorsDeposit();
}

// Initialize during investment state
async function initDuringInvestmentState(obj, accounts) {
  await initBeforeInvestmentState(obj, accounts);
  await initInvestorsDeposit(obj, accounts);
  await obj.investment_fund.stopInvestorsDeposit();
}

// Initialize after investment state
async function initAfterInvestmentState(obj, accounts) {
  await initDuringInvestmentState(obj, accounts);
  await obj.investment_fund.fundManagerDeposit(DUMMY_AMOUNT);
  await obj.investment_fund.startInvestorsWithdraw();
}

// Get investor address
async function getInvestorAddress(obj, index) {
  return (await obj.investment_fund.investors(index));
}

// Get investor deposit
async function getInvestorDeposit(obj, inv_addr) {
  let inv_dep = await obj.investment_fund.investorDeposits(inv_addr);
  return { amount: inv_dep[0], index: inv_dep[1] };
}

// Log investors to console
async function logInvestors(obj) {
  let inv_num = (await obj.investment_fund.numberOfInvestors()).toNumber();
  console.log('Total number of investors: ' + inv_num);

  for (i = 0; i < inv_num; i++) {
    let inv_addr = await getInvestorAddress(obj, i);
    let dep = await getInvestorDeposit(obj, inv_addr);

    console.log('  ' + i + '. Investor address: ' + inv_addr);
    console.log('  ' + i + '. Investor amount: ' + dep.amount);
    console.log('  ' + i + '. Investor index: ' + dep.index);
  }
}

//
// Tests
//

//
// Tests for changing the fund manager
//
contract('InvestmentFund.ChangeFundManager', (accounts) => {
  // Initial steps
  beforeEach(async () => {
    await initContracts(this, accounts);
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


//
// Tests for STATE_INITIAL state
//
contract('InvestmentFund.STATE_INITIAL', (accounts) => {
  // Initial steps
  beforeEach(async () => {
    await initContracts(this, accounts);
  });

  // Test construction
  it('should construct contract correctly', async () => {
    // Test initial variable values
    assert.equal(await this.investment_fund.fundToken(), this.mock_token.address, 'Invalid fundToken after construction');
    assert.equal(await this.investment_fund.fundManager(), this.fund_manager, 'Invalid fundManager after construction');
    assert.equal(await this.investment_fund.pendingFundManager(), 0, 'Invalid pendingFundManager after construction');
    assert.equal(await this.investment_fund.remainingFundsAddr(), this.fund_manager, 'Invalid remainingFundsAddr after construction');
    assert.equal(await this.investment_fund.depositMultipleOf(), 1, 'Invalid depositMultipleOf after construction');
    assert.equal(await this.investment_fund.minInvestorDeposit(), 1, 'Invalid minInvestorDeposit after construction');
    assert.equal(await this.investment_fund.maxInvestorDeposit(), UNLIMITED_AMOUNT, 'Invalid maxInvestorDeposit after construction');
    assert.equal(await this.investment_fund.currState(), STATE_INITIAL, 'Invalid currState after construction');
    assert.equal(await this.investment_fund.totalAmountBeforeInvestment(), 0, 'Invalid totalAmountBeforeInvestment after construction');
    assert.equal(await this.investment_fund.totalAmountAfterInvestment(), 0, 'Invalid ttotalAmountAfterInvestment after construction');
    assert.equal(await this.investment_fund.investmentMultiplier(), MIN_MULTIPLIER, 'Invalid investmentMultiplier after construction');
    assert.equal(await this.investment_fund.numberOfInvestors(), 0, 'Invalid numberOfInvestors after construction');
    assert.equal(await this.investment_fund.totalDepositedFunds(), 0, 'Invalid totalDepositedFunds after construction');
  });

  // Call set functions with valid parameters
  it('should allow to call set functions with valid parameters', async () => {
    // setRemainingFundsAddress
    let tx = await this.investment_fund.setRemainingFundsAddress(accounts[1]);
    truffleAssert.eventEmitted(tx, 'RemainingFundsAddressChanged', (ev) => { return ev.oldAddress == this.fund_manager && ev.newAddress == accounts[1]; });
    assert.equal(await this.investment_fund.remainingFundsAddr(), accounts[1], 'setRemainingFundsAddress failed');

    // setFundToken
    let mock_token2 = await MockToken.new('MockToken2', 'MT2', '1000000', { from: this.fund_manager });
    tx = await this.investment_fund.setFundToken(mock_token2.address);
    truffleAssert.eventEmitted(tx, 'FundTokenChanged', (ev) => { return ev.oldToken == this.mock_token.address && ev.newToken == mock_token2.address; });
    assert.equal(await this.investment_fund.fundToken(), mock_token2.address, 'setFundToken failed');

    // setDepositMultipleOf
    tx = await this.investment_fund.setDepositMultipleOf(NEW_MULTIPLE_OF);
    truffleAssert.eventEmitted(tx, 'DepositMultipleOfChanged', (ev) => { return ev.oldValue == 1 && ev.newValue == NEW_MULTIPLE_OF; });
    assert.equal(await this.investment_fund.depositMultipleOf(), NEW_MULTIPLE_OF, 'setDepositMultipleOf failed');

    // setMinInvestorDeposit
    tx = await this.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT);
    truffleAssert.eventEmitted(tx, 'MinInvestorDepositChanged', (ev) => { return ev.oldAmount == 1 && ev.newAmount == NEW_MIN_AMOUNT; });
    assert.equal(await this.investment_fund.minInvestorDeposit(), NEW_MIN_AMOUNT, 'setMinInvestorDeposit failed');

    // setMaxInvestorDeposit
    tx = await this.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT);
    truffleAssert.eventEmitted(tx, 'MaxInvestorDepositChanged', (ev) => { return ev.oldAmount == UNLIMITED_AMOUNT && ev.newAmount == NEW_MAX_AMOUNT; });
    assert.equal(await this.investment_fund.maxInvestorDeposit(), NEW_MAX_AMOUNT, 'setMaxInvestorDeposit failed');
  });

  // Call startInvestorsDeposit
  it('should go to STATE_BEFORE_INVESTMENT state when startInvestorsDeposit is called', async () => {
    let tx = await this.investment_fund.startInvestorsDeposit();
    truffleAssert.eventEmitted(tx, 'InvestorsDepositStarted');
    assert.equal(await this.investment_fund.currState(), STATE_BEFORE_INVESTMENT, 'Invalid currState after startInvestorsDeposit is called');

    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit({ from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call set functions with invalid parameters
  it('should revert if set functions are called with invalid parameters', async () => {
    // Set parameters
    await this.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT);
    await this.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT);
    await this.investment_fund.setDepositMultipleOf(NEW_MULTIPLE_OF);

    // Check reverts
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(0), 'InvestmentFund: value shall not be zero');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(0), 'InvestmentFund: minimum amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(NEW_MAX_AMOUNT + 1), 'InvestmentFund: minimum amount shall be lower than the maximum one');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT + (NEW_MULTIPLE_OF / 2)), 'InvestmentFund: amount shall be multiple of depositMultipleOf');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(0), 'InvestmentFund: maximum amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(NEW_MIN_AMOUNT - 1), 'InvestmentFund: maximum amount shall be higher than the minimum one');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT - (NEW_MULTIPLE_OF / 2)), 'InvestmentFund: amount shall be multiple of depositMultipleOf');
  });

  // Call set functions with invalid account
  it('should revert if set functions are not called by the fund manager', async () => {
    await truffleAssert.reverts(this.investment_fund.setRemainingFundsAddress(accounts[1], { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setFundToken(this.mock_token.address, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(1, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(1, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(1, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call not allowed functions
  it('should revert if not allowed functions are called', async () => {
    await truffleAssert.reverts(this.investment_fund.investorDeposit(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToAllInvestors(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});


//
// Tests for STATE_BEFORE_INVESTMENT state
//
contract('InvestmentFund.STATE_BEFORE_INVESTMENT', (accounts) => {
  // Initial steps
  beforeEach(async () => {
   await initBeforeInvestmentState(this, accounts);
  });

  // Call investor deposit/withdraw with valid parameters
  it('should allow investors deposit and withdraw with valid parameters', async () => {
    let total_amount = 0;

    // Simulate a deposit from all users
    for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
      // Simulate more than one deposit per user
      for (j = 0; j < 2; j++) {
        let curr_amount = 250 * i;
        let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
        total_amount += curr_amount;

        // Deposit from account
        let tx = await this.investment_fund.investorDeposit(curr_amount, { from: accounts[i] });
        // Check event
        truffleAssert.eventEmitted(tx, 'InvestorFundsDeposited', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
        // Check contract state
        assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance - curr_amount, 'Invalid investor balanceOf after investor deposit #' + i);
        assert.equal(await this.investment_fund.numberOfInvestors(), i, 'Invalid numberOfInvestors after investor deposit #' + i);
        assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after investor deposit #' + i);
      }
    }

    // Simulate a withdraw to all users
    for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = 500 * i;
      let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
      total_amount -= curr_amount;

      // Withdraw to account
      let tx = await this.investment_fund.investorWithdrawAll({ from: accounts[i] });

      // Check event
      truffleAssert.eventEmitted(tx, 'InvestorAllFundsWithdrawn', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
      // Check contract state
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance + curr_amount, 'Invalid investor balanceOf after investor withdraw #' + i);
      assert.equal(await this.investment_fund.numberOfInvestors(), TOTAL_TEST_INVESTORS - i, 'Invalid numberOfInvestors after investor withdraw #' + i);
      assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after investor withdraw #' + i);
    }
  });

  // Call stopInvestorsDeposit
  it('should go to STATE_DURING_INVESTMENT state when stopInvestorsDeposit is called', async () => {
    // Simulate some deposits
    await initInvestorsDeposit(this, accounts);
    let total_deposit = (await this.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    let tx = await this.investment_fund.stopInvestorsDeposit();

    // Check event
    truffleAssert.eventEmitted(tx, 'InvestorsDepositStopped');
    // Check contract state
    assert.equal(await this.investment_fund.currState(), STATE_DURING_INVESTMENT, 'Invalid currState after stopInvestorsDeposit is called');
    assert.equal(await this.investment_fund.totalAmountBeforeInvestment(), total_deposit, 'Invalid totalAmountBeforeInvestment after stopInvestorsDeposit is called');
    assert.equal(await this.investment_fund.totalAmountAfterInvestment(), 0, 'Invalid totalAmountAfterInvestment after stopInvestorsDeposit is called');
    // Check invalid caller
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit({ from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call investor deposit/withdraw with invalid parameters
  it('should revert if investors deposit and withdraw are called with invalid parameters', async () => {
    let multiple_deposit_of = (await this.investment_fund.depositMultipleOf()).toNumber();
    let min_investment = (await this.investment_fund.minInvestorDeposit()).toNumber();
    let max_investment = (await this.investment_fund.maxInvestorDeposit()).toNumber();

    await truffleAssert.reverts(this.investment_fund.investorDeposit(0), 'InvestmentFund: amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(min_investment - 1), 'InvestmentFund: amount shall be higher than minimum deposit');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(max_investment + 1), 'InvestmentFund: amount shall be lower than maximum deposit');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(min_investment + multiple_deposit_of / 2), 'InvestmentFund: amount shall be multiple of depositMultipleOf');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll({ from: accounts[1] }), 'InvestmentFund: no funds to withdraw');
  });

  // Call not allowed functions
  it('should revert if not allowed functions are called', async () => {
    await truffleAssert.reverts(this.investment_fund.setPendingFundManager(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.acceptFundManager(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setRemainingFundsAddress(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setFundToken(this.mock_token.address), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(NEW_MULTIPLE_OF), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToAllInvestors(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});


//
// Tests for STATE_DURING_INVESTMENT state
//
contract('InvestmentFund.STATE_DURING_INVESTMENT', (accounts) => {
  // Initial steps
  beforeEach(async () => {
   await initDuringInvestmentState(this, accounts);
  });

  // Call fund manager deposit/withdraw with valid parameters
  it('should allow fund manager deposit and withdraw with valid parameters', async () => {
    let total_deposit = (await this.investment_fund.totalDepositedFunds()).toNumber();
    let initial_owner_bal = (await this.mock_token.balanceOf(this.fund_manager)).toNumber();

    let withdraw_amount = total_deposit / 2;
    let deposit_amount = total_deposit / 3;

    // Test withdraw
    let tx = await this.investment_fund.fundManagerWithdraw(withdraw_amount);
    truffleAssert.eventEmitted(tx, 'FundManagerFundsWithdrawn', (ev) => { return ev.owner == this.fund_manager && ev.amount == withdraw_amount; });
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_owner_bal + withdraw_amount, 'Invalid fund manager balanceOf after withdraw');
    assert.equal(await this.investment_fund.totalDepositedFunds(), total_deposit - withdraw_amount, 'Invalid totalDepositedFunds after fundManagerWithdraw is called');
    // Test deposit
    tx = await this.investment_fund.fundManagerDeposit(deposit_amount);
    truffleAssert.eventEmitted(tx, 'FundManagerFundsDeposited', (ev) => { return ev.owner == this.fund_manager && ev.amount == deposit_amount; });
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_owner_bal + withdraw_amount - deposit_amount, 'Invalid fund manager balanceOf after deposit');
    assert.equal(await this.investment_fund.totalDepositedFunds(), withdraw_amount + deposit_amount, 'Invalid totalDepositedFunds after fundManagerDeposit is called');
    // Test withdraw all
    tx = await this.investment_fund.fundManagerWithdrawAll();
    truffleAssert.eventEmitted(tx, 'FundManagerFundsWithdrawn', (ev) => { return ev.owner == this.fund_manager && ev.amount == total_deposit - withdraw_amount + deposit_amount; });
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_owner_bal + total_deposit, 'Invalid fund manager balanceOf after withdraw all');
    assert.equal(await this.investment_fund.totalDepositedFunds(), 0, 'Invalid totalDepositedFunds after fundManagerWithdrawAll is called');
  });

  // Call startInvestorsWithdraw
  it('should go to STATE_AFTER_INVESTMENT state when startInvestorsWithdraw is called', async () => {
    // Simulate some deposits
    await this.investment_fund.fundManagerDeposit(DUMMY_AMOUNT);
    let amount_before_inv = (await this.investment_fund.totalAmountBeforeInvestment()).toNumber();
    let total_deposit = (await this.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    let tx = await this.investment_fund.startInvestorsWithdraw();

    // Check event
    truffleAssert.eventEmitted(tx, 'InvestorsWithdrawStarted');
    // Compute new values
    let amount_after_inv = (await this.investment_fund.totalAmountAfterInvestment()).toNumber();
    let inv_multiplier = Math.floor((amount_after_inv * MULTIPLIER_DECIMALS) / amount_before_inv);

    // Check contract state
    assert.equal(await this.investment_fund.currState(), STATE_AFTER_INVESTMENT, 'Invalid currState after startInvestorsWithdraw is called');
    assert.equal(await this.investment_fund.totalAmountAfterInvestment(), amount_after_inv, 'Invalid totalAmountAfterInvestment after startInvestorsWithdraw is called');
    assert.equal(await this.investment_fund.investmentMultiplier(), inv_multiplier, 'Invalid investmentMultiplier after startInvestorsWithdraw is called');
    // Check invalid caller
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw({ from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call fund manager deposit/withdraw with invalid parameters
  it('should revert if fund manager deposit and withdraw are called with invalid parameters', async () => {
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(0), 'InvestmentFund: amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(0), 'InvestmentFund: amount shall not be zero');
  });

  // Call not allowed functions
  it('should revert if not allowed functions are called', async () => {
    await truffleAssert.reverts(this.investment_fund.setPendingFundManager(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.acceptFundManager(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setRemainingFundsAddress(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setFundToken(this.mock_token.address), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(NEW_MULTIPLE_OF), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToAllInvestors(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});


//
// Tests for STATE_AFTER_INVESTMENT state
//
contract('InvestmentFund.STATE_AFTER_INVESTMENT', (accounts) => {
  // Initial steps
  beforeEach(async () => {
   await initAfterInvestmentState(this, accounts);
  });

  // Call investor withdraw with valid parameters
  it('should allow investors to withdraw their funds', async () => {
    let total_amount = (await this.investment_fund.totalDepositedFunds()).toNumber();
    let inv_multiplier = (await this.investment_fund.investmentMultiplier()).toNumber();

    for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = Math.floor((500 * i * inv_multiplier) / MULTIPLIER_DECIMALS);
      let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
      total_amount -= curr_amount;

      // Withdraw to account
      let tx = await this.investment_fund.investorWithdrawAll({ from: accounts[i] });

      // Check event
      truffleAssert.eventEmitted(tx, 'InvestorAllFundsWithdrawn', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
      // Check contract state
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance + curr_amount, 'Invalid investor balanceOf after investor withdraw #' + i);
      assert.equal(await this.investment_fund.numberOfInvestors(), TOTAL_TEST_INVESTORS - i, 'Invalid numberOfInvestors after investor withdraw #' + i);
      assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after investor withdraw #' + i);
    }
  });

  // Call fund manager withdraw (to single investor) with valid parameters
  it('should allow fund manager to return funds to investors singularly', async () => {
    let total_amount = (await this.investment_fund.totalDepositedFunds()).toNumber();
    let inv_multiplier = (await this.investment_fund.investmentMultiplier()).toNumber();

    for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = Math.floor((500 * i * inv_multiplier) / MULTIPLIER_DECIMALS);
      let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
      total_amount -= curr_amount;

      // Withdraw to investor
      let tx = await this.investment_fund.fundManagerReturnFundsToInvestor(accounts[i]);

      // Check event
      truffleAssert.eventEmitted(tx, 'FundManagerFundsReturnedToInvestor', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
      // Check contract state
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance + curr_amount, 'Invalid investor balanceOf after fund manager withdraw to investor #' + i);
      assert.equal(await this.investment_fund.numberOfInvestors(), TOTAL_TEST_INVESTORS - i, 'Invalid numberOfInvestors after fund manager withdraw to investor #' + i);
      assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after fund manager withdraw to investor #' + i);
    }
  });

  // Call fund manager withdraw (to all investors) with valid parameters
  it('should allow fund manager to return funds to all investors', async () => {
    // Store initial balances
    initial_balances = [];
    for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
      initial_balances.push((await this.mock_token.balanceOf(accounts[i])).toNumber());
    }

    // Withdraw to all investor
    let tx = await this.investment_fund.fundManagerReturnFundsToAllInvestors();
    // Check event
    truffleAssert.eventEmitted(tx, 'FundManagerFundsReturnedToAllInvestors');
    // Check contract state
    assert.equal(await this.investment_fund.numberOfInvestors(), 0, 'Invalid numberOfInvestors after fund manager withdraw to all');

    // Verify all balances
    let inv_multiplier = (await this.investment_fund.investmentMultiplier()).toNumber();

    for (i = 1; i < (TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = Math.floor((500 * i * inv_multiplier) / MULTIPLIER_DECIMALS);
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balances[i - 1] + curr_amount, 'Invalid investor balanceOf after fund manager withdraw to all #' + i);
    }
  });

  // Call stopInvestorsWithdraw
  it('should go to STATE_INITIAL state when stopInvestorsWithdraw is called', async () => {
    let initial_balance = (await this.mock_token.balanceOf(this.fund_manager)).toNumber();
    let total_amount = (await this.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    let tx = await this.investment_fund.stopInvestorsWithdraw();
    // Check event
    truffleAssert.eventEmitted(tx, 'InvestorsWithdrawStopped');

    // Check contract state (the remaining funds are transferred to the fund manager)
    assert.equal(await this.investment_fund.currState(), STATE_INITIAL, 'Invalid currState after stopInvestorsWithdraw is called');
    assert.equal(await this.investment_fund.totalDepositedFunds(), 0, 'Invalid totalDepositedFunds after stopInvestorsWithdraw is called');
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_balance + total_amount, 'Invalid fund manager balanceOf after stopInvestorsWithdraw is called');
  });

  // Call fund manager deposit/withdraw with invalid parameters
  it('should revert if fund manager deposit and withdraw are called with invalid parameters', async () => {
    // Withdraw all to reset funds
    await this.investment_fund.fundManagerReturnFundsToAllInvestors();

    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: no funds to withdraw');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll(), 'InvestmentFund: no funds to withdraw');
  });

  // Call not allowed functions
  it('should revert if not allowed functions are called', async () => {
    await truffleAssert.reverts(this.investment_fund.setPendingFundManager(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.acceptFundManager(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setRemainingFundsAddress(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setFundToken(this.mock_token.address), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(NEW_MULTIPLE_OF), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(NEW_MIN_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(NEW_MAX_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});
