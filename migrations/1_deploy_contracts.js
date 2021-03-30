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
    NUM_BLOCKCHAIN_FOR_BSC,
    NUM_BLOCKCHAIN_FOR_ETH,
    ALL_BLOCKCHAIN_NUMS_LIST,
    FEE_ADDRESS,
    SWAP_CONTRACT_OWNER,
    SWAP_CONTRACT_MANAGER,
    FEE_COMISSIONS,
    TOKEN_TRANSFER_OWNERSHIP,
    TOKEN_CONTRACT_OWNER,
    MAX_TOTAL_SUPPLY,
    PREMINT_SUPPLY
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
    let allBlockchainNums = ALL_BLOCKCHAIN_NUMS_LIST.split(',')
    if (network == "bsc" || network == "bscTestnet")
    {
        name = NAME_BSC;
        symbol = SYMBOL_BSC;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_BSC);
        tokenAddressIfExist = TOKEN_ADDRESS_BSC;
        otherBlockchainNums = allBlockchainNums.filter(function(e) {
            return e !== blockchainNum.toString()
        });
    }
    else
    {
        name = NAME_ETH;
        symbol = SYMBOL_ETH;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_ETH);
        tokenAddressIfExist = TOKEN_ADDRESS_ETH;
        otherBlockchainNums = allBlockchainNums.filter(function(e) {
            return e !== blockchainNum.toString()
        })
    }

    let token;
    if (WITH_TOKEN == "true")
    {
        await deployer.deploy(
            testToken,
            name,
            symbol,
            MAX_TOTAL_SUPPLY,
            DECIMALS
        );
        token = await testToken.deployed();
        tokenAddress = token.address;
        
    }
    else
        //tokenAddress = await testToken.at(tokenAddressIfExist);
        tokenAddress = tokenAddressIfExist;

    await deployer.deploy(
        swapContract,
        tokenAddress,
        FEE_ADDRESS,
        blockchainNum,
        otherBlockchainNums
    );
    let swapContractInst = await swapContract.deployed();
    if (WITH_TOKEN == "true" && PREMINT_SUPPLY != "")
    {
        if (PREMINT_SUPPLY == "swapContract") {
            await token.mint(swapContractInst.address, TOTAL_SUPPLY);
            console.log("total supply of ", TOTAL_SUPPLY, "minted to swap contract ")
        } else if (PREMINT_SUPPLY == "owner") {
            await token.mint(TOKEN_CONTRACT_OWNER, TOTAL_SUPPLY);
            console.log("total supply of ", TOTAL_SUPPLY, "minted to token contract owner")
        }
        
    }

    feeComissions = FEE_COMISSIONS.split(',');
    feeComissionsLength = new BN(feeComissions.length);
    for(let i = ZERO; i.lt(feeComissionsLength); i = i.add(ONE))
    {
        await swapContractInst.setFeeAmountOfBlockchain(allBlockchainNums[i], feeComissions[i]);
        console.log("Set commission = ", feeComissions[i], " on blockchain number = ", allBlockchainNums[i])
    }
    await swapContractInst.transferOwnerAndSetManager(SWAP_CONTRACT_OWNER, SWAP_CONTRACT_MANAGER);
    console.log("swap contract ownership transferred, owner", SWAP_CONTRACT_OWNER, "manager", SWAP_CONTRACT_MANAGER)
    if (WITH_TOKEN == "true" && TOKEN_TRANSFER_OWNERSHIP == "true")
    {
        await token.transferOwnership(TOKEN_CONTRACT_OWNER);
        console.log("token contract ownership transferred to ", TOKEN_TRANSFER_OWNERSHIP)
    }
    console.log("tokenAddress address =", tokenAddress);
    console.log("swapContract address =", swapContractInst.address);
};