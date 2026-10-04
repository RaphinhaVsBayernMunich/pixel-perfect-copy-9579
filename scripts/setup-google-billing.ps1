param([string]$GcloudPath = $env:QUESTOS_GCLOUD_PATH)
$ErrorActionPreference = 'Stop'
$projectId = 'questos-510417'
$accountEmail = "questos-revenuecat@$projectId.iam.gserviceaccount.com"
$topicId = 'questos-revenuecat'
if (-not $GcloudPath) {
  $bundled = Join-Path $PSScriptRoot '../supabase/.temp/google-cli/google-cloud-sdk/bin/gcloud.cmd'
  if (Test-Path -LiteralPath $bundled) { $GcloudPath = (Resolve-Path -LiteralPath $bundled).Path }
  else { $GcloudPath = (Get-Command gcloud -ErrorAction Stop).Source }
}
function Invoke-Google([string[]]$Arguments) {
  $output = & $GcloudPath @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Google CLI operation failed. No success is claimed.' }
  return $output
}
$accounts = Invoke-Google @('auth','list','--filter=status:ACTIVE','--format=value(account)')
if ($accounts -notcontains 'contactus21724@gmail.com') { throw 'Owner Google CLI authentication is required.' }
$project = Invoke-Google @('projects','describe',$projectId,'--format=value(projectId)')
if ($project -ne $projectId) { throw 'The existing QuestOS Google project could not be verified.' }
Invoke-Google @('services','enable','androidpublisher.googleapis.com','playdeveloperreporting.googleapis.com','pubsub.googleapis.com',"--project=$projectId",'--quiet') | Out-Null
$accounts = Invoke-Google @('iam','service-accounts','list',"--project=$projectId",'--format=value(email)')
if ($accounts -notcontains $accountEmail) {
  Invoke-Google @('iam','service-accounts','create','questos-revenuecat','--display-name=QuestOS RevenueCat',"--project=$projectId",'--quiet') | Out-Null
}
# RevenueCat's documented RTDN integration creates/manages its subscription. No Owner/Editor/Admin roles.
foreach ($role in @('roles/pubsub.editor','roles/monitoring.viewer')) {
  Invoke-Google @('projects','add-iam-policy-binding',$projectId,"--member=serviceAccount:$accountEmail","--role=$role",'--condition=None','--quiet','--format=none') | Out-Null
}
$topics = Invoke-Google @('pubsub','topics','list',"--project=$projectId",'--format=value(name)')
if ($topics -notcontains "projects/$projectId/topics/$topicId") {
  Invoke-Google @('pubsub','topics','create',$topicId,"--project=$projectId",'--quiet') | Out-Null
}
Invoke-Google @('pubsub','topics','add-iam-policy-binding',$topicId,'--member=serviceAccount:google-play-developer-notifications@system.gserviceaccount.com','--role=roles/pubsub.publisher',"--project=$projectId",'--quiet','--format=none') | Out-Null
Write-Output "Google billing infrastructure configured in $projectId."
Write-Output "Service account: $accountEmail"
Write-Output "RTDN topic: projects/$projectId/topics/$topicId"
Write-Output 'No private key was created. Play app permissions and RevenueCat credential validation remain separate checks.'
