import secp256k1
import requests
import logging
import binascii
from web3 import Web3, HTTPProvider
from eth_abi import encode_abi
from eth_account.messages import encode_defunct

logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.INFO) # , stream=sys.stdout)

INFURA_PROJECT_ID = 'blabla'
ETHERSCAN_API_KEY = 'blabla'
BROWSER_HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:69.0) Geko/20100101 Firefox/69.0'}

BRIDGE_CONTRACT_ADDRESS = '0x1599b1101b85f3ceE607A3Afb2B8BD8107C61043'
BRIDGE_OWNER_ADDRESS = '0xbC5C9836Fedb15Fcc214cefc3304f52D17b30C5D'
BRIDGE_OWNER_PRIV = 'blablabla'

TOKEN_CONTRACT_ADDRESS = '0xd29dD78D106D793DE6056f3A34a158D8d253A608'

GAS_LIMIT = 3000000
GAS_PRICE = 20

MOCK_VALIDATORS = {
    "first": {
        "address": "0x7647735ad237462a375Fa53103F899213138692b",
        "priv": "0xa4e3b013bdac3eb8afcdd18b4965ddee5966aaeb88028bccdd20159f86f7b1fd",
    },
    "second": {
        "address": "0xA89A309F2Dec6bFcC317D654f8e6D6f4595CD655",
        "priv": "0x0bac03ccf4a1e2c9114f8c4ca8f11f0d9340f1f366fa38ba807ecd385c93aa13"
    },
    "third": {
        "address": "0x4A58f4B653DF4198A4C913543153629209B6794d",
        "priv": "0xb1a370ad5fdbb0db4f349faaa0c25331191c0ebea512ba778f2e5956c0e1678e"
    }
}


def sign_send_tx(web3_interface, contract_tx):
    nonce = web3_interface.eth.get_transaction_count(BRIDGE_OWNER_ADDRESS, 'pending')
    chain_id = web3_interface.eth.chainId

    tx_fields = {
        'chainId': chain_id,
        'gas': int(GAS_LIMIT),
        'gasPrice': web3_interface.toWei(GAS_PRICE, 'gwei'),
        'nonce': nonce
    }

    tx = contract_tx.buildTransaction(tx_fields)
    signed = web3_interface.eth.account.sign_transaction(tx, BRIDGE_OWNER_PRIV)
    raw_tx = signed.rawTransaction
    return web3_interface.eth.send_raw_transaction(raw_tx)


def web3_init():
    return Web3(HTTPProvider('https://kovan.infura.io/v3/' + INFURA_PROJECT_ID))

def get_contract_abi(contract_address):
    url = 'https://api-kovan.etherscan.io/api?module=contract&action=getabi&address={contract_address}&apikey={etherscan_api_key}'.format(
        contract_address=contract_address, etherscan_api_key=ETHERSCAN_API_KEY
    )
    res = requests.get(url=url, headers=BROWSER_HEADERS)
    return res.json().get('result')

def sign_message(web3, message, priv):
    priv = secp256k1.PrivateKey(web3.toBytes(hexstr=priv))
    signature = priv.ecdsa_recoverable_serialize(priv.ecdsa_sign_recoverable(message, raw=True))
    rec_bytes = '1c' if signature[1] == 1 else '1b'
    return '0x' + binascii.hexlify(signature[0]).decode('utf-8') + rec_bytes


def process():
    web3 = web3_init()
    bridge_contract_abi = get_contract_abi(BRIDGE_CONTRACT_ADDRESS)
    token_contract_abi = get_contract_abi(TOKEN_CONTRACT_ADDRESS)
    
    bridge_contract = web3.eth.contract(address=web3.toChecksumAddress(BRIDGE_CONTRACT_ADDRESS), abi=bridge_contract_abi)
    token_contract = web3.eth.contract(address=web3.toChecksumAddress(TOKEN_CONTRACT_ADDRESS), abi=token_contract_abi)

    mint_to = web3.toChecksumAddress(BRIDGE_OWNER_ADDRESS)
    mint_amount = bridge_contract.functions.minTokenAmount().call()
    other_blockchain_tx_hash = '0xfa2233bd9bb5d6844d126486ab266b02d2bdcaa76606354c4d8661d28b7b6d7a'

    encode_types =  ["address", "uint256", "bytes32"]
    encode_params = [mint_to, mint_amount, web3.toBytes(hexstr=other_blockchain_tx_hash)]

    hashed_params = encode_abi(encode_types, encode_params)
    keccak_params = web3.solidityKeccak(['bytes'], [hashed_params])
    print('hashed params', web3.toHex(hashed_params))
    print('keccak params', web3.toHex(keccak_params))
    

    signatures = []
    for validator, validator_data in MOCK_VALIDATORS.items():
        signed_message = sign_message(web3, keccak_params, validator_data.get('priv'))
        trimmed_signature = signed_message[2:]
        signatures.append(trimmed_signature)
        
        
        

    print(signatures)
    concat_signatures = '0x' + ''.join(signature for signature in signatures)
    print(concat_signatures)

    transfer_tx = bridge_contract.functions.transferToUserWithFee(
        mint_to,
        mint_amount,
        web3.toBytes(hexstr=other_blockchain_tx_hash),
        web3.toBytes(hexstr=concat_signatures)
    )

    tx_hash = sign_send_tx(web3, transfer_tx)
    print(tx_hash.hex())



    

if __name__ == '__main__':
    process()