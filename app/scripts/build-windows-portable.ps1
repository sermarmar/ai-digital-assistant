# Compila la app de Windows en Release y deja la carpeta portable en app\dist\AsistenteReuniones.
# Esa carpeta se copia a cualquier PC con Windows 10/11 x64 y se abre con MeetingAssistant.exe, sin instalar nada.
# Necesita Visual Studio 2026 con "Desarrollo para el escritorio con C++" y el Windows SDK indicado.
param(
  [string]$WindowsSdkVersion = '10.0.26100.0'
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

npx react-native autolink-windows --no-telemetry
if ($LASTEXITCODE) { throw 'Ha fallado el enlace de los módulos nativos (autolink-windows)' }

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$msbuild = & $vswhere -latest -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
if (-not $msbuild) { throw 'No se encuentra MSBuild. ¿Está instalado Visual Studio con el desarrollo de C++?' }

# React Native Windows pide por defecto el SDK 10.0.22621; se fuerza el que haya instalado
& $msbuild windows/MeetingAssistant.sln /t:MeetingAssistant /p:Configuration=Release /p:Platform=x64 `
  /p:WindowsTargetPlatformVersion=$WindowsSdkVersion /restore /p:RestorePackagesConfig=true /m /bl:build.binlog
if ($LASTEXITCODE) { throw 'Ha fallado la compilación (el detalle está en app\build.binlog)' }

$exe = Get-ChildItem -Path windows -Recurse -Filter MeetingAssistant.exe |
  Where-Object { $_.FullName -match '\\Release\\' -and $_.FullName -notmatch '\\obj\\' } |
  Select-Object -First 1
if (-not $exe) { throw 'No se ha encontrado MeetingAssistant.exe' }

$portable = Join-Path (Get-Location) 'dist\AsistenteReuniones'
if (Test-Path $portable) { Remove-Item $portable -Recurse -Force }
Copy-Item $exe.DirectoryName $portable -Recurse
# Lo que solo sirve para compilar o depurar no hace falta para ejecutar
Get-ChildItem $portable -Recurse -Include *.pdb, *.lib, *.exp, *.ilk | Remove-Item

# Runtime de Visual C++ junto al .exe, por si el equipo no lo tiene instalado
$crt = & $vswhere -latest -find 'VC\Redist\MSVC\*\x64\Microsoft.VC*.CRT' | Select-Object -Last 1
Copy-Item "$crt\*.dll" $portable

Write-Host "Listo: $portable"
