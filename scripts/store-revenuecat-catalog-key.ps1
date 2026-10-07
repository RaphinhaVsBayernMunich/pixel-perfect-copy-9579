$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$statusPath = Join-Path (Get-Location) 'supabase/.temp/stage5-catalog-key-status.json'
$status = @{ status = 'awaiting-private-input'; keyName = 'QuestOS catalog verification'; version = 'V2' }
$status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
Write-Host 'Enter ONLY the new V2 key: QuestOS catalog verification.'
Write-Host 'The existing V1 subscriber key will not be modified.'
for ($attempt = 1; $attempt -le 2; $attempt++) {
    $secret = Read-Host 'New read-only V2 catalog key (private)' -AsSecureString
    $client = $null
    $value = $null
    try {
        $status.attempt = $attempt
        $value = [Net.NetworkCredential]::new('', $secret).Password.Trim()
        if ([string]::IsNullOrWhiteSpace($value) -or $value -match '[\r\n]') { throw 'Invalid private input' }
        $handler = [Net.Http.HttpClientHandler]::new()
        $handler.AllowAutoRedirect = $false
        $client = [Net.Http.HttpClient]::new($handler)
        $client.Timeout = [TimeSpan]::FromSeconds(20)
        $client.DefaultRequestHeaders.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $value)
        $response = $client.GetAsync('https://api.revenuecat.com/v2/projects/f6813f52/apps').GetAwaiter().GetResult()
        $status.httpStatus = [int]$response.StatusCode
        if ($status.httpStatus -ne 200) { $response.Dispose(); throw 'Catalog authentication or authorization failed' }
        $catalog = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        $response.Dispose()
        if (-not ($catalog.items | Where-Object { $_.id -eq 'app2a0b484e6e' })) { throw 'Expected Android app missing' }
        $start = [Diagnostics.ProcessStartInfo]::new()
        $start.FileName = Join-Path $env:USERPROFILE '.bun/bin/bun.exe'
        foreach ($arg in @('x','wrangler','secret','put','REVENUECAT_CONFIGURATION_API_KEY','--config','wrangler.json')) { $start.ArgumentList.Add($arg) }
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardInput = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        $process = [Diagnostics.Process]::Start($start)
        $outTask = $process.StandardOutput.ReadToEndAsync()
        $errTask = $process.StandardError.ReadToEndAsync()
        $process.StandardInput.WriteLine($value)
        $process.StandardInput.Close()
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult() > $null
        $errTask.GetAwaiter().GetResult() > $null
        if ($process.ExitCode -ne 0) { throw 'Cloudflare private storage failed' }
        $envPath = Join-Path (Get-Location) '.env'
        $content = [IO.File]::ReadAllText($envPath)
        $content = [regex]::Replace($content, '(?m)^REVENUECAT_CONFIGURATION_API_KEY=.*\r?\n?', '')
        [IO.File]::WriteAllText($envPath, $content.TrimEnd() + "`r`nREVENUECAT_CONFIGURATION_API_KEY=" + $value + "`r`n")
        $status.status = 'validated-and-stored'
        $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
        Write-Host 'V2 app access validated. Stored privately in Cloudflare and ignored local verification environment.'
        break
    } catch {
        $status.status = 'failed'
        $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
        Write-Host 'Private V2 validation/storage failed. No secret is displayed; existing V1 is unchanged.'
        if ($attempt -eq 1) { Write-Host 'One fresh private retry is available.' }
    } finally {
        if ($client) { $client.Dispose() }
        $secret.Dispose()
        $value = $null
        $content = $null
        $catalog = $null
    }
}
Read-Host 'Press Enter to close'
