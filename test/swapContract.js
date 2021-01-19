const BN = require("bn.js");
const chai = require("chai");
const { expect, assert } = require("chai");
const expectRevert = require("./utils/expectRevert.js");
const helper = require("openzeppelin-test-helpers/src/time.js");
const time = require("openzeppelin-test-helpers/src/time.js");
chai.use(require("chai-bn")(BN));

require('dotenv').config();
const {
} = process.env;

const MINUS_ONE = new BN(-1);
const ZERO = new BN(0);
const ONE = new BN(1);
const TWO = new BN(2);
const THREE = new BN(3);
const FOUR = new BN(4);
const FIVE = new BN(5);
const SIX = new BN(6);
const SEVEN = new BN(7);
const EIGHT = new BN(8);
const NINE = new BN(9);
const TEN = new BN(10);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const DECIMALS = new BN(18);
const ONE_TOKEN = TEN.pow(DECIMALS);

const TOTAL_SUPPLY = ONE_TOKEN.mul(new BN(1000000));

const swapContract = artifacts.require('swapContract');
const testToken = artifacts.require('testToken');

contract(
    'swapContract-test',
    ([
        swapContractOwner,
        testTokenOwner,
        feeAddress,
        user1,
        user2
    ]) => {
        let swapContractInst;
        let testTokenInst;

        let name = "Name";
        let symbol = "Symbol";

        beforeEach(async () => {
            // Init contracts

            testTokenInst = await testToken.new(
                name,
                symbol,
                TOTAL_SUPPLY,
                DECIMALS,
                {from: testTokenOwner}
            );

            swapContractInst = await swapContract.new(
                testTokenInst.address,
                feeAddress,
                THREE,
                ZERO,
                {from: swapContractOwner}
            );
        })

        it("#0 Deploy test", async () => {

        })
    }
)
