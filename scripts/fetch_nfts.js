require('dotenv').config();
const { Alchemy, Network } = require('alchemy-sdk');
const fs = require('fs/promises');

// Verify environment variable exists
if (!process.env.ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY is required in .env file');
}

// Configure Alchemy SDK using environment variable
const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
};

// Initialize two Alchemy instances for different networks
const alchemyBase = new Alchemy({ ...config, network: Network.BASE_MAINNET });
const alchemyPolygon = new Alchemy({ ...config, network: Network.MATIC_MAINNET });

async function parseNFTUrls(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const nfts = [];
    
    for (let line of lines) {
        if (line.includes('https://www.niftyisland.com/item/')) {
            const name = line.split(':')[0].trim();
            const url = line.split(':')[1].trim();
            
            // Extract chain, contract address, and token ID from URL
            const urlParts = url.split('/');
            const chain = urlParts[4]; // 'base' or 'polygon'
            const contractAddress = urlParts[5];
            const tokenId = urlParts[6];
            
            nfts.push({
                name,
                chain,
                contractAddress,
                tokenId
            });
        }
    }
    
    return nfts;
}

async function getNFTMetadata(nft) {
    try {
        const alchemy = nft.chain === 'base' ? alchemyBase : alchemyPolygon;
        
        const response = await alchemy.nft.getNftMetadata(
            nft.contractAddress,
            nft.tokenId
        );
        
        return {
            ...nft,
            metadata: response
        };
    } catch (error) {
        console.error(`Error fetching metadata for ${nft.name}:`, error.message);
        return {
            ...nft,
            error: error.message
        };
    }
}

async function main() {
    try {
        // Parse the NFT URLs from the file
        const nfts = await parseNFTUrls('new_weapons.txt');
        const results = [];
        
        // Process each NFT sequentially
        for (let i = 0; i < nfts.length; i++) {
            console.log(`Processing NFT ${i + 1} of ${nfts.length}`);
            const result = await getNFTMetadata(nfts[i]);
            results.push(result);
            
            // Add a delay between requests (1 second)
            if (i < nfts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Write results to a JSON file
        await fs.writeFile(
            'nft_metadata.json', 
            JSON.stringify(results, null, 2)
        );
        
        console.log('Successfully fetched metadata for', results.length, 'NFTs');
        console.log('Results saved to nft_metadata.json');
        
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

main();