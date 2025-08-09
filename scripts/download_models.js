const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Sleep utility function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// TODO: surface errors downloading files to the user (e.g. for error: Request failed with status code 403)

const getUpdatedUrl = (originalUrl) => {
    const urlMappings = {
        'https://content.niftyisland.com/nftables/258f9f9a-74de-4ba5-a145-5c3740d5c5ef/v/1/source.fbx':
            'https://content.niftyisland.com/nftables/258f9f9a-74de-4ba5-a145-5c3740d5c5ef/v/2/source.fbx',
        'https://content.niftyisland.com/nftables/1ccfd6ea-bf46-4b7b-a5da-4ae9ff40ab76/v/1/source.fbx':
            'https://content.niftyisland.com/nftables/1ccfd6ea-bf46-4b7b-a5da-4ae9ff40ab76/v/3/source.fbx'
    };
    
    return urlMappings[originalUrl] || originalUrl;
};

const downloadFile = async (url, outputPath) => {
    try {
        // Apply URL mapping before download
        const updatedUrl = getUpdatedUrl(url);
        const response = await axios({
            method: 'GET',
            url: updatedUrl,
            responseType: 'arraybuffer'
        });

        await fs.writeFile(outputPath, response.data);
        console.log(`Successfully downloaded: ${outputPath}`);
        return true;
    } catch (error) {
        console.error(`Error downloading ${url}: ${error.message}`);
        return false;
    }
};

const createUniqueFileName = (nft, asset, fileExtension) => {
    // Create a unique name using chain, full contract address, token ID, and asset name
    const chainId = nft.chain;
    const contractAddress = nft.contractAddress.toLowerCase();
    const tokenId = nft.tokenId;
    const sanitizedAssetName = asset.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `${chainId}_${contractAddress}_${tokenId}_${sanitizedAssetName}.${fileExtension}`;
};

const processNFTData = async (nftData) => {
    // Add download statistics
    const stats = {
        successful: 0,
        failed: [],
    };

    // Create weapons_models directory if it doesn't exist
    const outputDir = 'weapon_models';
    try {
        await fs.access(outputDir);
    } catch {
        await fs.mkdir(outputDir);
        console.log('Created weapon_models directory');
    }

    // Deep clone the original NFT data
    const enhancedNFTData = JSON.parse(JSON.stringify(nftData));

    // Process each NFT
    for (let i = 0; i < enhancedNFTData.length; i++) {
        const nft = enhancedNFTData[i];
        
        if (!nft.metadata?.raw?.metadata?.assets) {
            continue;
        }

        const assets = nft.metadata.raw.metadata.assets;
        const nftName = nft.metadata.name;

        // Add new array to track local file paths
        nft._local_files = [];

        // Process each asset in the NFT
        for (const asset of assets) {
            if (!asset.files || !asset.files.length) {
                continue;
            }

            for (const file of asset.files) {
                if (file.file_type === 'model/fbx' || file.file_type === 'model/glb') {
                    const fileExtension = file.file_type.split('/')[1];
                    const fileName = createUniqueFileName(nft, asset, fileExtension);
                    const outputPath = path.join(outputDir, fileName);
                    const relativePath = path.join('weapon_models', fileName);

                    console.log(`Downloading ${nftName} - ${asset.name}...`);
                    const success = await downloadFile(file.url, outputPath);
                    
                    // Track download status
                    if (success) {
                        stats.successful++;
                    } else {
                        stats.failed.push({
                            name: nftName,
                            asset: asset.name,
                            url: file.url
                        });
                    }

                    // Add local file information
                    nft._local_files.push({
                        asset_name: asset.name,
                        original_url: file.url,
                        local_path: relativePath,
                        file_type: file.file_type
                    });

                    // Add 1 second delay between downloads
                    console.log('Waiting 1 second before next download...');
                    await sleep(1000);
                }
            }
        }
    }

    // Save the enhanced metadata
    const metadataOutputPath = path.join(outputDir, 'enhanced_metadata.json');
    await fs.writeFile(
        metadataOutputPath, 
        JSON.stringify(enhancedNFTData, null, 2),
        'utf8'
    );
    console.log(`Saved enhanced metadata to ${metadataOutputPath}`);

    // Print download statistics
    console.log('\n=== Download Statistics ===');
    console.log(`Successfully downloaded: ${stats.successful} files`);
    console.log(`Failed downloads: ${stats.failed.length} files`);
    if (stats.failed.length > 0) {
        console.log('\nFailed downloads details:');
        stats.failed.forEach(failure => {
            console.log(`- ${failure.name} (${failure.asset}): ${failure.url}`);
        });
    }

    return enhancedNFTData;
};

// Since the file is provided in the conversation, we assume it's already loaded
// but in a real Node.js environment, you would load it like this:
const nftData = require('./nft_metadata.json');

console.log('Starting download of weapon models...');
processNFTData(nftData)
    .then(() => console.log('Finished downloading all models and creating enhanced metadata'))
    .catch(error => console.error('Error processing NFT data:', error));