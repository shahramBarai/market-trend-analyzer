import csv
import datetime
import time
import os

# Get the current system time at the start
start_time = time.time()

rows = []

filepath = 'data/day-08-11-21.csv'
output_dir = filepath.split('.')[0]

with open(filepath, newline='') as csvfile:
    reader = csv.reader(csvfile, delimiter=',', quotechar='"')

    # Skip the first 11 lines
    for i in range(11):
        next(reader)

    # Process header and header description
    header = next(reader)
    header = [h.strip() for h in header]
    length = len(header)
    print(header)
    header_description = next(reader)
    header_description = [h.strip() for h in header_description]

    files = {}

    for row in reader:
        id = row[header.index('ID')]
        if id not in files:
            # Create a directory for the output if it doesn't exist
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
            files[id] = open(f'{output_dir}/{id}.csv', 'w')
            files[id].write(','.join(header) + '\n')

        files[id].write(','.join(row) + '\n')

    for id in files:
        files[id].close()
