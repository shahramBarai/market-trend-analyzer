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
parser.add_argument('-i', '--input_file', help='Input file', default='data/day-08-11-21.csv')
parser.add_argument('-o', '--output_dir', help='Output directory', default='data/day-08-11-21')
parser.add_argument('-s', '--split_by_region', help='Split by region', action='store_true', default=False)
args = parser.parse_args()

filepath = args.input_file
output_dir = args.output_dir
split_by_region = args.split_by_region

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

    # Create a directory for the output if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for row in reader:
        id = row[header.index('ID')]
        if id not in files:
            # Create a new file for the ID
            if split_by_region:
                # Split by exchange region and shares
                shares = id.split('.')[0]
                region = id.split('.')[1]
                # Create a directory for the region if it doesn't exist
                if not os.path.exists(f'{output_dir}/{region}'):
                    os.makedirs(f'{output_dir}/{region}')
                # Create a file for shares in the region
                files[id] = open(f'{output_dir}/{region}/{shares}.csv', 'w')
            else:
                # Split by id only
                files[id] = open(f'{output_dir}/{id}.csv', 'w')
            # Write the header to the file
            files[id].write(','.join(header) + '\n')

        # Write the row to the file
        files[id].write(','.join(row) + '\n')

    # Close all files
    for id in files:
        files[id].close()
