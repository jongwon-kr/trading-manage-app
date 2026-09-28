Write-Host "=== Java-Python Integration Test ===" -ForegroundColor Green

# Windows PowerShell 5.1 은 charset 없는 application/json 을 ISO-8859-1 로 읽어 한글이 깨진다 → UTF-8 로 직접 디코딩
function Get-Json([string]$Uri) {
    $res = Invoke-WebRequest -Uri $Uri -UseBasicParsing
    return [Text.Encoding]::UTF8.GetString($res.RawContentStream.ToArray()) | ConvertFrom-Json
}

# 1. Python check (시세 API + 스트리머 상태)
Write-Host "`n[1/5] Python market API..." -ForegroundColor Cyan
$pythonHealth = Invoke-RestMethod -Uri "http://localhost:8000/health"
Write-Host "  Status: $($pythonHealth.status), Redis: $($pythonHealth.redis), Streamer: $($pythonHealth.streamerAlive)" -ForegroundColor Green

# 2. Java check
Write-Host "`n[2/5] Java server..." -ForegroundColor Cyan
$javaHealth = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health"
Write-Host "  OK: $($javaHealth.status)" -ForegroundColor Green

# 3. Docker check
Write-Host "`n[3/5] Docker containers..." -ForegroundColor Cyan
docker ps --format "{{.Names}}" | Select-String "tbill"

# 4. Strategy analysis request (Java → Kafka → Python worker → Redis)
Write-Host "`n[4/5] Request strategy analysis (US_STOCK:AAPL)..." -ForegroundColor Cyan
$body = @{ market = "US_STOCK"; symbol = "AAPL" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/analysis/strategy" -Method Post -ContentType "application/json" -Body $body
$requestId = $response.requestId
Write-Host "  Request ID: $requestId" -ForegroundColor Yellow

# 5. Poll result (최대 60초)
Write-Host "`n[5/5] Polling result..." -ForegroundColor Cyan
$resultUri = "http://localhost:8080/api/v1/analysis/result/$requestId"
$result = $null
for ($i = 0; $i -lt 60; $i++) {
    $result = Get-Json $resultUri
    if ($result.status -eq "SUCCESS" -or $result.status -eq "FAILED") { break }
    Start-Sleep -Seconds 1
}

if ($result.status -eq "SUCCESS") {
    Write-Host "`n=== TEST SUCCESS ===" -ForegroundColor Green
    Write-Host "Symbol     : $($result.name) ($($result.symbol))" -ForegroundColor White
    Write-Host "Score      : $($result.score) / 100  ($($result.strength))" -ForegroundColor Yellow
    Write-Host "Confidence : $([math]::Round($result.confidence * 100, 1))%" -ForegroundColor Cyan
    foreach ($g in $result.groups) {
        Write-Host ("  {0,-8} score={1} weight={2}" -f $g.label, $g.score, $g.effectiveWeight) -ForegroundColor Gray
    }
    Write-Host "Entry/Stop/Target: $($result.risk.entry) / $($result.risk.stopLoss) / $($result.risk.takeProfit2)" -ForegroundColor Gray
    Write-Host "`nSummary:" -ForegroundColor White
    Write-Host $result.summary -ForegroundColor Gray
} elseif ($result.status -eq "FAILED") {
    Write-Host "`n=== FAILED ===" -ForegroundColor Red
    Write-Host $result.errorMessage -ForegroundColor Gray
} else {
    Write-Host "`n=== STILL PROCESSING ($($result.status)) ===" -ForegroundColor Yellow
    Write-Host "Python worker did NOT finish in time." -ForegroundColor Red
    Write-Host "1. Check worker log (python -m app.worker.main)" -ForegroundColor White
    Write-Host "2. Run: python test_kafka.py" -ForegroundColor White
    Write-Host "3. Check: docker logs tbill-kafka" -ForegroundColor White
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Kafka UI: http://localhost:8989" -ForegroundColor Blue
Write-Host "Swagger : http://localhost:8080/swagger-ui/index.html" -ForegroundColor Blue
