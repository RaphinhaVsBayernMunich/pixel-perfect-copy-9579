param([ValidateSet('DEEPSEEK_API_KEY', 'INSTALL_FINGERPRINT_PEPPER')][string[]]$SecretNames = @('DEEPSEEK_API_KEY'))
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$bun = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
Write-Host 'QuestOS private Cloudflare secret entry. Do not enter secrets in chat.'
Write-Host 'Use the private prompt only. Preserve the existing stable trial pepper.'
foreach ($name in $SecretNames) {
    & $bun x wrangler secret put $name --config wrangler.json
    if ($LASTEXITCODE -ne 0) { throw "Secret entry failed for $name" }
}
Write-Host 'Secret entry completed. Values were not saved to source files.'
Read-Host 'Press Enter to close'
