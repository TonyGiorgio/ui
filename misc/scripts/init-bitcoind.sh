echo "Creating 'testwallet'..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 createwallet "testwallet"
echo "Loading 'testwallet'..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 loadwallet "testwallet"
echo "Generating 400 blocks..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 -generate=400