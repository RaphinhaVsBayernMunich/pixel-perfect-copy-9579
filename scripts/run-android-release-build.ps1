param([Parameter(Mandatory=$true)][string]$Workspace)
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $Workspace
$privateState = Join-Path $Workspace 'supabase\.temp'
$statusPath = Join-Path $privateState 'stage4-release-status.json'
$certificatePath = Join-Path $privateState 'stage4-signing-certificate.pem'
$status = @{ status = 'building'; phase = 'bundle-release'; processId = $PID }
$status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
try {
    if (!$env:QUESTOS_KEYSTORE_PATH -or !$env:QUESTOS_KEYSTORE_PASSWORD -or !$env:QUESTOS_KEY_ALIAS -or !$env:QUESTOS_KEY_PASSWORD) { throw 'Signing environment is incomplete.' }
    & (Join-Path $Workspace 'android\gradlew.bat') -p android bundleRelease --no-daemon > (Join-Path $privateState 'stage4-release.log') 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed.' }
    $bundle = Join-Path $Workspace 'android\app\build\outputs\bundle\release\app-release.aab'
    if (!(Test-Path -LiteralPath $bundle)) { throw 'Release bundle was not produced.' }
    $status.status = 'built'
    $status.bundle = $bundle
    $status.certificate = $certificatePath
} catch {
    $status.status = 'failed'
    $status.failure = 'Release build did not complete; inspect the local Gradle log.'
} finally {
    foreach ($name in @('QUESTOS_KEYSTORE_PATH','QUESTOS_KEYSTORE_PASSWORD','QUESTOS_KEY_ALIAS','QUESTOS_KEY_PASSWORD')) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
}