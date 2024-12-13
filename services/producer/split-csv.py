import argparse
import csv
import datetime
import time
import os

# Get the current system time at the start
start_time = time.time()

rows = []

# Parse command-line arguments
parser = argparse.ArgumentParser()
parser.add_argument('-i', '--input_file', help='Input file', default='services/producer/data/day-08-11-21.csv')
parser.add_argument('-o', '--output_dir', help='Output directory', default='services/producer/data/day-08-11-21')
parser.add_argument('-d', '--shared_dir', help='Shared directory', default='shared')
parser.add_argument('-s', '--split_by_region', help='Split by region', action='store_true', default=False)
args = parser.parse_args()

filepath = args.input_file
output_dir = args.output_dir
shared_dir = args.shared_dir
split_by_region = args.split_by_region

print(f"Starting the script with the following arguments:")
print(f"Input file: {filepath}")
print(f"Output directory: {output_dir}")
print(f"Shared directory: {shared_dir}")
print(f"Split by region: {split_by_region}")

with open(filepath, newline='') as csvfile:
    reader = csv.reader(csvfile, delimiter=',', quotechar='"')

    # Skip the first 11 lines
    for i in range(11):
        next(reader)

    # Process header and header description
    header = next(reader)
    header = [h.strip() for h in header]
    length = len(header)
    header_description = next(reader)
    header_description = [h.strip() for h in header_description]

    files = {}
    counts = {}  # Dictionary to count how many rows each share gets
    regions = {} # Dictionary to count how many regions in the file

    # Create a directory for the output if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # index of 'ID' in the header
    id_index = header.index('ID')

    print(f"\nSplitting {filepath} into multiple files...")
    for row in reader:
        id = row[id_index]
        if id not in files:
            # Split by exchange region and shares
            region = id.split('.')[1]
            # Add the region to the regions dictionary if it doesn't exist
            if region not in regions:
                regions[region] = 1
            
            # Create a new file for the ID
            if split_by_region:
                # Create a directory for the region if it doesn't exist
                region_dir = f'{output_dir}/{region}'
                if not os.path.exists(region_dir):
                    os.makedirs(region_dir)
                # Create a file for shares in the region
                files[id] = open(f'{region_dir}/{id}.csv', 'w')
                
            else:
                # Split by id only
                files[id] = open(f'{output_dir}/{id}.csv', 'w')
            # Write the header to the file
            files[id].write(','.join(header) + '\n')

            # Initialize count for this share
            counts[id] = 0

        # Write the row to the file
        files[id].write(','.join(row) + '\n')
        counts[id] += 1

    # Close all files
    for id in files:
        files[id].close()
    
    spliting_time = time.time() - start_time
    print("Splitting done!")

    print("\nCreating symbols.json...")
    # Create a json file which contains list of ids
    with open(f'{shared_dir}/symbols.json', 'w') as f:
        f.write('{"symbols": [')
        all_ids = list(files.keys())
        for i, share_id in enumerate(all_ids):
            f.write(f'"{share_id}"')
            if i != len(all_ids)-1:
                f.write(',')
        f.write(']}')
        f.close()
    print(f"Creating symbols.json done!")

    # Print the top 10 shares with the most rows
    sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    top_10 = sorted_counts[:10]

    print("\nTop 10 shares by row count:")
    i = 1
    for share_id, count in top_10:
        print(f"{i}. {share_id}: {count} rows")
        i += 1

    print("\nRegions in the file:")
    for region in regions:
        print(f"- {region}")

    # Delete the topics.json file if it exists
    if os.path.exists(f'{shared_dir}/topics.json'):
        os.remove(f'{shared_dir}/topics.json')

    # Create a topics.json file which contains the list of regions and kafka config
    print("\nCreating topics.json...")
    with open(f'{shared_dir}/topics.json', 'w') as f:
        f.write('[')
        for i, region in enumerate(regions):
            f.write(f'{{"name": "{region}-ticks","partitions": 10,"replicationFactor": 1}},')
            f.write(f'{{"name": "{region}-ema","partitions": 1,"replicationFactor": 1}},')
            f.write(f'{{"name": "{region}-advisories","partitions": 1,"replicationFactor": 1}}')
            if i != len(regions)-1:
                f.write(',')
        f.write(']')
        f.close()
    print(f"Creating topics.json done!")

    # Create a regions.txt file which contains the list of regions
    print("\nCreating regions.txt...")
    if os.path.exists(f'{shared_dir}/regions.txt'):
        os.remove(f'{shared_dir}/regions.txt')
    with open(f'{shared_dir}/regions.txt', 'w') as f:
        for i, region in enumerate(regions):
            f.write(f'{region}')
            if i != len(regions)-1:
                f.write(',')
        f.close()
    print(f"Creating regions.json done!")


    print("\nTotal number of shares:", len(files))
    print(f"Time taken to split {filepath}: {spliting_time} seconds")
    print(f"Total time taken: {time.time() - start_time} seconds")