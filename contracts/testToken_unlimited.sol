// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract testTokenUnlimited is ERC20, Ownable
{
    using SafeMath for uint256;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    )
        ERC20(name, symbol)
    {
        _setupDecimals(decimals);
    }

    function mint(address to, uint256 amount) external onlyOwner
    {
        _mint(to, amount);
    }
}