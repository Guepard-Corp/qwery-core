# PowerShell script to download Mistral 7B model

Write-Host "Downloading Mistral 7B Instruct Q2_K model..." -ForegroundColor Green

# Create models directory if it doesn't exist
if (!(Test-Path -Path "models")) {
    New-Item -ItemType Directory -Path "models"
    Write-Host "Created models directory" -ForegroundColor Yellow
}

# Download the model
$url = "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q2_K.gguf"
$output = "models/mistral-7b-instruct-v0.2.Q2_K.gguf"

Write-Host "Downloading from: $url" -ForegroundColor Cyan
Write-Host "Saving to: $output" -ForegroundColor Cyan
Write-Host "This may take several minutes (file size: ~2.5GB)..." -ForegroundColor Yellow

try {
    # Use Invoke-WebRequest with progress
    $ProgressPreference = 'Continue'
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    
    Write-Host "`nDownload completed successfully!" -ForegroundColor Green
    Write-Host "Model saved to: $output" -ForegroundColor Green
    
    # Display file size
    $fileSize = (Get-Item $output).Length / 1MB
    Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
} catch {
    Write-Host "`nError downloading model: $_" -ForegroundColor Red
    Write-Host "You can try downloading manually from:" -ForegroundColor Yellow
    Write-Host $url -ForegroundColor Yellow
}
