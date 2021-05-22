//
// Requires
//
const constants = require('./Constants.js');
const MockToken = artifacts.require('MockToken');
const InvestmentFund = artifacts.require('InvestmentFund');

//
// Utility functions for testing
//

// Initialize smart contracts
async function initContracts(obj, accounts) {
  // The first account will be the fund manager
  obj.fund_manager = accounts[0];
  // Create mock token
  obj.mock_token = await MockToken.new('MockToken', 'MT', constants.TOKEN_SUPPLY, { from: obj.fund_manager });
  // Create investment fund
  obj.investment_fund = await InvestmentFund.new(obj.mock_token.address);
}

// Initialize investors
async function initInvestors(obj, accounts) {
  // Approve token spending for fund manager
  await obj.mock_token.approve(obj.investment_fund.address, constants.TOKEN_SUPPLY, { from: obj.fund_manager });

  // Approve mock token spending to all users and transfer them some tokens
  for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
    let amount = 1000 * i;

    await obj.mock_token.approve(obj.investment_fund.address, constants.TOKEN_SUPPLY, { from: accounts[i] });
    await obj.mock_token.transfer(accounts[i], amount);
  }
}

// Initialize investors deposit
async function initInvestorsDeposit(obj, accounts) {
  // Simulate a deposit from all users
  for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
    let amount = 500 * i;
    await obj.investment_fund.investorDeposit(amount, { from: accounts[i] });
  }
}

// Initialize investment parameters
async function initInvestmentParams(obj) {
  // setDepositMultipleOf
  await obj.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF);
  // setMinInvestorDeposit
  await obj.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT);
  // setMaxInvestorDeposit
  await obj.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT);
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
  await obj.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT);
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
// Exports
//
module.exports = {
    initContracts: initContracts,
    initInvestors: initInvestors,
    initInvestorsDeposit: initInvestorsDeposit,
    initInvestmentParams: initInvestmentParams,
    initBeforeInvestmentState: initBeforeInvestmentState,
    initDuringInvestmentState: initDuringInvestmentState,
    initAfterInvestmentState: initAfterInvestmentState,
    logInvestors: logInvestors,
};
