# market-trend-analyzer

Scalable Systems and Data Management Course Project: Detecting Trading Trends in Financial Tick Data

## Start the project

Download the csv file(s) from the following [link](https://zenodo.org/records/6382482) and place them in the `services/producer/data` folder.

Run the following command to split the csv file into smaller chunks and create shares_name.json file into the `shared` folder:

```bash
python3 services/producer/split_csv.py -i <file_name>
```

Then, run the following command to start the project:

```bash
chmod +x scripts/start_dev.sh

./scripts/start_dev.sh
```

It will start the project in development mode printing the logs to the console. Web application will be available at `http://localhost:3000/`.

To stop and clean the project, run the following command:

```bash
docker-compose down
```
