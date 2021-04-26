// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
//import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/Pausable.sol";

import "./ECDSAOffsetRecovery.sol";

contract swapContract is AccessControl, Pausable, ECDSAOffsetRecovery
{
    using SafeMath for uint256;

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    IERC20 public tokenAddress;
    address public feeAddress;

    uint128 public numOfThisBlockchain;
    mapping(uint128 => bool) public existingOtherBlockchain;
    mapping(uint128 => uint128) public feeAmountOfBlockchain;

    uint256 public constant SIGNATURE_LENGTH = 65;
    mapping(bytes32 => bytes32) public processedTransactions;
    uint256 public minConfirmationSignatures;

    uint256 public minTokenAmount;
    uint256 public maxGasPrice;
    uint256 public minConfirmationBlocks;

    event TransferFromOtherBlockchain(address user, uint256 amount);
    event TransferToOtherBlockchain(uint128 blockchain, address user, uint256 amount, string newAddress);
    
    modifier onlyOwner() {
        require(
            hasRole(OWNER_ROLE, _msgSender()),
            "Caller is not in owner role"
        );
        _;
    }

    modifier onlyOwnerAndManager() {
        require(
            hasRole(OWNER_ROLE, _msgSender()) || hasRole(MANAGER_ROLE, _msgSender()),
            "Caller is not in owner or manager role"
        );
        _;
    }

    modifier onlyRelayer() {
        require(
            hasRole(RELAYER_ROLE, _msgSender()),
            "swapContract: Caller is not in relayer role"
        );
        _;
    }

    constructor(
        IERC20 _tokenAddress,
        address _feeAddress,
        uint128 _numOfThisBlockchain,
        uint128 [] memory _numsOfOtherBlockchains,
        uint128 _minConfirmationSignatures,
        uint256 _minTokenAmount,
        uint256 _maxGasPrice,
        uint256 _minConfirmationBlocks
    )
    {
        tokenAddress = _tokenAddress;
        feeAddress = _feeAddress;
        for (uint i = 0; i < _numsOfOtherBlockchains.length; i++ ) {
            require(
                _numsOfOtherBlockchains[i] != _numOfThisBlockchain,
                "swapContract: Number of this blockchain is in array of other blockchains"
            );
            existingOtherBlockchain[_numsOfOtherBlockchains[i]] = true;
        }

        require(_maxGasPrice > 0, "swapContract: Gas price cannot be zero");
        
        numOfThisBlockchain = _numOfThisBlockchain;
        minConfirmationSignatures = _minConfirmationSignatures;
        minTokenAmount = _minTokenAmount;
        maxGasPrice = _maxGasPrice;
        minConfirmationBlocks = _minConfirmationBlocks;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OWNER_ROLE, _msgSender());
    }

    function getOtherBlockchainAvailableByNum(uint128 blockchain) external view returns (bool)
    {
        return existingOtherBlockchain[blockchain];
    }

    function transferToOtherBlockchain(uint128 blockchain, uint256 amount, string memory newAddress) external whenNotPaused
    {
        require(
            bytes(newAddress).length > 0,
            "swapContract: No destination address provided"
        );
        require(
            existingOtherBlockchain[blockchain] && blockchain != numOfThisBlockchain,
            "swapContract: Wrong choose of blockchain"
        );
        require(
            amount >= feeAmountOfBlockchain[blockchain],
            "swapContract: Not enough amount of tokens"
        );
        address sender = _msgSender();
        require(
            tokenAddress.balanceOf(sender) >= amount,
            "swapContract: Not enough balance"
        );
        tokenAddress.transferFrom(sender, address(this), amount);
        emit TransferToOtherBlockchain(blockchain, sender, amount, newAddress);
    }

    function transferToUserWithFee(
        address user,
        uint256 amountWithFee,
        bytes32 originalTxHash,
        bytes memory concatSignatures
    ) 
        external
        onlyRelayer
        whenNotPaused
    {
        require(
            amountWithFee >= minTokenAmount,
            "swapContract: Amount must be greater than minimum"
        );
        require(
            user != address(0),
            "swapContract: Address cannot be zero address"   // TODO: check this requirement
        );
        require(
            concatSignatures.length.mod(SIGNATURE_LENGTH) == 0,
            "swapContract: Signatures lengths must be divisible by 65"
        );
        require(
            concatSignatures.length.div(SIGNATURE_LENGTH) >= minConfirmationSignatures,
            "swapContract: Not enough signatures passed"
        );

        bytes32 hashedParams = getHashPacked(user, amountWithFee, originalTxHash);
        (bool processed, bytes32 savedHash) = isProcessedTransaction(originalTxHash);
        require(!processed && savedHash != hashedParams, "swapContract: Transaction already processed");
        
        uint256 signaturesCount = concatSignatures.length.div(uint256(SIGNATURE_LENGTH));
        address[] memory validatorAddresses = new address[](signaturesCount);
        for (uint256 i = 0; i < signaturesCount; i++) {
            address validatorAddress = ecOffsetRecover(hashedParams, concatSignatures, i * SIGNATURE_LENGTH);
            require(isValidator(validatorAddress), "swapContract: Validator address not in whitelist");
            for (uint256 j = 0; j < i; j++) {
                require(validatorAddress != validatorAddresses[j], "swapContract: Validator address is duplicated");
            }
            validatorAddresses[i] = validatorAddress;
        }
        processedTransactions[originalTxHash] = hashedParams;

        uint256 fee = feeAmountOfBlockchain[numOfThisBlockchain];
        tokenAddress.transfer(user, amountWithFee.sub(fee));
        tokenAddress.transfer(feeAddress, fee);
        emit TransferFromOtherBlockchain(user, amountWithFee);
    }

    // OTHER BLOCKCHAIN MANAGEMENT

    function addOtherBlockchain(
        uint128 numOfOtherBlockchain
    )
        external
        onlyOwner
    {
        require(
            numOfOtherBlockchain != numOfThisBlockchain,
            "swapContract: Cannot add this blockchain to array of other blockchains"
        );
        require(
            !existingOtherBlockchain[numOfOtherBlockchain],
            "swapContract: This blockchain is already added"
        );
        existingOtherBlockchain[numOfOtherBlockchain] = true;
    }

    function removeOtherBlockchain(
        uint128 numOfOtherBlockchain
    )
        external
        onlyOwner
    {
        require(
            existingOtherBlockchain[numOfOtherBlockchain],
            "swapContract: This blockchain was not added"
        );
        existingOtherBlockchain[numOfOtherBlockchain] = false;
    }

    function changeOtherBlockchain(
        uint128 oldNumOfOtherBlockchain,
        uint128 newNumOfOtherBlockchain
    )
        external
        onlyOwner
    {
        require(
            oldNumOfOtherBlockchain != newNumOfOtherBlockchain,
            "swapContract: Cannot change blockchains with same number"
        );
        require(
            newNumOfOtherBlockchain != numOfThisBlockchain,
            "swapContract: Cannot add this blockchain to array of other blockchains"
        );
        require(
            existingOtherBlockchain[oldNumOfOtherBlockchain],
            "swapContract: This blockchain was not added"
        );
        require(
            !existingOtherBlockchain[newNumOfOtherBlockchain],
            "swapContract: This blockchain is already added"
        );
        
        existingOtherBlockchain[oldNumOfOtherBlockchain] = false;
        existingOtherBlockchain[newNumOfOtherBlockchain] = true;
    }


    // FEE MANAGEMENT

    function changeFeeAddress(address newFeeAddress) external onlyOwnerAndManager
    {
        feeAddress = newFeeAddress;
    }

    function setFeeAmountOfBlockchain(uint128 blockchainNum, uint128 feeAmount) external onlyOwnerAndManager
    {
        feeAmountOfBlockchain[blockchainNum] = feeAmount;
    }

    // VALIDATOR CONFIRMATIONS MANAGEMENT
    
    function setMinConfirmationSignatures(uint256 _minConfirmationSignatures) external onlyOwner {
        require(_minConfirmationSignatures > 0, "swapContract: At least 1 confirmation can be set");
        minConfirmationSignatures = _minConfirmationSignatures;
    }

    function setMinTokenAmount(uint256 _minTokenAmount) external onlyOwnerAndManager {
        minTokenAmount = _minTokenAmount;
    }

    function setMaxGasPrice(uint256 _maxGasPrice) external onlyOwnerAndManager {
        require(_maxGasPrice > 0, "swapContract: Gas price cannot be zero");
        maxGasPrice = _maxGasPrice;
    }

    function setMinConfirmationBlocks(uint256 _minConfirmationBlocks) external onlyOwnerAndManager {
        minConfirmationBlocks = _minConfirmationBlocks;
    }

    function transferOwnerAndSetManager(address newOwner, address newManager) external onlyOwner {
        require(newOwner != _msgSender(), "swapContract: New owner must be different than current");
        require(newOwner != address(0x0), "swapContract: Owner cannot be zero address");
        require(newManager != address(0x0), "swapContract: Owner cannot be zero address");
        _setupRole(DEFAULT_ADMIN_ROLE, newOwner);
        _setupRole(OWNER_ROLE, newOwner);
        _setupRole(MANAGER_ROLE, newManager);
        renounceRole(OWNER_ROLE, _msgSender());
        renounceRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function pauseExecution() external onlyOwner {
        _pause();
    }

    function continueExecution() external onlyOwner {
        _unpause();
    }

    function isOwner(address account) public view returns (bool) {
        return hasRole(OWNER_ROLE, account);
    }

    function isManager(address account) public view returns (bool) {
        return hasRole(MANAGER_ROLE, account);
    }

    function isRelayer(address account) public view returns (bool) {
        return hasRole(RELAYER_ROLE, account);
    }

    function isValidator(address account) public view returns (bool) {
        return hasRole(VALIDATOR_ROLE, account);
    }

    function isProcessedTransaction(bytes32 originalTxHash) public view returns (bool processed, bytes32 hashedParams) {
        hashedParams = processedTransactions[originalTxHash];
        processed = hashedParams != bytes32(0);
    }
}