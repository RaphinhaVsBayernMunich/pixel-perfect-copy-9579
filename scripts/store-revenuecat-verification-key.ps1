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
    Write-Host 'Verification credential saved privately. Its scope must be checked in RevenueCat before use.'
} finally {
    $value = $null
    $existing = $null
    $line = $null
    $updated = $null
    $secret.Dispose()
}
