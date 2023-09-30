$ErrorActionPreference = 'Stop'

$configName = "config.production.json"
if ($args.Length -gt 0) {
    $configName = $args[0]
}

Remove-Item -r out
Clear-Host
npm run compile
if (!$?) {
    exit 1
}
Clear-Host
npm run start -- $configName
