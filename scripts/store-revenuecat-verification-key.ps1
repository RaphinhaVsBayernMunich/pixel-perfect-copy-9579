$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$privateEnvironment = Join-Path (Get-Location) '.env'
& git check-ignore --quiet -- .env
if ($LASTEXITCODE -ne 0) { throw 'Private environment must be ignored before storing a key.' }
Write-Host 'Enter only the approved RevenueCat V2 configuration read-only key here, never in chat.'
$secret = Read-Host 'RevenueCat verification key' -AsSecureString
$value = $null
try {
    $value = [System.Net.NetworkCredential]::new('', $secret).Password
    if ($value -notmatch '^sk_[A-Za-z0-9]+$') { throw 'Invalid RevenueCat secret key format.' }
    $existing = if (Test-Path -LiteralPath $privateEnvironment) { [System.IO.File]::ReadAllText($privateEnvironment) } else { '' }
    $line = 'REVENUECAT_CONFIGURATION_API_KEY=' + $value
    $updated = if ($existing -match '(?m)^REVENUECAT_CONFIGURATION_API_KEY=.*$') {
        [regex]::Replace($existing, '(?m)^REVENUECAT_CONFIGURATION_API_KEY=.*$', $line)
    } else { $existing.TrimEnd() + "`n" + $line + "`n" }
    [System.IO.File]::WriteAllText($privateEnvironment, $updated, [System.Text.UTF8Encoding]::new($false))
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
    if ($storage.ExitCode -ne 0) { throw 'Cloudflare storage failed; local key remains private. No provider output displayed.' }
    Write-Host 'Verification credential saved privately locally and in Cloudflare. No value displayed.'
} finally {
    $value = $null
    $existing = $null
    $line = $null
    $updated = $null
    $secret.Dispose()
}
