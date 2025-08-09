import { put } from '@vercel/blob';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

async function uploadToVercel() {
  try {
    // Read the JSON file
    const jsonData = JSON.parse(await readFile('summary_metadata_with_supply.json', 'utf8'));
    
    // Track all uploads to ensure we don't duplicate
    const uploadedFiles = new Map();

    // Process each item
    for (const item of jsonData) {
      if (item._local_files) {
        for (const file of item._local_files) {
          if (file.file_type === 'model/glb') {
            const localPath = file.local_path;
            
            // Skip if we've already uploaded this file
            if (uploadedFiles.has(localPath)) {
              file.vercel_url = uploadedFiles.get(localPath);
              continue;
            }

            try {
              // Read the GLB file
              const glbBuffer = await readFile(path.join('', localPath));
              
              // Upload to Vercel Blob Storage
              const blob = await put(`demo/v1/models/weapons/${localPath}`, glbBuffer, {
                access: 'public',
                contentType: 'model/gltf-binary'
              });

              // Add Vercel URL to the file object
              file.vercel_url = blob.url;
              
              // Track this upload
              uploadedFiles.set(localPath, blob.url);

              console.log(`Uploaded ${localPath} to ${blob.url}`);
            } catch (error) {
              console.error(`Failed to upload ${localPath}:`, error);
            }
          }
        }
      }
    }

    // Save the updated JSON
    const outputPath = 'summary_metadata_with_vercel_urls.json';
    await writeFile(outputPath, JSON.stringify(jsonData, null, 2));
    console.log(`Updated JSON saved to ${outputPath}`);

  } catch (error) {
    console.error('Script failed:', error);
  }
}

uploadToVercel();