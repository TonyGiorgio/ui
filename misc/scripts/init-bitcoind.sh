echo "This mprocs shell is intended to be run once to initialize bitcoind by creating a wallet, \
loading the wallet, and generating 400 blocks. Please view `init-bitcoind.sh` for more details."
echo "Please press Enter to execute initialization"
read
echo "Creating 'testwallet'..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 createwallet "testwallet"
echo "Loading 'testwallet'..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 loadwallet "testwallet"
echo "Generating 400 blocks..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 -generate=400