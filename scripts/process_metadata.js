const fs = require('fs');
const yaml = require('js-yaml');

function processGLBMetadata(metadata) {
  // Group GLB files by chain and contract
  const groupedGLBs = metadata.reduce((acc, nft) => {
    if (!nft._local_files) return acc;

    const key = `${nft.chain}-${nft.contractAddress}`;
    if (!acc[key]) {
      acc[key] = {
        chain: nft.chain,
        contractAddress: nft.contractAddress,
        contractName: nft.metadata.contract.name,
        glbFiles: []
      };
    }

    // Process each GLB file in the NFT
    nft._local_files.forEach((file, index) => {
      if (file.file_type !== 'model/glb') return;

      const summary = nft._summaries?.[index]?.summary?.trim() || 'No summary available';
      
      const glbData = {
        assetName: file.asset_name,
        // localPath: file.local_path,
        nftChain: nft.chain,
        nftContractAddress: nft.contractAddress,
        nftTokenId: nft.tokenId,
        nftTotalSupply: parseInt(nft._totalSupply),
        // nftName: nft.metadata.name,
        nftDescription: nft.metadata.description,
        aiSummary: summary
      };

      acc[key].glbFiles.push(glbData);
    });

    return acc;
  }, {});

  // Convert to YAML format
  const yamlData = {};
  Object.values(groupedGLBs).forEach(group => {
    const groupKey = `${group.chain}-${group.contractAddress}`;
    yamlData[groupKey] = {
      chain: group.chain,
      contractAddress: group.contractAddress,
      contractName: group.contractName,
      assets: group.glbFiles
    };
  });

  return yaml.dump(yamlData, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    quotingType: '"'
  });
}

// Read input JSON file
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Please provide an input JSON file path');
  process.exit(1);
}

const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const yamlOutput = processGLBMetadata(jsonData);

// Write output to text file
const outputFile = process.argv[3] || 'glb_metadata_output.txt';
fs.writeFileSync(outputFile, yamlOutput);
console.log(`Processed metadata written to ${outputFile}`);