FROM debian:bookworm-20241016
WORKDIR /report

RUN apt-get update \ 
  && apt-get -y install libfontconfig1-dev

ENV QUARTO_VERSION=1.6.30

RUN apt-get -y install wget ca-certificates \
  && wget "https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.deb" -O quarto.deb \
  && dpkg -i quarto.deb \
  && rm quarto.deb \
  && apt-get autoremove -y \
  && apt-get autoclean -y \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /tmp/*

RUN quarto install tool tinytex

EXPOSE 4200

# Loop to keep container running
# CMD ["tail", "-f", "/dev/null"]

CMD ["quarto", "preview", "--port", "4200", "--host", "0.0.0.0"]