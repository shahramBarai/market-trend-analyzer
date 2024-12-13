# Real-time data producer

This service is responsible for reading data from a csv file and sending it to a Kafka topic.

## How to run

If you want to run this service locally, then you need to have a Rust environment installed. You can install it by following the instructions on the [official website](https://www.rust-lang.org/tools/install). After that, you can run the following command to start the service:

```bash
cargo run
```

But you can also run it using Docker by running the following command in the root of the project:

```bash
docker-compose up producer
```
