$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$everwickNode = Get-Command node -ErrorAction SilentlyContinue
if ($everwickNode -and [int]((& $everwickNode.Source -p 'process.versions.node.split(".")[0]')) -ge 24) { & $everwickNode.Source --env-file-if-exists=.env server/index.mjs }
else {
    $everwickBundledNode = (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe')
    if (-not (Test-Path -LiteralPath $everwickBundledNode)) { throw 'Install Node.js 24 or newer, then run this script again.' }
    & $everwickBundledNode --env-file-if-exists=.env server/index.mjs
}
