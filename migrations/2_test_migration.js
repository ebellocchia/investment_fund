// Migration for tests using a mock token
const Token = artifacts.require('MockToken');
const InvestmentFund = artifacts.require('InvestmentFund');

module.exports = function (deployer) {
  deployer.deploy(Token, 'MockToken', 'MT', 1000000).then(function() {
      return deployer.deploy(InvestmentFund, Token.address);
  })
};
