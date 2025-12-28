FROM ubuntu:22.04

# Install build and runtime dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    curl \
    wget \
    pkg-config \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Clone and build llama.cpp using CMake (Makefile is deprecated)
WORKDIR /app
RUN git clone https://github.com/ggerganov/llama.cpp.git
WORKDIR /app/llama.cpp
RUN cmake -S . -B build -DLLAMA_BUILD_SERVER=ON -DGGML_CURL=ON -DLLAMA_CURL=ON && \
    cmake --build build --config Release -j$(nproc)

# Create models directory
RUN mkdir -p /app/models

# Download Mistral 7B Instruct model (Q2_K quantization - ~2.5GB)
RUN echo "Downloading Mistral 7B model..." && \
    curl -L -o /app/models/mistral-7b-instruct-v0.2.Q2_K.gguf \
    https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q2_K.gguf && \
    echo "Model downloaded successfully!"

# Expose port for the server
EXPOSE 8080

# Default command (directly run the built server)
WORKDIR /app/llama.cpp
ENV LD_LIBRARY_PATH=/app/llama.cpp/build/bin
CMD ["/app/llama.cpp/build/bin/llama-server", "-m", "/app/models/mistral-7b-instruct-v0.2.Q2_K.gguf", "--host", "0.0.0.0", "--port", "8080", "-c", "2048"]
