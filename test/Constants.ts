import { BigNumber } from "ethers";

//
// Custom types
//

type InvetmentStatesType = {
  [key: string]: number;
};

//
// Constants for testing
//

// Null address
export const NULL_ADDRESS: string = "0x0000000000000000000000000000000000000000";
// Total investors for testing
export const TOTAL_TEST_INVESTORS: number = 5;
// Number of multiple deposits for testing
export const MULTIPLE_DEPOSIT_NUM: number = 2;
// Unlimited amount
export const UINT256_MAX: BigNumber = BigNumber.from("115792089237316195423570985008687907853269984665640564039457584007913129639935");
// Multiplier decimals
export const MULTIPLIER_DECIMALS: number = 1e12;
// Minimum multiplier
export const MIN_MULTIPLIER: number = 1e12;
// Some constants to be used in tests
export const TOKEN_SUPPLY: number = 1000000;
export const NEW_MIN_AMOUNT: number = 100;
export const NEW_MAX_AMOUNT: number = 100000;
export const NEW_MULTIPLE_OF: number = 10;
export const DUMMY_AMOUNT: number = 5000;
// Investment states
export const InvestmentStates: InvetmentStatesType = {
  INITIAL: 0,
  BEFORE_INVESTMENT: 1,
  DURING_INVESTMENT: 2,
  AFTER_INVESTMENT: 3,
};
