$initialDir = (Get-Location)

try {
  mkdir .\bin -ErrorAction SilentlyContinue
  Remove-Item server/server -ErrorAction SilentlyContinue
  Remove-Item bin/server -ErrorAction SilentlyContinue
  Remove-Item bin/dist -Recurse -ErrorAction SilentlyContinue

  Set-Location .\front
  deno install
  deno task build

  Set-Location ..\server
  deno install
  deno compile `
    --target x86_64-unknown-linux-gnu `
    --no-prompt --cached-only `
    --allow-read="/home/traktor/traktor" `
    --allow-write="/home/traktor/traktor" `
    --allow-net="127.0.0.1:8888" `
    --allow-env `
    .\index.ts

  Set-Location ..
  Move-Item server/server ./bin
  Copy-Item front/dist bin -Recurse

  Write-Output "done"
}
finally {
  Set-Location $initialDir
}