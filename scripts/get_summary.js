const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
// import dotenv
require('dotenv').config();

const SCREENSHOTS_DIR = 'weapon_models_screenshots';
const METADATA_DIR = 'weapon_models_glb';
const OUTPUT_DIR = 'weapon_models_summaries';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function fileToBase64(filePath) {
    const data = await fs.readFile(filePath);
    return `data:image/jpeg;base64,${data.toString('base64')}`;
}

async function getObjectSummary(screenshots) {
    try {
        const imageContents = await Promise.all(
            screenshots.map(async screenshot => ({
                type: 'image_url',
                image_url: {
                    url: await fileToBase64(screenshot.path)
                }
            }))
        );

        const messages = [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'This is a 3D model of an object shown from 4 different angles. Please provide a detailed description of its appearance, design, and notable features. Focus on visual elements that make this object unique or distinctive. Please keep the description to a sentence or few sentences in length.'
                },
                ...imageContents
            ]
        }];

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'google/gemini-flash-1.5-8b',
                messages: messages
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error getting object summary:', error.response?.data || error.message);
        throw error;
    }
}

async function processMetadata() {
    try {
        // Create output directory if needed
        try {
            await fs.access(OUTPUT_DIR);
        } catch {
            await fs.mkdir(OUTPUT_DIR);
        }

        // Read existing metadata
        const metadataPath = path.join(METADATA_DIR, 'glb_metadata.json');
        const screenshotMetadataPath = path.join(SCREENSHOTS_DIR, 'screenshot_metadata.json');
        
        const metadata = JSON.parse(await fs.readFile(screenshotMetadataPath, 'utf8'));

        // Process each NFT
        for (const nft of metadata) {
            if (!nft._screenshots?.length) continue;

            console.log(`\nProcessing NFT: ${nft.metadata.name}`);
            
            // Add summaries array if it doesn't exist
            nft._summaries = [];

            for (const modelScreenshots of nft._screenshots) {
                console.log(`Getting summary for model: ${path.basename(modelScreenshots.model_path)}`);
                
                try {
                    const summary = await getObjectSummary(modelScreenshots.screenshots);
                    
                    nft._summaries.push({
                        model_path: modelScreenshots.model_path,
                        summary: summary
                    });


                    // log summary
                    console.log(summary);

                    // Wait 2 seconds between API calls
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.error(`Failed to get summary for ${modelScreenshots.model_path}:`, error.message);
                }
            }
        }

        // Save new metadata
        const newMetadataPath = path.join(OUTPUT_DIR, 'summary_metadata.json');
        await fs.writeFile(newMetadataPath, JSON.stringify(metadata, null, 2));
        console.log(`\nSaved new metadata to ${newMetadataPath}`);

        return metadata;
    } catch (error) {
        console.error('Error processing metadata:', error);
        throw error;
    }
}

// Run with API key from environment variable
if (!OPENROUTER_API_KEY) {
    console.error('Please set OPENROUTER_API_KEY environment variable');
    process.exit(1);
}

console.log('Starting summary generation process...');
processMetadata()
    .then(() => console.log('Finished generating summaries'))
    .catch(error => console.error('Error running script:', error));