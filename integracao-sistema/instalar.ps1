# Instala a integracao Lav-Flex <-> site no PC da loja (Vetor Agencia).
# Uso (PowerShell, colar inteiro):
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/leonardo-carnevalli/lavflex/main/integracao-sistema/instalar.ps1))) -Chave "<SISTEMA_CHAVE>"
# Desfazer:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/leonardo-carnevalli/lavflex/main/integracao-sistema/instalar.ps1))) -Desfazer
# O que faz: acha o Lav-Flex instalado, fecha o programa, guarda copia do app.asar, aplica a integracao
# numa copia, reempacota, troca, cria a configuracao em %APPDATA%\lavflex-sistema\vetor-sync.json,
# abre o programa e confere se a integracao respondeu. Se algo falhar antes da troca, nada muda.
# Texto sem acento de proposito: o PowerShell 5.1 le arquivo sem BOM como ANSI.
param(
  [string]$Chave = "",
  [string]$Site = "https://lavflex.vetoragencia.com.br",
  [string]$SiteImpresso = "lavflexmarilia.com.br",
  [string]$Pasta = "",
  [switch]$Desfazer
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Diga($t) { Write-Host "== $t" -ForegroundColor Cyan }
function Falha($t) { Write-Host "XX $t" -ForegroundColor Red; throw $t }

# 1. Achar a pasta do programa (a que tem Lav-Flex.exe e resources\app.asar)
function Achar-Pasta {
  $cands = @(
    "$env:LOCALAPPDATA\Programs\lavflex-sistema",
    "$env:LOCALAPPDATA\Programs\Lav-Flex",
    "$env:ProgramFiles\Lav-Flex",
    "$env:ProgramFiles\lavflex-sistema",
    "${env:ProgramFiles(x86)}\Lav-Flex"
  )
  $sh = New-Object -ComObject WScript.Shell
  $lnks = @("$env:USERPROFILE\Desktop", "$env:PUBLIC\Desktop", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs", "$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:USERPROFILE\OneDrive\Desktop", "$env:USERPROFILE\OneDrive\Area de Trabalho") |
    Where-Object { $_ -and (Test-Path $_) } | ForEach-Object { Get-ChildItem $_ -Filter "*.lnk" -Recurse -ErrorAction SilentlyContinue }
  foreach ($l in $lnks) { try { $t = $sh.CreateShortcut($l.FullName).TargetPath; if ($t -match "Lav-Flex\.exe$") { $cands += (Split-Path $t) } } catch {} }
  $p = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "Lav-Flex\.exe$" } | Select-Object -First 1
  if ($p) { $cands = @((Split-Path $p.Path)) + $cands }
  foreach ($c in $cands) { if ($c -and (Test-Path (Join-Path $c "resources\app.asar")) -and (Test-Path (Join-Path $c "Lav-Flex.exe"))) { return (Resolve-Path $c).Path } }
  return $null
}
if (-not $Pasta) { $Pasta = Achar-Pasta }
if (-not $Pasta) { Falha "Nao achei o Lav-Flex instalado. Rode de novo com -Pasta ""C:\caminho\da\pasta\do\Lav-Flex"" (a pasta que tem Lav-Flex.exe)." }
$Res = Join-Path $Pasta "resources"
$Exe = Join-Path $Pasta "Lav-Flex.exe"
Diga "Lav-Flex em: $Pasta"

function Fechar-Programa {
  $ps = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($Pasta, [StringComparison]::OrdinalIgnoreCase) }
  if ($ps) {
    Diga "Fechando o Lav-Flex"
    $ps | ForEach-Object { try { $_.CloseMainWindow() | Out-Null } catch {} }
    Start-Sleep -Seconds 5
    Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($Pasta, [StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force
    Start-Sleep -Seconds 2
  }
}

# Desfazer: volta a copia mais recente
if ($Desfazer) {
  $bk = Get-ChildItem $Res -Directory -Filter "vetor-backup-*" | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $bk) { Falha "Nao achei copia vetor-backup-* em $Res" }
  Fechar-Programa
  Remove-Item (Join-Path $Res "app.asar") -Force
  Copy-Item (Join-Path $bk.FullName "app.asar") (Join-Path $Res "app.asar")
  if (Test-Path (Join-Path $Res "app.asar.unpacked")) { Remove-Item (Join-Path $Res "app.asar.unpacked") -Recurse -Force }
  if (Test-Path (Join-Path $bk.FullName "app.asar.unpacked")) { Copy-Item (Join-Path $bk.FullName "app.asar.unpacked") (Join-Path $Res "app.asar.unpacked") -Recurse }
  Diga "Voltei a copia $($bk.Name). Abrindo o Lav-Flex."
  Start-Process $Exe
  return
}

# 2. Node: usa o do PC; se nao tiver, baixa o oficial (nodejs.org) numa pasta temporaria
$Tmp = Join-Path $env:TEMP ("vetor-lavflex-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force $Tmp | Out-Null
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($node) { $NodeDir = Split-Path $node } else {
  Diga "Node nao instalado; baixando o Node oficial (nodejs.org) so para esta instalacao"
  $v = "v22.11.0"
  Invoke-WebRequest "https://nodejs.org/dist/$v/node-$v-win-x64.zip" -OutFile "$Tmp\node.zip" -UseBasicParsing
  Expand-Archive "$Tmp\node.zip" "$Tmp\node" -Force
  $NodeDir = "$Tmp\node\node-$v-win-x64"
}
$env:Path = "$NodeDir;$env:Path"
$Npx = Join-Path $NodeDir "npx.cmd"
$NodeExe = Join-Path $NodeDir "node.exe"

# 3. Arquivos da integracao (deste repositorio)
Diga "Baixando a integracao"
Invoke-WebRequest "https://github.com/leonardo-carnevalli/lavflex/archive/refs/heads/main.zip" -OutFile "$Tmp\repo.zip" -UseBasicParsing
Expand-Archive "$Tmp\repo.zip" "$Tmp\repo" -Force
$Integ = Get-ChildItem "$Tmp\repo" -Directory | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "integracao-sistema" }
if (-not (Test-Path "$Integ\aplicar.cjs")) { Falha "Download da integracao incompleto" }

# 4. Copia de seguranca (antes de qualquer mudanca)
try { [IO.File]::WriteAllText((Join-Path $Res "vetor-teste.tmp"), "x"); Remove-Item (Join-Path $Res "vetor-teste.tmp") -Force }
catch { Falha "Sem permissao para mudar $Res. Abra o PowerShell como administrador (botao direito > Executar como administrador) e cole o comando de novo." }
Fechar-Programa
$Trocado = $false
try {
$Bk = Join-Path $Res ("vetor-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force $Bk | Out-Null
Copy-Item (Join-Path $Res "app.asar") $Bk
if (Test-Path (Join-Path $Res "app.asar.unpacked")) { Copy-Item (Join-Path $Res "app.asar.unpacked") $Bk -Recurse }
Diga "Copia de seguranca em: $Bk"

# 5. Extrai, aplica e reempacota numa pasta temporaria
Diga "Extraindo o programa"
& $Npx -y "@electron/asar" extract (Join-Path $Res "app.asar") "$Tmp\app"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$Tmp\app\server.js")) { Falha "Nao consegui extrair o app.asar" }
if (Test-Path (Join-Path $Res "app.asar.unpacked")) { Copy-Item (Join-Path $Res "app.asar.unpacked\*") "$Tmp\app" -Recurse -Force }
Diga "Aplicando a integracao"
& $NodeExe "$Integ\aplicar.cjs" "$Tmp\app"
if ($LASTEXITCODE -ne 0) { Falha "aplicar.cjs falhou; o programa NAO foi alterado" }
Diga "Reempacotando"
New-Item -ItemType Directory -Force "$Tmp\saida" | Out-Null
& $Npx -y "@electron/asar" pack "$Tmp\app" "$Tmp\saida\app.asar" --unpack-dir "node_modules/sqlite3" --unpack "*.node"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$Tmp\saida\app.asar")) { Falha "Nao consegui reempacotar; o programa NAO foi alterado" }

# 6. Troca
Diga "Instalando"
Remove-Item (Join-Path $Res "app.asar") -Force
Copy-Item "$Tmp\saida\app.asar" (Join-Path $Res "app.asar")
if (Test-Path "$Tmp\saida\app.asar.unpacked") {
  if (Test-Path (Join-Path $Res "app.asar.unpacked")) { Remove-Item (Join-Path $Res "app.asar.unpacked") -Recurse -Force }
  Copy-Item "$Tmp\saida\app.asar.unpacked" (Join-Path $Res "app.asar.unpacked") -Recurse
}
$Trocado = $true
} catch {
  if (-not $Trocado -and (Test-Path (Join-Path $Res "app.asar")) -and ((Get-Item (Join-Path $Res "app.asar")).Length -gt 0)) {
    Write-Host "!! Falhou antes da troca: o programa ficou como estava. Reabrindo." -ForegroundColor Yellow
    Start-Process $Exe
  } else {
    Write-Host "!! Falhou no meio da troca. Rode o comando com -Desfazer para voltar a copia $Bk." -ForegroundColor Yellow
  }
  throw
}

# 7. Configuracao (UTF-8 sem BOM, que o Node le direito)
$Dados = Join-Path $env:APPDATA "lavflex-sistema"
New-Item -ItemType Directory -Force $Dados | Out-Null
$Cfg = Join-Path $Dados "vetor-sync.json"
$obj = [ordered]@{ site = $Site; chave = $Chave; siteImpresso = $SiteImpresso }
if (-not $Chave) { $obj.Remove("chave"); Diga "Sem -Chave: o envio ao site fica desligado; a nota ja sai com o endereco do site." }
[IO.File]::WriteAllText($Cfg, ($obj | ConvertTo-Json), (New-Object Text.UTF8Encoding $false))
Diga "Configuracao em: $Cfg"

# 8. Abre e confere
Diga "Abrindo o Lav-Flex e conferindo"
Start-Process $Exe
$ok = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try { $ok = Invoke-RestMethod "http://127.0.0.1:3000/api/vetor/status" -TimeoutSec 3; break } catch {}
}
if ($ok) {
  Diga "PRONTO. Integracao respondendo (configurado: $($ok.configurado))."
  Write-Host "   - Na lista do Atendimento aparece o botao 'Marcar pronto'."
  Write-Host "   - A nota sai com 'ACOMPANHE NO SITE', o numero do cliente e a senha."
  Write-Host "   - Para desfazer: o mesmo comando com -Desfazer no lugar de -Chave."
} else {
  Write-Host "!! O programa abriu mas a integracao nao respondeu em 60 s. Confira se o Lav-Flex abriu normal." -ForegroundColor Yellow
  Write-Host "!! Se algo estiver errado, rode o comando com -Desfazer (volta a copia $Bk)." -ForegroundColor Yellow
}
Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
