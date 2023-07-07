echo "Loading 'testwallet'..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 loadwallet "testwallet"
echo "Enter the number of blocks to generate:"
read BLOCKS
echo "Generating $BLOCKS block(s)..."
docker exec ui-bitcoind-1 bitcoin-cli -rpcuser=bitcoin -rpcpassword=bitcoin -rpcport=43782 -generate=$BLOCKS
