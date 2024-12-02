FROM flink:1.18.0

# Install Python and pip
RUN apt-get update -y && apt-get install -y python3 python3-pip python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python3 as the default Python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /opt/flink/usrlib

# Copy Python dependencies
COPY ./services/flink-python-analytics .

# Install Python dependencies and download necessary libraries
RUN pip install -r requirements.txt