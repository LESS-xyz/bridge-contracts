const ganache = require('ganache-core');
const HDWalletProvider = require("truffle-hdwallet-provider");
const BN = require("bn.js");

require('dotenv').config();
const {
    ETHERSCAN_API_KEY,
    BSCSCAN_API_KEY,
    MNEMONIC,
    DEPLOY_GAS_LIMIT_MAX,
    DEPLOY_GAS_PRICE_TESTNET,
    DEPLOY_GAS_PRICE_ETH_MAINNET,
    DEPLOY_GAS_PRICE_BSC_MAINNET,
    INFURA_ID_PROJECT
} = process.env;

const Web3 = require("web3");
const web3 = new Web3();

module.exports = {
    plugins: ['truffle-plugin-verify'],

    api_keys: {
        etherscan: ETHERSCAN_API_KEY,
        bscscan: BSCSCAN_API_KEY,
    },

    networks: {
        /* development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            gas: 30000000
        }, */
        ganache: {
            network_id: '*', // eslint-disable-line camelcase
            provider: ganache.provider({
                total_accounts: 15, // eslint-disable-line camelcase
                default_balance_ether: new BN(10000000), // eslint-disable-line camelcase
                mnemonic: 'bridge',
                // time: new Date('2017-10-10T15:00:00Z'),
                // debug: false,
                // ,logger: console
            }),
        },
        ropsten: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 3,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE_TESTNET, 'gwei'),
            gas: DEPLOY_GAS_LIMIT_MAX,
            confirmations: 0,
            skipDryRun: true
        },
        mainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://mainnet.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 1,
            confirmations: 10,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE_ETH_MAINNET, 'gwei'),
            gas: DEPLOY_GAS_LIMIT_MAX,
            skipDryRun: false
        },
        kovan: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://kovan.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 42,
            confirmations: 0,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE_TESTNET, 'gwei'),
            gas: DEPLOY_GAS_LIMIT_MAX,
            skipDryRun: true
        },
        rinkeby: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://rinkeby.infura.io/v3/" + INFURA_ID_PROJECT),
            network_id: 4,
            confirmations: 2,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE_TESTNET, 'gwei'),
            gas: DEPLOY_GAS_LIMIT_MAX,
            skipDryRun: true
        },
        bscTestnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://data-seed-prebsc-1-s1.binance.org:8545/"),
            network_id: 97,
            confirmations: 0,
            timeoutBlocks: 200,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE_TESTNET, 'gwei'),
            gas: DEPLOY_GAS_LIMIT_MAX,
            skipDryRun: true
        },
        bsc: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://bsc-dataseed3.binance.org"),
            network_id: 56,
            confirmations: 10,
            timeoutBlocks: 200,
            gasPrice: web3.utils.toWei(DEPLOY_GAS_PRICE_BSC_MAINNET, 'gwei'),
            gas: DEPLOY_GAS_LIMIT_MAX,
            skipDryRun: false
        }

    },

    compilers: {
        solc: {
            version: "0.7.6",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 999999
                }
            }
        }
    }
};