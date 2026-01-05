# multi-stage: build in builder then copy runtime artifacts to smaller image
FROM ubuntu:22.04 AS builder
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /opt

# build deps (note libcurl4-openssl-dev)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    build-essential ca-certificates git cmake ninja-build pkg-config \
    libopenblas-dev libomp-dev libcurl4-openssl-dev \
    wget python3 python3-pip curl \
 && rm -rf /var/lib/apt/lists/*

# clone and build llama.cpp (use CMake + Ninja)
RUN git clone --depth 1 https://github.com/ggml-org/llama.cpp.git llama.cpp
WORKDIR /opt/llama.cpp

# configure & build
RUN cmake -B build -S . -GNinja -DCMAKE_BUILD_TYPE=Release \
 && cmake --build build -j"$(nproc)"

# runtime stage
FROM ubuntu:22.04 AS runtime
ENV MODEL_DIR=/models
ENV PORT=4040

# runtime libs: use libopenblas-base + libcurl4 (required by llama-server)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates libopenblas-base libgomp1 libcurl4 \
 && rm -rf /var/lib/apt/lists/*

# copy binaries
COPY --from=builder /opt/llama.cpp /opt/llama.cpp

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE ${PORT}
ENV MODEL_PATH=${MODEL_DIR}/tinyllama-1.1b-chat-v1.0-q4_k_m.gguf
ENV LLAMA_SERVER_PORT=${PORT}

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
