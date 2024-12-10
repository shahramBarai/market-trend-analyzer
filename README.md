# market-trend-analyzer

Scalable Systems and Data Management Course Project: Detecting Trading Trends in Financial Tick Data

## Start the project

### Prerequisites

Download the csv file(s) from the following [link](https://zenodo.org/records/6382482) and place them in the `services/producer/data` folder.

Run the following command to split the csv file into smaller chunks and create symbols.json file into the `shared` folder:

```bash
python3 services/producer/split-csv.py -i <file_name>
```

Options and arguments:

- `-h` or `--help`: Show this help message and exit
- `-i` or `--input_file`: Input file path (default: `services/producer/data/day-08-11-21.csv`)
- `-o` or `--output_dir`: Output directory path (default: `services/producer/data/day-08-11-21`)
- `-d` or `--shared_dir`: Shared directory path (default: `shared`)
- `-s` or `--split_by_region`: Split by region (default: `False`)

### Start the project

Then, run the following command to start the project:

```bash
./scripts/start_dev.sh
```

or

```bash
./scripts/start_dev.sh --producer=docker
```

It will start the project in development mode printing the logs to the console. Web application will be available at `http://localhost:3000/`.

To stop and clean the project, run the following command:

```bash
docker-compose down
```

## Flink Checkpointing

The flink job is configured to use checkpointing with a checkpoint interval of 5 seconds. The checkpoint data is stored in the `/tmp/flink-checkpoints` folder of the `flink-jobmanager` container. If the job is failed or restarted, the checkpoint data is used to restore the state of the job. When a job is cancelled, the checkpoint data is not deleted. To use the checkpoint data, the job should be started with a savepoint containing the checkpoint data:

```bash
flink run -d -s /tmp/flink-checkpoints/<jobID>/<checkpoint> /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar
```

for example:

```bash
flink run -d -s /tmp/flink-checkpoints/a223527cc92753ddb18d045c855cac74
/chk-64/ /opt/flink/usrlib/scala-2.12/flink-scala-analytics-assembly-0.1.0-SNAPSHOT.jar
```
