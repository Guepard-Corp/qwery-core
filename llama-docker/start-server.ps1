# PowerShell script to start llama.cpp server

Write-Host "Starting Llama.cpp Server with Mistral 7B..." -ForegroundColor Green
Write-Host ""

# Check if llama-server.exe exists
$serverPath = ".\llama.cpp\llama-server.exe"
$altServerPath = ".\llama.cpp\server.exe"

if (Test-Path $serverPath) {
    $exe = $serverPath
} elseif (Test-Path $altServerPath) {
    $exe = $altServerPath
} else {
    Write-Host "ERROR: llama-server.exe not found!" -ForegroundColor Red
    Write-Host "Please extract the downloaded llama.cpp Windows release into the 'llama.cpp' folder" -ForegroundColor Yellow
    Write-Host "Expected location: $serverPath" -ForegroundColor Yellow
    exit 1
}

# Check if model exists
$modelPath = ".\models\mistral-7b-instruct-v0.2.Q2_K.gguf"
if (!(Test-Path $modelPath)) {
    Write-Host "ERROR: Model file not found!" -ForegroundColor Red
    Write-Host "Please place the downloaded model file at: $modelPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If you have a different quantization, update the model filename in this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found server executable: $exe" -ForegroundColor Cyan
Write-Host "Found model: $modelPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server on http://localhost:8080" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
& $exe -m $modelPath --host 0.0.0.0 --port 8080 -c 8192 -b 512 --threads 8 --no-mmap --n-gpu-layers 0