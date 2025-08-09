const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const CONVERTER_PATH = './FBX2glTF-macos-x86_64';
const INPUT_DIR = 'weapon_models';
const OUTPUT_DIR = 'weapon_models_glb';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function convertFbxToGlb(inputPath, outputPath) {
    try {
        // First check if input file exists
        if (!await fileExists(inputPath)) {
            console.error(`Input file does not exist: ${inputPath}`);
            return false;
        }

        console.log(`Converting ${inputPath} to GLB...`);
        
        // Remove the .glb extension from outputPath as the tool will add it
        const outputPathWithoutExt = outputPath.replace('.glb', '');
        
        // Run the converter with proper output path
        await execFileAsync(CONVERTER_PATH, [
            inputPath,
            '--binary',
            '--output', outputPathWithoutExt
        ]);
        
        // The tool will create a .glb file automatically
        // Verify the output file exists
        const finalOutputPath = `${outputPathWithoutExt}.glb`;
        if (await fileExists(finalOutputPath)) {
            console.log(`Successfully converted to: ${finalOutputPath}`);
            return true;
        } else {
            console.error(`Conversion seemed to succeed but output file not found: ${finalOutputPath}`);
            return false;
        }
    } catch (error) {
        console.error(`Error converting ${inputPath} to GLB:`, error);
        console.error('Command output:', error.stdout, error.stderr);
        return false;
    }
}

async function copyFile(src, dest) {
    try {
        if (!await fileExists(src)) {
            console.error(`Source file does not exist: ${src}`);
            return false;
        }

        await fs.copyFile(src, dest);
        console.log(`Successfully copied ${src} to ${dest}`);
        return true;
    } catch (error) {
        console.error(`Error copying ${src}:`, error);
        return false;
    }
}

async function processMetadata() {
    try {
        // Read the enhanced metadata
        const metadataPath = path.join(INPUT_DIR, 'enhanced_metadata.json');
        if (!await fileExists(metadataPath)) {
            throw new Error(`Metadata file not found: ${metadataPath}`);
        }

        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

        // Create output directory if it doesn't exist
        try {
            await fs.access(OUTPUT_DIR);
        } catch {
            await fs.mkdir(OUTPUT_DIR);
            console.log(`Created ${OUTPUT_DIR} directory`);
        }

        // Deep clone the metadata for modification
        const newMetadata = JSON.parse(JSON.stringify(metadata));

        // Process each NFT
        for (const nft of newMetadata) {
            if (!nft._local_files) {
                console.log(`Skipping NFT ${nft.tokenId} - no local files found`);
                continue;
            }

            // Track processed files for this NFT
            const processedFiles = [];

            for (const file of nft._local_files) {
                // Construct absolute input path
                const inputPath = file.local_path;
                console.log(`\nProcessing file: ${inputPath}`);

                const fileExt = path.extname(inputPath).toLowerCase();
                const isGlb = fileExt === '.glb';
                const isFbx = fileExt === '.fbx';

                if (!isGlb && !isFbx) {
                    console.log(`Skipping file with unsupported extension: ${fileExt}`);
                    continue;
                }

                // Create new filename with .glb extension
                const newFileName = path.basename(inputPath, fileExt) + '.glb';
                const outputPath = path.join(OUTPUT_DIR, newFileName);

                let success = false;
                if (isGlb) {
                    console.log('File is already GLB, copying...');
                    success = await copyFile(inputPath, outputPath);
                } else if (isFbx) {
                    console.log('Converting FBX to GLB...');
                    success = await convertFbxToGlb(inputPath, outputPath);
                    // Add small delay between conversions
                    await sleep(1);
                }

                if (success) {
                    processedFiles.push({
                        ...file,
                        local_path: path.join(OUTPUT_DIR, newFileName),
                        file_type: 'model/glb'
                    });
                }
            }

            // Update the NFT's local files with processed files
            nft._local_files = processedFiles;
        }

        // Save new metadata
        const newMetadataPath = path.join(OUTPUT_DIR, 'glb_metadata.json');
        await fs.writeFile(newMetadataPath, JSON.stringify(newMetadata, null, 2));
        console.log(`\nSaved new metadata to ${newMetadataPath}`);

        return newMetadata;
    } catch (error) {
        console.error('Error processing metadata:', error);
        throw error;
    }
}

// Run the script
console.log('Starting FBX to GLB conversion process...');
processMetadata()
    .then(() => console.log('Finished processing all files'))
    .catch(error => console.error('Error running script:', error));