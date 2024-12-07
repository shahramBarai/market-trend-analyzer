FROM rust:1.83.0-alpine3.21 as builder

WORKDIR /usr/src/producer

# make pthreads zlib and gnu toolchain
RUN apk add build-base musl-dev \
    zlib-dev zlib-static \
    bash protoc --no-cache

COPY ./services/producer .
COPY ./shared /usr/shared

RUN cargo install --path .

FROM alpine:3.21 as runtime

COPY --from=builder /usr/local/cargo/bin/market-ticks-producer /usr/local/bin/market-ticks-producer

CMD ["market-ticks-producer"]
