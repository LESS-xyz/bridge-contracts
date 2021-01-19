// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract swapContract is Ownable
{
    IERC20 public tokenAddress;
    address public feeAddress;

    uint128 private _numOfTotalBlockchains;
    uint128 private _numOfThisBlockchain;

    event TransferFromOtherBlockchain(address user, uint256 amount);
    event TransferToOtherBlockchain(uint128 blockchain, address user, uint256 amount, string newAddress);

    constructor(
        IERC20 _tokenAddress,
        address _feeAddress,
        uint128 __numOfTotalBlockchains,
        uint128 __numOfThisBlockchain)
    {
        tokenAddress = _tokenAddress;
        feeAddress = _feeAddress;
        require(
            __numOfTotalBlockchains > 0,
            "WWISH: Wrong numOfTotalBlockchains"
        );
        require(
            __numOfThisBlockchain < __numOfTotalBlockchains,
            "WWISH: Wrong numOfThisBlockchain"
        );
        _numOfTotalBlockchains = __numOfTotalBlockchains;
        _numOfThisBlockchain = __numOfThisBlockchain;
    }

    function transferToOtherBlockchain(uint128 blockchain, uint256 amount, string memory newAddress) external
    {
        require(
            blockchain < _numOfTotalBlockchains && blockchain != _numOfThisBlockchain,
            "swapContract: Wrong choose of blockchain"
        );
        address sender = _msgSender();
        require(
            tokenAddress.balanceOf(sender) >= amount,
            "swapContract: Not enough balance"
        );
        tokenAddress.transferFrom(sender, address(this), amount);
        emit TransferToOtherBlockchain(blockchain, sender, amount, newAddress);
    }

    function transferToUserWithoutFee(address user, uint256 amount) external onlyOwner
    {
        tokenAddress.transfer(user, amount);
        emit TransferFromOtherBlockchain(user, amount);
    }

    function transferToUserWithFee(address user, uint256 amountToUser, uint256 feeAmount) external onlyOwner
    {
        tokenAddress.transfer(user, amountToUser);
        tokenAddress.transfer(feeAddress, feeAmount);
        emit TransferFromOtherBlockchain(user, amountToUser);
    }

    function changeInformationAboutOtherBlockchain(
        uint128 newNumOfThisBlockchain,
        uint128 newNumOfTotalBlockchains
    )
        external
        onlyOwner
    {
        _numOfTotalBlockchains = newNumOfTotalBlockchains;
        _numOfThisBlockchain = newNumOfThisBlockchain;
    }

    function changeFeeAddress(address newFeeAddress) external onlyOwner
    {
        feeAddress = newFeeAddress;
    }
}