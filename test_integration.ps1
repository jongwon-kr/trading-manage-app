Write-Host "=== Java-Python Integration Test ===" -ForegroundColor Green

# 1. Python check
Write-Host "`n[1/7] Python server..." -ForegroundColor Cyan
$pythonResponse = Invoke-RestMethod -Uri "http://localhost:8000/"
Write-Host "  OK: $($pythonResponse.status)" -ForegroundColor Green
Write-Host "  Consumer: $($pythonResponse.consumer_status)" -ForegroundColor Green

# 2. Java check
Write-Host "`n[2/7] Java server..." -ForegroundColor Cyan
$javaHealth = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health"
Write-Host "  OK: $($javaHealth.status)" -ForegroundColor Green

# 3. Docker check
Write-Host "`n[3/7] Docker containers..." -ForegroundColor Cyan
docker ps --format "{{.Names}}" | Select-String "tbill"

# 4. Analysis request
Write-Host "`n[4/7] Request analysis (TSLA)..." -ForegroundColor Cyan
$uri = "http://localhost:8080/api/analysis/technical?symbol=TSLA&market=STOCK&timeframe=1d"
$response = Invoke-RestMethod -Uri $uri -Method Post
$requestId = $response.requestId
Write-Host "  Request ID: $requestId" -ForegroundColor Yellow

# 5. Python log check info
Write-Host "`n[5/7] Check Python terminal for logs:" -ForegroundColor Cyan
Write-Host "  - Message received: topic=chart-analysis-request" -ForegroundColor Gray
Write-Host "  - Analysis started: symbol=TSLA" -ForegroundColor Gray

# 6. Wait
Write-Host "`n[6/7] Waiting 15 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 15
Write-Host "  Done" -ForegroundColor Green

# 7. Get result
Write-Host "`n[7/7] Get result..." -ForegroundColor Cyan
$resultUri = "http://localhost:8080/api/analysis/result/$requestId"
$result = Invoke-RestMethod -Uri $resultUri

if ($result.status -eq "SUCCESS") {
    Write-Host "`n=== TEST SUCCESS ===" -ForegroundColor Green
    Write-Host "Symbol      : $($result.symbol)" -ForegroundColor White
    Write-Host "Recommendation : $($result.recommendation)" -ForegroundColor Yellow
    Write-Host "Confidence  : $([math]::Round($result.confidence * 100, 1))%" -ForegroundColor Cyan
    
    if ($result.indicators) {
        Write-Host "`nIndicators:" -ForegroundColor White
        Write-Host "  RSI  : $([math]::Round($result.indicators.rsi, 2))" -ForegroundColor Gray
        Write-Host "  MACD : $([math]::Round($result.indicators.macd.macd, 2))" -ForegroundColor Gray
        Write-Host "  Price: $([math]::Round($result.indicators.moving_averages.current_price, 2))" -ForegroundColor Gray
    }
    
    Write-Host "`nSummary:" -ForegroundColor White
    Write-Host $result.summary -ForegroundColor Gray
    
} elseif ($result.status -eq "PROCESSING") {
    Write-Host "`n=== STILL PROCESSING ===" -ForegroundColor Yellow
    Write-Host "Python Consumer did NOT receive the message!" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check Python terminal for 'message received' log" -ForegroundColor White
    Write-Host "2. Run: python test_kafka.py" -ForegroundColor White
    Write-Host "3. Check: docker logs tbill-kafka" -ForegroundColor White
} else {
    Write-Host "`n=== FAILED ===" -ForegroundColor Red
    Write-Host "Status: $($result.status)" -ForegroundColor Gray
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Kafka UI: http://localhost:8989" -ForegroundColor Blue
Write-Host "Swagger : http://localhost:8080/swagger-ui/index.html" -ForegroundColor Blue
