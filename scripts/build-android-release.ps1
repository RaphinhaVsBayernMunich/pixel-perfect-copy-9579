param(
    [string]$StoreFile = 'C:\QuestOS-Secrets\questos-release.jks',
    [string]$KeyAlias = 'questos',
    [string]$JavaHome = 'C:\Users\DELL\.jdks\jbr-21.0.11',
    [switch]$WaitForChecks
)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace
if (!(Test-Path -LiteralPath $StoreFile -PathType Leaf)) { throw 'Release keystore does not exist.' }
if (!(Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) { throw 'JDK 21 is required.' }
$privateState = Join-Path $workspace 'supabase\.temp'
New-Item -ItemType Directory -Force -Path $privateState | Out-Null
$statusPath = Join-Path $privateState 'stage4-release-status.json'
$readyPath = Join-Path $privateState 'stage4-build-ready'
$certificatePath = Join-Path $privateState 'stage4-signing-certificate.pem'
$status = @{ status = 'awaiting-private-passwords' }
$status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
Write-Host 'QuestOS release signing. Enter passwords here only, never in chat.'
Write-Host "Keystore: $StoreFile; alias: $KeyAlias"
$storeSecret = Read-Host 'Keystore password' -AsSecureString
$keySecret = Read-Host 'Key password (Enter to use keystore password)' -AsSecureString
$previous = @{}
foreach ($name in @('JAVA_HOME','QUESTOS_KEYSTORE_PATH','QUESTOS_KEYSTORE_PASSWORD','QUESTOS_KEY_ALIAS','QUESTOS_KEY_PASSWORD')) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
    if ($storeSecret.Length -eq 0) { throw 'Keystore password is required.' }
    $status.status = 'waiting-for-checks'
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
    if ($WaitForChecks) {
        $deadline = [DateTime]::UtcNow.AddMinutes(30)
        while (!(Test-Path -LiteralPath $readyPath)) {
            if ([DateTime]::UtcNow -gt $deadline) { throw 'Preparation checks did not complete in time.' }
            Start-Sleep -Seconds 2
        }
    }
    $env:JAVA_HOME = $JavaHome
    $env:QUESTOS_KEYSTORE_PATH = $StoreFile
    $env:QUESTOS_KEY_ALIAS = $KeyAlias
    $env:QUESTOS_KEYSTORE_PASSWORD = [System.Net.NetworkCredential]::new('', $storeSecret).Password
    $env:QUESTOS_KEY_PASSWORD = if ($keySecret.Length -gt 0) { [System.Net.NetworkCredential]::new('', $keySecret).Password } else { $env:QUESTOS_KEYSTORE_PASSWORD }
    $status.status = 'building'
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
    $status.phase = 'verify-keystore'
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
    $ErrorActionPreference = 'Continue'
    $keytoolOutput = (& (Join-Path $JavaHome 'bin\keytool.exe') -exportcert -rfc -keystore $StoreFile -storepass:env QUESTOS_KEYSTORE_PASSWORD -alias $KeyAlias -file $certificatePath 2>&1 | Out-String)
    $certificateResult = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($certificateResult -ne 0) {
        $status.reason = if ($keytoolOutput -match 'password was incorrect|password is incorrect|password.*incorrect|tampered with') { 'store-password-rejected' } elseif ($keytoolOutput -match 'Alias.*does not exist|alias.*not found') { 'alias-not-found' } elseif ($keytoolOutput -match 'Access.*denied|Permission denied') { 'file-access-denied' } elseif ($keytoolOutput -match 'Invalid keystore format|Unrecognized keystore format') { 'invalid-keystore-format' } else { 'keystore-verification-rejected' }
        throw 'Keystore or alias verification failed.'
    }
    $keytoolOutput = $null
    $workerPath = Join-Path $PSScriptRoot 'run-android-release-build.ps1'
    $pwsh = (Get-Command pwsh -ErrorAction Stop).Source
    $worker = Start-Process -FilePath $pwsh -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', ('"' + $workerPath + '"'), '-Workspace', ('"' + $workspace + '"')) -PassThru
    $status.phase = 'bundle-release'
    $status.processId = $worker.Id
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
    Write-Host 'Release build started in a separate background process. This window can now close safely.'
} catch {
    $status.status = 'failed'
    $allowedFailures = @('Keystore password is required.','Preparation checks did not complete in time.','Keystore or alias verification failed.','Release build failed; inspect the local build log.','Release bundle was not produced.')
    $status.failure = if ($allowedFailures -contains $_.Exception.Message) { $_.Exception.Message } else { 'Signing helper runtime failed.' }
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
    Write-Host 'Release signing/build failed. No password values were recorded.'
} finally {
    foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    $keytoolOutput = $null
    $storeSecret.Dispose()
    $keySecret.Dispose()
}
Read-Host 'Press Enter to close'