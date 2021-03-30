// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract testToken is ERC20, Ownable
{
    using SafeMath for uint256;

    uint256 public maxTotalSupply;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxTotalSupply,
        uint8 decimals
    )
        ERC20(name, symbol)
    {
        _setupDecimals(decimals);
        maxTotalSupply = _maxTotalSupply;
    }

    function mint(address to, uint256 amount) external onlyOwner
    {
        require(
            totalSupply().add(amount) <= maxTotalSupply,
            "Token: Total supply will exceed max total supply"
        );
        _mint(to, amount);
    }
}