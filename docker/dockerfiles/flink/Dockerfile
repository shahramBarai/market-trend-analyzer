FROM flink:latest

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python3 as the default Python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /opt/flink/usrlib

# Copy Python dependencies
COPY ./services/flink-python-analytics .

# Install Python dependencies
RUN pip install -r requirements.txt

# Download necessary libraries
RUN wget -P . https://repo.maven.apache.org/maven2/org/apache/flink/flink-connector-kafka_2.12/1.14.0/flink-connector-kafka_2.12-1.14.0.jar

