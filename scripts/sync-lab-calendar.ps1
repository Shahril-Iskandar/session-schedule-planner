# ============================================
# Lab calendar -> Supabase Storage sync
# ============================================

$FilePath = "C:\Users\ShahrilIskandarBinAb\OneDrive - Griffith University\LabCalendar\lab-events.json"

$LogFile = Join-Path $PSScriptRoot "sync-lab-calendar.log"
function Write-Log {
    param([string]$Message)

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Add-Content -Path $LogFile
}

$StateFile = Join-Path $PSScriptRoot "lab-events-last-hash.txt"

$SupabaseUrl = "https://rqyogwdvaaxtovysorbm.supabase.co"
$Bucket = "calendarICS"
$DestinationFile = "lab-events.json"

$SupabaseKey = $env:SUPABASE_SECRET_KEY

if ([string]::IsNullOrWhiteSpace($SupabaseKey)) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set."
    exit 1
}

# --------------------------------------------
# Check source file exists
# --------------------------------------------

if (-not (Test-Path $FilePath)) {
    Write-Error "Calendar file not found: $FilePath"
    exit 1
}


# --------------------------------------------
# Calculate current file hash
# --------------------------------------------

$CurrentHash = (Get-FileHash `
    -Path $FilePath `
    -Algorithm SHA256).Hash


# Read previous hash if available

$PreviousHash = ""

if (Test-Path $StateFile) {
    $PreviousHash = (Get-Content $StateFile -Raw).Trim()
}


# --------------------------------------------
# Nothing changed
# --------------------------------------------

if ($CurrentHash -eq $PreviousHash) {

    Write-Host "No calendar changes. Skipping upload."
    Write-Log "No calendar changes. Skipping upload."

    exit 0
}


# --------------------------------------------
# Upload to Supabase
# --------------------------------------------

Write-Host "Calendar changed. Uploading to Supabase..."

$Uri = "$SupabaseUrl/storage/v1/object/$Bucket/$DestinationFile"

$Headers = @{
    "Authorization" = "Bearer $SupabaseKey"
    "apikey"        = $SupabaseKey
    "x-upsert"      = "true"
}

try {

    Invoke-RestMethod `
        -Uri $Uri `
        -Method POST `
        -Headers $Headers `
        -ContentType "application/json" `
        -InFile $FilePath

    # Only save the new hash if upload succeeded
    Set-Content `
        -Path $StateFile `
        -Value $CurrentHash

    Write-Host "Calendar uploaded successfully."
    Write-Log "Calendar uploaded successfully to $Bucket/$DestinationFile."
}
catch {

    Write-Error "Supabase upload failed:"
    Write-Error $_

    exit 1
}

# --------------------------------------------
# Check source file exists
# --------------------------------------------

if (-not (Test-Path $FilePath)) {
    Write-Error "Calendar file not found: $FilePath"
    exit 1
}


# --------------------------------------------
# Calculate current file hash
# --------------------------------------------

$CurrentHash = (Get-FileHash `
    -Path $FilePath `
    -Algorithm SHA256).Hash

$PreviousHash = ""

if (Test-Path $StateFile) {
    $PreviousHash = (Get-Content $StateFile -Raw).Trim()
}


# --------------------------------------------
# Nothing changed
# --------------------------------------------

if ($CurrentHash -eq $PreviousHash) {
    Write-Host "No calendar changes. Skipping upload."
    Write-Log "No calendar changes. Skipping upload."    
    
    exit 0
}


# --------------------------------------------
# Upload to Supabase
# --------------------------------------------

Write-Host "Calendar changed. Uploading to Supabase..."

$Uri = "$SupabaseUrl/storage/v1/object/$Bucket/$DestinationFile"

$Headers = @{
    "Authorization" = "Bearer $SupabaseKey"
    "apikey"        = $SupabaseKey
    "x-upsert"      = "true"
}

try {

    $Response = Invoke-RestMethod `
        -Uri $Uri `
        -Method POST `
        -Headers $Headers `
        -ContentType "application/json" `
        -InFile $FilePath

    # Only save hash after successful upload
    Set-Content `
        -Path $StateFile `
        -Value $CurrentHash

    Write-Host "Calendar uploaded successfully."
    Write-Host "Supabase path: $Bucket/$DestinationFile"

    Write-Log "Calendar uploaded successfully to $Bucket/$DestinationFile."
}
catch {

    Write-Error "Supabase upload failed:"
    Write-Error $_

    Write-Log "ERROR: Supabase upload failed: $($_.Exception.Message)"

    exit 1
}