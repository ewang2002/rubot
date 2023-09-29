$ErrorActionPreference = 'Stop'

Remove-Item -r out
Clear-Host
npm run compile
if (!$?) {
    exit 1
}
Clear-Host
npm run start
