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
    TOKEN_ADDRESS,
    NUM_BLOCKCHAIN_FOR_BSC,
    NUM_BLOCKCHAIN_FOR_ETH,
} = process.env;

const testToken = artifacts.require("testToken");
const swapContract = artifacts.require("swapContract");

const ZERO = new BN(0);

module.exports = async function (deployer, network) {
    if (network == "test" || network == "development")
        return;

    let name;
    let symbol;
    let blockchainNum;
    if (network == "bsc" || network == "bscTestnet")
    {
        name = BINANCE_NAME;
        symbol = BINANCE_SYMBOL;
        blockchainNum = new BN(NUM_FOR_BSC);
    }
    else
    {
        name = ETHEREUM_NAME;
        symbol = ETHEREUM_SYMBOL;
        blockchainNum = new BN(NUM_FOR_ETH);
    }

    await deployer.deploy(
        WWISH,
        name,
        symbol,
        blockchainNum,
        NUM_OF_BLOCKCHAINS
    );
    let WWishInst = await WWISH.deployed();
    await WWishInst.transferOwnership(OWNER);
    console.log("WWish address = ", WWishInst.address);
};