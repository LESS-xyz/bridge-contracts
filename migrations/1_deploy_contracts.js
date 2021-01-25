const BN = require('bn.js');

require('dotenv').config();
const {
    WITH_TOKEN,
    NAME_ETH,
    SYMBOL_ETH,
    NAME_BSC,
    SYMBOL_BSC,
    TOTAL_SUPPLY,
    DECIMALS,
    TOKEN_ADDRESS_ETH,
    TOKEN_ADDRESS_BSC,
    NUM_OF_TOTAL_BLOCKCHAINS,
    NUM_BLOCKCHAIN_FOR_BSC,
    NUM_BLOCKCHAIN_FOR_ETH,
    FEE_ADDRESS,
    SWAP_CONTRACT_OWNER,
    FEE_COMISSIONS
} = process.env;

const testToken = artifacts.require("testToken");
const swapContract = artifacts.require("swapContract");

const ZERO = new BN(0);
const ONE = new BN(1);

module.exports = async function (deployer, network) {
    if (network == "test" || network == "development")
        return;

    let name;
    let symbol;
    let blockchainNum;
    let tokenAddressIfExist;
    let num_of_total_blockchains = new BN(NUM_OF_TOTAL_BLOCKCHAINS);
    if (network == "bsc" || network == "bscTestnet")
    {
        name = NAME_BSC;
        symbol = SYMBOL_BSC;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_BSC);
        tokenAddressIfExist = TOKEN_ADDRESS_BSC;
    }
    else
    {
        name = NAME_ETH;
        symbol = SYMBOL_ETH;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_ETH);
        tokenAddressIfExist = TOKEN_ADDRESS_ETH;
    }

    let tokenAddress;
    if (WITH_TOKEN == "true")
    {
        await deployer.deploy(
            testToken,
            name,
            symbol,
            TOTAL_SUPPLY,
            DECIMALS
        );
        tokenAddress = await testToken.deployed();
    }
    else
        tokenAddress = await testToken.at(tokenAddressIfExist);

    await deployer.deploy(
        swapContract,
        tokenAddress.address,
        FEE_ADDRESS,
        num_of_total_blockchains,
        blockchainNum
    );
    let swapContractInst = await swapContract.deployed();
    tokenAddress.transfer(swapContractInst.address, TOTAL_SUPPLY);
    feeComissions = FEE_COMISSIONS.split(',');
    for(let i = ZERO; i < num_of_total_blockchains; i = i.add(ONE))
    {
        if (i < num_of_total_blockchains.sub(ONE))
        swapContractInst.setFeeAmountOfBlockchain(i, feeComissions[i]);
        else
        await swapContractInst.setFeeAmountOfBlockchain(i, feeComissions[i]);
    }
    swapContractInst.transferOwnership(SWAP_CONTRACT_OWNER);
    console.log("tokenAddress address =", tokenAddress.address);
    console.log("swapContract address =", swapContractInst.address);
};