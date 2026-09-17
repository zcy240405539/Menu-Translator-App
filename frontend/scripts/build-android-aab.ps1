$ErrorActionPreference = "Stop"

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workspaceRoot = (Resolve-Path (Join-Path $frontendRoot "..")).Path
$credentialsFile = Join-Path $frontendRoot "credentials.json"
if (-not (Test-Path -LiteralPath $credentialsFile)) {
  throw "Missing frontend/credentials.json"
}

$credentials = Get-Content -LiteralPath $credentialsFile -Raw | ConvertFrom-Json
$keystore = $credentials.android.keystore
$keystoreCandidate = if ([System.IO.Path]::IsPathRooted($keystore.keystorePath)) {
  $keystore.keystorePath
} else {
  Join-Path $frontendRoot $keystore.keystorePath
}
$keystoreFile = (Resolve-Path -LiteralPath $keystoreCandidate).Path
if (-not $keystore.keystorePassword -or -not $keystore.keyAlias -or -not $keystore.keyPassword) {
  throw "Android signing credentials are incomplete"
}
if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot "node_modules"))) {
  throw "Run npm.cmd ci in frontend before building"
}

$env:AIMENU_ANDROID_LOCAL_SIGNING = "1"
$env:AIMENU_KEYSTORE_PATH = $keystoreFile
$env:AIMENU_KEYSTORE_PASSWORD = $keystore.keystorePassword
$env:AIMENU_KEY_ALIAS = $keystore.keyAlias
$env:AIMENU_KEY_PASSWORD = $keystore.keyPassword
$env:NODE_ENV = "production"

Push-Location $frontendRoot
try {
  $versionJson = node -e "const app=require('./app.config.js').expo; console.log(JSON.stringify({version:app.version,code:app.android.versionCode}))"
  if ($LASTEXITCODE -ne 0) { throw "Could not read Expo app version" }
  $version = $versionJson | ConvertFrom-Json
  if (-not $version.version -or $version.code -le 0) { throw "Invalid Android version configuration" }

  npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw "Expo Android prebuild failed" }
  $gradleFile = Join-Path $frontendRoot "android/app/build.gradle"
  $gradleText = Get-Content -LiteralPath $gradleFile -Raw
  if (-not $gradleText.Contains("AIMENU_LOCAL_RELEASE_SIGNING") -or
      -not $gradleText.Contains("signingConfig signingConfigs.localRelease")) {
    throw "Local release signing was not configured in generated Android project"
  }

  Push-Location (Join-Path $frontendRoot "android")
  try {
    .\gradlew.bat :app:bundleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease failed" }
  } finally {
    Pop-Location
  }

  $sourceAab = Join-Path $frontendRoot "android/app/build/outputs/bundle/release/app-release.aab"
  if (-not (Test-Path -LiteralPath $sourceAab)) { throw "Gradle did not produce app-release.aab" }
  $releaseDir = Join-Path $workspaceRoot "release"
  New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
  $outputAab = Join-Path $releaseDir "AI-MenuLens-$($version.version)-$($version.code)-local.aab"
  if (Test-Path -LiteralPath $outputAab) { throw "Output already exists: $outputAab" }
  Copy-Item -LiteralPath $sourceAab -Destination $outputAab

  $archive = [System.IO.Compression.ZipFile]::OpenRead($outputAab)
  try {
    if ($archive.Entries.Count -eq 0) { throw "AAB is empty" }
  } finally {
    $archive.Dispose()
  }
  Get-Item -LiteralPath $outputAab | Select-Object FullName,Length
  Get-FileHash -Algorithm SHA256 -LiteralPath $outputAab | Select-Object Hash
} finally {
  Pop-Location
}
