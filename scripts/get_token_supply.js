require('dotenv').config();
const { Alchemy, Network } = require('alchemy-sdk');
const fs = require('fs/promises');
const { ethers } = require('ethers');

const config = {
   apiKey: process.env.ALCHEMY_API_KEY,
};

const alchemyBase = new Alchemy({ ...config, network: Network.BASE_MAINNET });
const alchemyPolygon = new Alchemy({ ...config, network: Network.MATIC_MAINNET });

async function getTokenSupply(alchemy, contractAddress, tokenId) {
   try {
       const provider = await alchemy.config.getProvider();
       const contract = new ethers.Contract(
           contractAddress,
           ["function totalSupply(uint256) view returns (uint256)"],
           provider
       );
       const supply = await contract.totalSupply(tokenId);

       // log supply
       console.log(`Supply for ${contractAddress} ${tokenId}: ${supply.toString()}`);

       return supply.toString();
   } catch (error) {
       console.error(`Error fetching supply: ${error.message}`);
       return null;
   }
}

async function processNFTMetadata(inputPath, outputPath) {
    try {
        const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));
        const results = [];
 
        for (let nft of data) {
            const alchemy = nft.chain === 'base' ? alchemyBase : alchemyPolygon;
            const supply = await getTokenSupply(alchemy, nft.contractAddress, nft.tokenId);
            
            results.push({
                ...nft,  // Keep all original fields
                _totalSupply: supply
            });
 
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
 
        await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
        console.log('Metadata saved to', outputPath);
 
    } catch (error) {
        console.error('Error:', error);
    }
 }

processNFTMetadata('weapon_models_summaries/summary_metadata.json', 'summary_metadata_with_supply.json');