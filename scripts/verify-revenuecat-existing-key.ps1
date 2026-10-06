$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$statusPath = Join-Path (Get-Location) 'supabase/.temp/stage5-existing-key-status.json'
$status = @{ status = 'awaiting-existing-key'; keyName = 'QuestOS backend subscriber verification'; version = 'unknown' }
$status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
Write-Host 'Enter the SAME existing key: QuestOS backend subscriber verification.'
Write-Host 'This is not your account password or a public SDK key. No key will be created, stored, replaced or revoked.'
for ($attempt = 1; $attempt -le 2; $attempt++) {
    $secret = Read-Host 'Existing RevenueCat secret API key (private input only)' -AsSecureString
    $client = $null
    $value = $null
    try {
        $status.attempt = $attempt
        $value = [System.Net.NetworkCredential]::new('', $secret).Password.Trim()
        if ([string]::IsNullOrWhiteSpace($value)) { $status.failure = 'invalid-format-empty-input'; throw 'Private input failed' }
        $handler = [System.Net.Http.HttpClientHandler]::new()
        $handler.AllowAutoRedirect = $false
        $client = [System.Net.Http.HttpClient]::new($handler)
        $client.Timeout = [TimeSpan]::FromSeconds(20)
        try { $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$value) }
        catch { $status.failure = 'invalid-http-header-format'; throw 'Private input failed' }
        # Existing verification customer, already created in the earlier pass.
        # This is the same subscriber endpoint the production backend uses; no paid access is granted.
        $response = $client.GetAsync('https://api.revenuecat.com/v1/subscribers/10000000-0000-4000-8000-000000000001').GetAwaiter().GetResult()
        $status.subscriberHttpStatus = [int]$response.StatusCode
        $response.Dispose()
        if ($status.subscriberHttpStatus -notin @(200,201)) {
            $status.failure = switch ($status.subscriberHttpStatus) {
                401 { 'authentication-failed' }
                403 { 'access-denied-permission-or-api-version-unconfirmed' }
                404 { 'endpoint-or-customer-not-found' }
                400 { 'request-or-format-rejected-by-provider' }
                default { 'provider-or-endpoint-unavailable' }
            }
            throw 'Subscriber verification failed'
        }
        $catalog = $client.GetAsync('https://api.revenuecat.com/v2/projects/f6813f52/apps').GetAwaiter().GetResult()
        $status.catalogHttpStatus = [int]$catalog.StatusCode
        $body = $catalog.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $catalog.Dispose()
        $status.catalogResult = if ($status.catalogHttpStatus -eq 200) { 'accepted' }
            elseif ($status.catalogHttpStatus -eq 401) { 'authentication-failed' }
            elseif ($status.catalogHttpStatus -eq 404) { 'endpoint-or-project-not-found' }
            elseif ($body -match 'API key.{0,120}(API )?version|version.{0,120}API key') { 'api-version-mismatch-reported-by-provider' }
            elseif ($body -match 'permission') { 'missing-permission-reported-by-provider' }
            elseif ($status.catalogHttpStatus -eq 403) { 'access-denied-permission-or-api-version-unconfirmed' }
            else { 'provider-or-endpoint-unavailable' }
        $status.status = 'subscriber-endpoint-verified'
        $status.Remove('failure')
        $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
        Write-Host ('Existing key accepted by required subscriber endpoint. Catalog result: ' + $status.catalogResult)
        break
    } catch {
        $status.status = 'failed'
        if (!$status.failure) { $status.failure = 'private-verification-unavailable' }
        $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath
        Write-Host ('Existing-key verification failed: ' + $status.failure)
        if ($attempt -eq 1) { Write-Host 'One fresh private retry is available. No entered value is retained.' }
    } finally {
        if ($client) { $client.Dispose() }
        $secret.Dispose()
        $value = $null
        $body = $null
    }
}
Read-Host 'Press Enter to close'
