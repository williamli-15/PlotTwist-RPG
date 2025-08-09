const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const SCREENSHOT_CLI = 'screenshot-glb'; // refer to globally installed @shopify/screenshot-glb
const INPUT_DIR = 'weapon_models_glb';
const OUTPUT_DIR = 'weapon_models_screenshots';
const ANGLES = [0, 90, 180, 270];

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function takeScreenshot(inputPath, outputPath, angle) {
    try {
        const cameraOrbit = `${-angle}deg`;
        console.log(`Taking screenshot at ${angle}° for ${inputPath}`);
        
        await execFileAsync(SCREENSHOT_CLI, [
            '-i', inputPath,
            '-o', outputPath,
            '-m', `camera-orbit=${cameraOrbit}`
        ]);
        
        if (await fileExists(outputPath)) {
            console.log(`Successfully created screenshot: ${outputPath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error taking screenshot for ${inputPath} at ${angle}°:`, error);
        return false;
    }
}

async function processGlbFile(glbPath, fileName) {
    const screenshots = [];
    
    for (const angle of ANGLES) {
        const screenshotName = `${path.basename(fileName, '.glb')}_${angle}deg.jpg`;
        const outputPath = path.join(OUTPUT_DIR, screenshotName);
        
        const success = await takeScreenshot(glbPath, outputPath, angle);
        if (success) {
            screenshots.push({
                angle: angle,
                path: outputPath
            });
        }
        
        // Add a small delay between screenshots
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    return screenshots;
}

async function processMetadata() {
    try {
        // Create output directory
        try {
            await fs.access(OUTPUT_DIR);
        } catch {
            await fs.mkdir(OUTPUT_DIR);
            console.log(`Created ${OUTPUT_DIR} directory`);
        }

        // Read existing metadata
        const metadataPath = path.join(INPUT_DIR, 'glb_metadata.json');
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

        // Process each NFT
        for (const nft of metadata) {
            if (!nft._local_files) continue;
            
            // Add new array for screenshots
            nft._screenshots = [];

            for (const file of nft._local_files) {
                if (!file.local_path.toLowerCase().endsWith('.glb')) continue;

                const screenshots = await processGlbFile(
                    file.local_path,
                    path.basename(file.local_path)
                );

                // Add screenshots to NFT metadata
                nft._screenshots.push({
                    model_path: file.local_path,
                    screenshots: screenshots
                });
            }
        }

        // Save new metadata
        const newMetadataPath = path.join(OUTPUT_DIR, 'screenshot_metadata.json');
        await fs.writeFile(newMetadataPath, JSON.stringify(metadata, null, 2));
        console.log(`Saved new metadata to ${newMetadataPath}`);

        return metadata;
    } catch (error) {
        console.error('Error processing metadata:', error);
        throw error;
    }
}

console.log('Starting GLB screenshot process...');
processMetadata()
    .then(() => console.log('Finished taking screenshots'))
    .catch(error => console.error('Error running script:', error));