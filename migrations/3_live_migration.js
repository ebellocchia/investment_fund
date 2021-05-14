// Migration for live usage, a real token address shall be specified
const TOKEN_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const InvestmentFund = artifacts.require('InvestmentFund');

module.exports = function (deployer) {
  deployer.deploy(InvestmentFund, TOKEN_ADDR);
};
