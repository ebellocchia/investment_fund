# Introduction

The contract implements the functionality of an investment fund. The idea is the following:

- Investors deposit the funds to be invested in the contract.
- The fund manager withdraws the funds and invests them. When he finishes investing, he deposits the funds again in the contract. The amount can be higher (resulting in a profit) or lower (resulting in a loss) than the initial one depending on how successful the investment was.
- Investors withdraw their funds from the contract, that can be higher or lower than the initial ones depending on how successful the investment was

Clearly, investors shall trust the fund manager to behave properly and not stealing the funds. The fund manager is free to keep a percentage as fee before depositing funds back, at his choice.\
Funds are deposited/withdrawn using a configurable token (e.g. USDC, ETH, ...).

# Setup

Install `yarn` if not installed:

    npm install -g yarn

## Install package

Simply run:

    npm i --include=dev

## Compile

- To compile the contract:

        yarn compile

- To compile by starting from a clean build:

        yarn recompile

## Run tests

- To run tests without coverage:

        yarn test

- To run tests with coverage:

        yarn coverage

## Deploy

- Deploy in test mode (a `MockToken` will be automatically deployed with the specified supply and used as fund token):

        yarn deploy-test <NETWORK> --token-supply <MOCK_TOKEN_SUPPLY>

- Deploy in live mode (the token address shall be specified as parameter):

        yarn deploy-live <NETWORK> --token-address <TOKEN_ADDRESS>

## Configuration

Hardhat is configured with the following networks:

|Network name|Description|
|---|---|
|`hardhat`|Hardhat built-in network|
|`locahost`|Localhost network (address: `127.0.0.1:8545`, it can be run with the following command: `yarn run-node`)|
|`bscTestnet`|Zero address|
|`bsc`|BSC mainnet|
|`ethereumSepolia`|ETH testnet (Sepolia)|
|`ethereum`|ETH mainnet|
|`polygonMumbai`|Polygon testnet (Mumbai)|
|`polygon`|Polygon mainnet|

The API keys, RPC nodes and mnemonic shall be configured in the `.env` file.\
You may need to modify the gas limit and price in the Hardhat configuration file for some networks (e.g. Polygon), to successfully execute the transactions (you'll get a gas error).

# Description

## Construction

At construction, the address of the token used for depositing/withdrawing shall be specified as parameter. The token can also be changed later using the *setFundToken* function.\
Beside this, the contract is initialized as follows:

|Field|Value|
|---|---|
|Fund token|Address passed as parameter|
|Fund manager address|Address of the contract creator|
|Pending fund manager address|Zero address|
|Remaining funds address|Address of the contract creator|
|Deposit multiplicity|1|
|Minimum investor deposit|1|
|Maximum investor deposit|Infinite (i.e. -1)|

## View functions

- `numberOfInvestors()`: get the total number of investors
- `allInvestors()`: get an array with all investors addresses
- `depositOfInvestor(address investor)`: get the deposit of the specified investor address
- `totalDepositedFunds()`: get the total deposited funds

## Contract states

The process to invest funds is made of different steps, so the contract implements a state machine to control this.\
The states are described in the next paragraphs.

### STATE_INITIAL

This state is the first one and it's used to configure the investment parameters. Only the fund manager can operate in this state.\
The functions that can be called are:

|Function|Access|Description|
|---|---|---|
|`setPendingFundManager(address newFundManager)`|Fund manager|Set a new fund manager address. The new fund manager will be in a pending state, waiting for him to accept the role.|
|`acceptFundManager()`|All|Called by the pending fund manager to accept the role. This will also update the remaining fund address to the new fund manager address.|
|`setRemainingFundsAddress(address remainingFundsAddr_)`|Fund manager|Set the address where any remaining funds (after investors withdraw) are sent. The default value is the fund manager address.|
|`setFundToken(address fundToken_)`|Fund manager|Set the address of the token used for depositing/withdrawing funds|
|`setDepositMultipleOf(uint256 value)`|Fund manager|Set the multiplicity of the investors deposits. For example: if the multiplicity is set to 1000, investors can only deposit amounts multiple of 1000 (i.e. 15000 is a valid deposit, 21300 is not a valid deposit).|
|`setMinInvestorDeposit(uint256 amount)`|Fund manager|Set the minimum amount that investors can invest|
|`setMaxInvestorDeposit(uint256 amount)`|Fund manager|Set the maximum amount that investors can invest|
|`startInvestorsDeposit()`|Fund manager|Go to the next state, allowing investors to deposit funds|

### STATE_BEFORE_INVESTMENT

This state is used by investors to deposit funds.\
The functions that can be called are:

|Function|Access|Description|
|---|---|---|
|`investorDeposit(uint256 amount)`|All|Allow an investor to deposit the specified amount of tokens in the contract|
|`investorWithdrawAll()`|All|Allow an investor to withdraw all the tokens deposited in the contract (in case he changed idea)|
|`stopInvestorsDeposit()`|Fund manager|Go to the next state, allowing the fund manager to invest the deposited funds|

When *stopInvestorsDeposit* is called, the amount of funds before starting the investment is stored.

### STATE_DURING_INVESTMENT

This state is used by the fund manager to invest the deposited funds. When the investment is finished, funds are deposited back to the contract so that investors can withdraw them.\
The functions that can be called are:

|Function|Access|Description|
|---|---|---|
|`fundManagerDeposit(uint256 amount)`|Fund manager|Allow the fund manager to deposit the specified amount of tokens in the contract|
|`fundManagerWithdraw(uint256 amount)`|Fund manager|Allow the fund manager to withdraw the specified amount of tokens from the contract|
|`fundManagerWithdrawAll()`|Fund manager|Allow the fund manager to withdraw all the tokens from the contract|
|`startInvestorsWithdraw()`|Fund manager|Go to the next state, allowing the investors to withdraw their funds|

When *startInvestorsWithdraw* is called, the amount of funds after finishing the investment is stored.\
By knowing the two amounts (before and after the investment), the investment multiplier is simply calculated as the ratio between them:

    inv_multiplier = amount_after_investment / amount_before_investment

If the multiplier is greater than one, it'll mean that the fund manager made a profit with the investment, so the investors will withdraw more funds than the ones they deposited.\
If the multiplier is lower than one, it'll mean that the fund manager made a loss with the investment, so the investors will withdraw less funds than the ones they deposited.

Of course, the operation is performed using integers so a factor of *1e12* (12 decimal points) is added:

    inv_multiplier = (amount_after_investment * 1e12) / amount_before_investment

### STATE_AFTER_INVESTMENT

This state is used by investors to withdraw back their funds when the investment is finished.\
The functions that can be called are:

|Function|Access|Description|
|---|---|---|
|`investorWithdrawAll()`|All|Allow an investor to withdraw back his funds|
|`fundManagerReturnFundsToInvestor(address investor)`|All|Allow the fund manager to return funds to a specific investor (in case he didn't withdraw them)|
|`fundManagerReturnFundsToAllInvestors()`|Fund manager|Allow the fund manager to return funds to a all investors. It can be expensive in terms of gas, so it shall be used only if there are few investors remaining.|
|`stopInvestorsWithdraw()`|Fund manager|Go back to the *STATE_INITIAL* state|

The amount of funds withdrawn by an investor is proportional to the investment multiplier, so:

    withdrawn_amount = (deposited_amout * inv_multiplier) / 1e12

When *stopInvestorsWithdraw* is called, any remaining fund in the contract (either because it's not withdrawn or due to division rounding) will be sent to the remaining fund address.
