FROM python:3.11-slim
WORKDIR /report

# Install necessary packages for Quarto and other dependencies + cleanup
RUN apt-get update && \
  apt-get -y install libfontconfig1-dev perl wget ca-certificates && \
  apt-get clean && \
  apt-get autoremove -y && \
  apt-get autoclean -y && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf /tmp/*

# Copy requirements.txt file and install Python dependencies
COPY requirements.txt requirements.txt
RUN pip install --upgrade pip && \
  pip install -r requirements.txt

ENV QUARTO_VERSION=1.6.30

# Install Quarto CLI
RUN wget "https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.deb" -O quarto.deb && \
  dpkg -i quarto.deb && \
  rm quarto.deb

# Install TinyTeX for LaTeX support
RUN quarto install tinytex --update-path
RUN quarto add --no-prompt quarto-journals/acm

# Add author notes support to ACM template
RUN sed '/\\author{.*}/a \$if(by-author.note.text)$\\authornote{$by-author.note.text$}$endif$' -i _extensions/quarto-journals/acm/partials/_acmart_authors.tex

EXPOSE 4200

# Loop to keep container running
# CMD ["tail", "-f", "/dev/null"]

CMD ["quarto", "preview", "index.qmd", "--port", "4200", "--host", "0.0.0.0"]
