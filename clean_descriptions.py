#!/usr/bin/env python3
import json
import re

def clean_descriptions():
    # Read the JSON file
    file_path = '/Users/jordantian/Documents/PlotTwist-projects/PlotTwist-RPG/public/context/summary_metadata_with_vercel_urls.json'
    
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Pattern to match any sentence starting with 'This sword'
    # This will catch all variations including the shortened form
    pattern = r'[^.!?]*This sword[^.!?]*[.!?]'

    removed_count = 0
    total_items = len(data)

    # Process each item in the array
    for i, item in enumerate(data):
        # Check main description field
        if 'metadata' in item and 'description' in item['metadata']:
            original = item['metadata']['description']
            # For cases like "Phuc! This sword was created...", we want to keep "Phuc!" and remove the rest
            if 'This sword' in original:
                # Split on the sentence containing 'This sword' and keep everything before it
                parts = re.split(r'[^.!?]*This sword[^.!?]*[.!?]', original)
                cleaned = ''.join(parts).strip()
                if cleaned != original and cleaned:
                    item['metadata']['description'] = cleaned
                    removed_count += 1
                    print(f"Cleaned main description in item {i+1}: '{original}' -> '{cleaned}'")
        
        # Check nested description field in raw.metadata
        if ('metadata' in item and 
            'raw' in item['metadata'] and 
            'metadata' in item['metadata']['raw'] and 
            'description' in item['metadata']['raw']['metadata']):
            original = item['metadata']['raw']['metadata']['description']
            if 'This sword' in original:
                # Split on the sentence containing 'This sword' and keep everything before it
                parts = re.split(r'[^.!?]*This sword[^.!?]*[.!?]', original)
                cleaned = ''.join(parts).strip()
                if cleaned != original and cleaned:
                    item['metadata']['raw']['metadata']['description'] = cleaned
                    removed_count += 1
                    print(f"Cleaned nested description in item {i+1}: '{original}' -> '{cleaned}'")

    print(f'Processed {total_items} items, removed {removed_count} sentences')

    # Write the cleaned data back
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

    print('File updated successfully')
    return removed_count

if __name__ == "__main__":
    clean_descriptions()