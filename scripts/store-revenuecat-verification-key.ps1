$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$environmentPath = Join-Path (Get-Location) '.env'
$statusPath = Join-Path (Get-Location) 'supabase/.temp/stage5-verification-status.json'
& git check-ignore --quiet -- .env
if ($LASTEXITCODE -ne 0) { throw 'Private environment must be ignored.' }
$status = @{ status = 'awaiting-fresh-private-key'; attempt = 1 }
$status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
for ($attempt = 1; $attempt -le 2; $attempt++) {
    $secret = Read-Host 'Fresh RevenueCat V2 read-only verification key (never in chat)' -AsSecureString
    $value = $null
    $client = $null
    try {
        $status.attempt = $attempt
        $value = [System.Net.NetworkCredential]::new('', $secret).Password.Trim()
        if ($value -notmatch '^sk_[A-Za-z0-9_-]+$') { $status.reason = 'revenuecat-key-format-rejected'; throw 'Private verification failed' }
        $handler = [System.Net.Http.HttpClientHandler]::new()
        $handler.AllowAutoRedirect = $false
        $client = [System.Net.Http.HttpClient]::new($handler)
        $client.Timeout = [TimeSpan]::FromSeconds(20)
        $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $value)
        $response = $client.GetAsync('https://api.revenuecat.com/v2/projects/f6813f52/apps').GetAwaiter().GetResult()
        $httpStatus = [int]$response.StatusCode
        $response.Dispose()
        if ($httpStatus -ne 200) {
            $status.reason = switch ($httpStatus) { 401 { 'revenuecat-key-rejected' }; 403 { 'revenuecat-key-scope-or-project-rejected' }; default { 'revenuecat-provider-check-unavailable' } }
            throw 'Private verification failed'
        }
        $start = [System.Diagnostics.ProcessStartInfo]::new()
        $start.FileName = (Get-Command bun -ErrorAction Stop).Source
        $start.WorkingDirectory = (Get-Location).Path
        foreach ($argument in @('x','wrangler','secret','put','REVENUECAT_CONFIGURATION_API_KEY','--config','wrangler.json')) { $start.ArgumentList.Add($argument) }
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardInput = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        $storage = [System.Diagnostics.Process]::Start($start)
        $outputTask = $storage.StandardOutput.ReadToEndAsync()
        $errorTask = $storage.StandardError.ReadToEndAsync()
        $storage.StandardInput.WriteLine($value)
        $storage.StandardInput.Close()
        $storage.WaitForExit()
        $null = $outputTask.GetAwaiter().GetResult()
        $null = $errorTask.GetAwaiter().GetResult()
        if ($storage.ExitCode -ne 0) { $status.reason = 'cloudflare-storage-failed'; throw 'Private storage failed' }
        $existing = if (Test-Path -LiteralPath $environmentPath) { [System.IO.File]::ReadAllText($environmentPath) } else { '' }
        $line = 'REVENUECAT_CONFIGURATION_API_KEY=' + $value
        $updated = if ($existing -match '(?m)^REVENUECAT_CONFIGURATION_API_KEY=.*$') { [regex]::Replace($existing, '(?m)^REVENUECAT_CONFIGURATION_API_KEY=.*$', $line) } else { $existing.TrimEnd() + "`n" + $line + "`n" }
        [System.IO.File]::WriteAllText($environmentPath, $updated, [System.Text.UTF8Encoding]::new($false))
        $status.status = 'verified-and-stored'
        $status.Remove('reason')
        $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
        Write-Host 'Fresh key verified against QuestOS and stored privately locally and in Cloudflare.'
        break
    } catch {
        $status.status = 'failed'
        if (!$status.reason) { $status.reason = 'private-key-check-or-storage-unavailable' }
        $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
        Write-Host ('RevenueCat verification failed: ' + $status.reason)
        if ($attempt -eq 1) { Write-Host 'One fresh private retry is offered immediately. No entered value will be reused.' }
    } finally {
        if ($client) { $client.Dispose() }
        $value = $null; $existing = $null; $line = $null; $updated = $null
        $secret.Dispose()
    }
}
Read-Host 'Press Enter to close'
