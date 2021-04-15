#!/bin/bash 

truffle migrate --reset --network kovan
truffle run verify testToken --network kovan
truffle run verify swapContract --network kovan
truffle migrate --reset --network bscTestnet 
truffle run verify testToken --network bscTestnet
truffle run verify swapContract --network bscTestnet