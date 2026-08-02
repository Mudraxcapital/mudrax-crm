# Ensures JAVA_HOME is available for Gradle, then runs expo run:android.
# Cursor/cmd windows opened before JDK install often miss user env vars.

$ErrorActionPreference = "Stop"

function Find-JdkHome {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    return $env:JAVA_HOME.TrimEnd("\")
  }

  $userHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
  if ($userHome -and (Test-Path (Join-Path $userHome "bin\java.exe"))) {
    return $userHome.TrimEnd("\")
  }

  $machineHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
  if ($machineHome -and (Test-Path (Join-Path $machineHome "bin\java.exe"))) {
    return $machineHome.TrimEnd("\")
  }

  $candidates = @(
    "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot",
    "C:\Program Files\Microsoft\jdk-17*"
  )
  foreach ($pattern in $candidates) {
    $matches = Get-Item $pattern -ErrorAction SilentlyContinue
    foreach ($match in $matches) {
      if (Test-Path (Join-Path $match.FullName "bin\java.exe")) {
        return $match.FullName
      }
    }
  }

  $where = Get-Command java -ErrorAction SilentlyContinue
  if ($where) {
    return (Split-Path (Split-Path $where.Source -Parent) -Parent)
  }

  return $null
}

$jdk = Find-JdkHome
if (-not $jdk) {
  Write-Error @"
JAVA_HOME is not set and no JDK was found.
Install Microsoft OpenJDK 17, then reopen the terminal:
  winget install --id Microsoft.OpenJDK.17 -e
"@
}

$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"

if (-not $env:ANDROID_HOME) {
  $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path $sdk) {
    $env:ANDROID_HOME = $sdk
  }
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
& java -version
Set-Location (Split-Path $PSScriptRoot -Parent)
npx expo run:android @args
