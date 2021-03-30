const BN = require("bn.js");
const chai = require("chai");
const { expect, assert } = require("chai");
const expectRevert = require("./utils/expectRevert.js");
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
        swapContractManager,
        testTokenOwner,
        feeAddress,
        newFeeAddress,
        user1,
        user2,
        newOwnerAddress,
        newManagerAddress
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
                ZERO,
                [ONE, TWO],
                {from: swapContractOwner}
            );
        })

        it("#0 Deploy test", async () => {
            const thisBlockchain = await swapContractInst.numOfThisBlockchain();
            expect(thisBlockchain).to.be.a.bignumber.zero;
            const otherBlockchainOne = await swapContractInst.getOtherBlockchainAvailableByNum(ONE);
            const otherBlockchainTwo = await swapContractInst.getOtherBlockchainAvailableByNum(TWO);
            const otherBlockchainThree = await swapContractInst.getOtherBlockchainAvailableByNum(THREE);
            expect(otherBlockchainOne).to.be.true;
            expect(otherBlockchainTwo).to.be.true;
            expect(otherBlockchainThree).to.be.false;

            await testTokenInst.mint(user1, ONE_TOKEN, {from: testTokenOwner});
            const userBalanceBefore = await testTokenInst.balanceOf(user1);
            expect(userBalanceBefore).to.be.a.bignumber.equals(ONE_TOKEN);
            await testTokenInst.approve(swapContractInst.address, ONE_TOKEN, {from: user1})
            const userApproval = await testTokenInst.allowance(user1, swapContractInst.address)
            expect(userApproval).to.be.a.bignumber.equals(ONE_TOKEN);
            await expectRevert(
                swapContractInst.transferToOtherBlockchain(ZERO, ONE_TOKEN, user2, {from: user1}),
                "swapContract: Wrong choose of blockchain"
            ) 
            await expectRevert(
                swapContractInst.transferToOtherBlockchain(FOUR, ONE_TOKEN, user2, {from: user1}),
                "swapContract: Wrong choose of blockchain"
            )
            await swapContractInst.transferToOtherBlockchain(ONE, ONE_TOKEN, user2, {from: user1})
            const userBalanceAfter = await testTokenInst.balanceOf(user1);
            expect(userBalanceAfter).to.be.a.bignumber.zero;
        })

        it("#1 Setup new owner and manager", async () => {
            // Owner modifier precheck
            const deployFeeAddress = await swapContractInst.feeAddress();
            await swapContractInst.changeFeeAddress(newFeeAddress, {from: swapContractOwner});
            const setupFeeAddress = await swapContractInst.feeAddress();
            expect(setupFeeAddress).not.to.be.equals(deployFeeAddress);

            // Owner and manager modifier precheck
            const deployFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            
            await swapContractInst.setFeeAmountOfBlockchain(ZERO, 15, {from: swapContractOwner});
            const newFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            expect(newFeeAmount).not.to.be.a.bignumber.equals(deployFeeAmount)
            await expectRevert(
                swapContractInst.setFeeAmountOfBlockchain(ZERO, 15, {from: newManagerAddress}),
                "Caller is not an owner or manager role"
            );

            await swapContractInst.transferOwnerAndSetManager(newOwnerAddress, newManagerAddress);
            await expectRevert(
                swapContractInst.changeFeeAddress(newFeeAddress, {from: swapContractOwner}),
                "Caller is not an owner role"
            );
            await expectRevert(
                swapContractInst.setFeeAmountOfBlockchain(ZERO, 25, {from: swapContractOwner}),
                "Caller is not an owner or manager role"
            );
            await swapContractInst.changeFeeAddress(deployFeeAddress, {from: newOwnerAddress})
            const revertedFeeAddress = await swapContractInst.feeAddress();
            expect(revertedFeeAddress).to.be.equals(deployFeeAddress);
            await swapContractInst.setFeeAmountOfBlockchain(ZERO, 25, {from: newManagerAddress});
            const secondFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            expect(secondFeeAmount).not.be.be.a.bignumber.equals(newFeeAmount);

            await swapContractInst.setFeeAmountOfBlockchain(ZERO, 30, {from: newOwnerAddress});
            const thirdFeeAmount = await swapContractInst.feeAmountOfBlockchain(ZERO);
            expect(thirdFeeAmount).not.be.be.a.bignumber.equals(secondFeeAmount);
        })

        it("#2 Test changing blockchains", async () => {
/*             const thisBlockchain = await swapContractInst.numOfThisBlockchain();
            expect(thisBlockchain).to.be.a.bignumber.zero;
            const otherBlockchainOne = await swapContractInst.getOtherBlockchainAvailableByNum(ONE);
            const otherBlockchainTwo = await swapContractInst.getOtherBlockchainAvailableByNum(TWO);
            expect(otherBlockchainOne).to.be.true;
            expect(otherBlockchainTwo).to.be.true;

            testTokenInst.mint(swapContractInst.address, ONE_TOKEN, {from: testTokenOwner});
            const swapBalance = await testTokenInst.balanceOf(swapContractInst.address);
            //console.log(swapBalance.toNumber())
            expect(swapBalance).to.be.a.bignumber.equals(ONE_TOKEN); */
        })
    }
)
