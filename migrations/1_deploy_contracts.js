const BN = require('bn.js');

require('dotenv').config();
const {
    DEPLOY_GAS_LIMIT_TOKEN,
    DEPLOY_GAS_LIMIT_BRIDGE,
    DEPLOY_GAS_LIMIT_TXES,
    WITH_TOKEN_ETH,
    WITH_TOKEN_BSC,
    NAME_ETH,
    SYMBOL_ETH,
    NAME_BSC,
    SYMBOL_BSC,
    TOTAL_SUPPLY,
    DECIMALS,
    TOKEN_ADDRESS_ETH,
    TOKEN_ADDRESS_BSC,
    TOKEN_UNLIMITED_ETH,
    TOKEN_UNLIMITED_BSC,
    NUM_BLOCKCHAIN_FOR_BSC,
    NUM_BLOCKCHAIN_FOR_ETH,
    ALL_BLOCKCHAIN_NUMS_LIST,
    FEE_ADDRESS,
    SWAP_CONTRACT_OWNER,
    SWAP_CONTRACT_MANAGER,
    FEE_COMISSIONS,
    TOKEN_TRANSFER_OWNERSHIP,
    TOKEN_CONTRACT_OWNER,
    BRIDGE_TRANSFER_OWNERSHIP,
    MAX_TOTAL_SUPPLY,
    PREMINT_SUPPLY_DEST_BSC,
    PREMINT_SUPPLY_DEST_ETH,
    // Relayer update parameters
    MIN_CONFIRMATION_SIGNATURES,
    MIN_CONFIRMATION_BLOCKS,
    MIN_TOKEN_AMOUNT_BSC,
    MIN_TOKEN_AMOUNT_ETH,
    MAX_GAS_PRICE_BSC,
    MAX_GAS_PRICE_ETH,
    WITH_VALIDATORS,
    WITH_RELAYERS,
    VALIDATORS_ADDRESSES,
    RELAYERS_ADDRESSES,
} = process.env;

const testToken = artifacts.require("testToken");
const testTokenUnlimited = artifacts.require("testTokenUnlimited");
const swapContract = artifacts.require("swapContract");

const ZERO = new BN(0);
const ONE = new BN(1);

module.exports = async function (deployer, network) {
    if (network == "test" || network == "development" || network == "ganache")
        return;

    let name;
    let symbol;
    let blockchainNum;
    let withToken;
    let tokenUnlimited;
    let tokenAddressIfExist;
    let allBlockchainNums = ALL_BLOCKCHAIN_NUMS_LIST.split(',')
    let premintSupplyDest;
    let minTokenAmount;
    let maxGasPrice;
    if (network == "bsc" || network == "bscTestnet")
    {
        withToken = WITH_TOKEN_BSC
        name = NAME_BSC;
        symbol = SYMBOL_BSC;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_BSC);
        tokenAddressIfExist = TOKEN_ADDRESS_BSC;
        otherBlockchainNums = allBlockchainNums.filter(function(e) {
            return e !== blockchainNum.toString()
        });
        premintSupplyDest = PREMINT_SUPPLY_DEST_BSC;
        minTokenAmount = MIN_TOKEN_AMOUNT_BSC;
        maxGasPrice = MAX_GAS_PRICE_BSC;
        tokenUnlimited = TOKEN_UNLIMITED_BSC;
    }
    else
    {
        withToken = WITH_TOKEN_ETH;
        name = NAME_ETH;
        symbol = SYMBOL_ETH;
        blockchainNum = new BN(NUM_BLOCKCHAIN_FOR_ETH);
        tokenAddressIfExist = TOKEN_ADDRESS_ETH;
        otherBlockchainNums = allBlockchainNums.filter(function(e) {
            return e !== blockchainNum.toString()
        });
        premintSupplyDest = PREMINT_SUPPLY_DEST_ETH;
        minTokenAmount = MIN_TOKEN_AMOUNT_ETH;
        maxGasPrice = MAX_GAS_PRICE_ETH;
        tokenUnlimited = TOKEN_UNLIMITED_ETH;
    }

    let token;
    if (withToken == "true")
    {
        if (tokenUnlimited == "true") {
            await deployer.deploy(
                testTokenUnlimited,
                name,
                symbol,
                DECIMALS,
                {gas: DEPLOY_GAS_LIMIT_TOKEN}
            );
            token = await testTokenUnlimited.deployed();
        } else {
            await deployer.deploy(
                testToken,
                name,
                symbol,
                MAX_TOTAL_SUPPLY,
                DECIMALS,
                {gas: DEPLOY_GAS_LIMIT_TOKEN}
            );
            token = await testToken.deployed();
        }
        
        tokenAddress = token.address;
        console.log('token deployed address: ', tokenAddress)    
    }
    else
        tokenAddress = tokenAddressIfExist;

    await deployer.deploy(
        swapContract,
        tokenAddress,
        FEE_ADDRESS,
        blockchainNum,
        otherBlockchainNums,
        MIN_CONFIRMATION_SIGNATURES,
        minTokenAmount,
        maxGasPrice,
        MIN_CONFIRMATION_BLOCKS,
        {gas: DEPLOY_GAS_LIMIT_BRIDGE}
    );
    let swapContractInst = await swapContract.deployed();
    console.log('swap deployed address: ', swapContractInst.address)
    if (withToken == "true" && premintSupplyDest != "")
    {
        if (premintSupplyDest == "swapContract") {
            await token.mint(swapContractInst.address, TOTAL_SUPPLY, {gas: DEPLOY_GAS_LIMIT_TXES});
            console.log("total supply of ", TOTAL_SUPPLY, "minted to swap contract ")
        } else if (premintSupplyDest == "owner") {
            await token.mint(TOKEN_CONTRACT_OWNER, TOTAL_SUPPLY), {gas: DEPLOY_GAS_LIMIT_TXES};
            console.log("total supply of ", TOTAL_SUPPLY, "minted to token contract owner")
        }
        
    }

    feeComissions = FEE_COMISSIONS.split(',');
    feeComissionsLength = new BN(feeComissions.length);
    for(let i = ZERO; i.lt(feeComissionsLength); i = i.add(ONE))
    {
        let feeAmountsTx = await swapContractInst.setFeeAmountOfBlockchain(
            allBlockchainNums[i],
            feeComissions[i],
            {gas: DEPLOY_GAS_LIMIT_TXES}
        );
        console.log("Set commission = ", feeComissions[i], " on blockchain number = ", allBlockchainNums[i]);
        // console.log(feeAmountsTx);
    }

    if (WITH_VALIDATORS == "true") {
        validators = VALIDATORS_ADDRESSES.split(',');
        validatorsLength = new BN(validators.length);
        validator_role = await swapContractInst.VALIDATOR_ROLE();
        for(let i = ZERO; i.lt(validatorsLength); i = i.add(ONE))
        {
            let validatorAddTx = await swapContractInst.grantRole(
                validator_role,
                validators[i],
                {gas: DEPLOY_GAS_LIMIT_TXES}
                )
            console.log("Added validator ", validators[i])
        }
    }

    if (WITH_RELAYERS == "true") {
        relayers = RELAYERS_ADDRESSES.split(',');
        relayersLength = new BN(relayers.length);
        relayer_role = await swapContractInst.RELAYER_ROLE();
        for(let i = ZERO; i.lt(relayersLength); i = i.add(ONE))
        {
            let relayerAddTx = await swapContractInst.grantRole(
                relayer_role,
                relayers[i],
                {gas: DEPLOY_GAS_LIMIT_TXES}
                )
            console.log("Added relayer ", relayers[i])
        }
    }

    if (BRIDGE_TRANSFER_OWNERSHIP == "true") {
        await swapContractInst.transferOwnerAndSetManager(
            SWAP_CONTRACT_OWNER,
            SWAP_CONTRACT_MANAGER,
            {gas: DEPLOY_GAS_LIMIT_TXES}
        );
        console.log("swap contract ownership transferred, owner", SWAP_CONTRACT_OWNER, "manager", SWAP_CONTRACT_MANAGER)
    }
    
    // console.log(transferOwnershipSwapTx)

    if (withToken == "true" && TOKEN_TRANSFER_OWNERSHIP == "true")
    {
        let transferOwnershipTokenTx = await token.transferOwnership(
            TOKEN_CONTRACT_OWNER,
            {gas: DEPLOY_GAS_LIMIT_TXES}
        );
        console.log("token contract ownership transferred to ", TOKEN_TRANSFER_OWNERSHIP);
        // console.log(transferOwnershipTx);
    }
    console.log("tokenAddress address =", tokenAddress);
    console.log("swapContract address =", swapContractInst.address);
};