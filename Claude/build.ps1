# =====================================================================
#  build.ps1 — genera la version de archivo unico de la aplicacion
# =====================================================================
#  Toma app/index.html, app/css/styles.css y app/js/*.js y produce
#  "Gestion_Residentes.html": un solo archivo HTML autocontenido que
#  se puede copiar a un pendrive o enviar por correo.
#
#  Uso (clic derecho > Ejecutar con PowerShell, o desde una terminal):
#      powershell -ExecutionPolicy Bypass -File build.ps1
# =====================================================================

$ErrorActionPreference = 'Stop'
$raiz    = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir  = Join-Path $raiz 'app'
$salida  = Join-Path $raiz 'Gestion_Residentes.html'

function Leer($ruta) { [System.IO.File]::ReadAllText($ruta, [System.Text.Encoding]::UTF8) }

# ---------------------------------------------------------------------
#  Paso 1: incrustar el logo como data URI en app/js/logo.js
# ---------------------------------------------------------------------
#  Para cambiar el logo, reemplace app/Logo_comunidad_SPC.png por otra
#  imagen PNG (idealmente cuadrada y con fondo transparente) y vuelva a
#  ejecutar este script.
# ---------------------------------------------------------------------

$logoPng = Join-Path $appDir 'Logo_comunidad_SPC.png'
$logoJs  = Join-Path $appDir 'js\logo.js'

if (Test-Path $logoPng) {
  Add-Type -AssemblyName System.Drawing
  $orig = [System.Drawing.Image]::FromFile($logoPng)
  try {
    # Se reduce a 256 px de lado: suficiente para pantallas de alta densidad
    # y mucho más liviano que el original.
    $lado = 256
    $dest = New-Object System.Drawing.Bitmap($lado, $lado, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb))
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($orig, 0, 0, $lado, $lado)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $dest.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $b64 = [Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose(); $dest.Dispose()

    $contenidoLogo = @"
/* ============================================================
   logo.js — logotipo del centro incrustado como data URI
   ============================================================
   ARCHIVO GENERADO AUTOMÁTICAMENTE POR build.ps1 — no editar a mano.
   Para cambiar el logo: reemplace app/Logo_comunidad_SPC.png y vuelva
   a ejecutar build.ps1.
   ============================================================ */

const LOGO = 'data:image/png;base64,$b64';
"@
    [System.IO.File]::WriteAllText($logoJs, $contenidoLogo, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("Logo incrustado: {0} KB" -f [math]::Round($b64.Length / 1KB, 1))
  } finally { $orig.Dispose() }
}
elseif (-not (Test-Path $logoJs)) {
  throw "No se encontró el logo ($logoPng) ni el archivo generado ($logoJs)."
}

$html = Leer (Join-Path $appDir 'index.html')
$css  = Leer (Join-Path $appDir 'css\styles.css')

# Orden de carga de los scripts (el mismo de index.html)
# ---------------------------------------------------------------------
#  Paso 2: sello de versión, para saber qué compilación se está usando
# ---------------------------------------------------------------------

$sello = Get-Date -Format 'dd-MM-yyyy HH:mm'
$versionJs = Join-Path $appDir 'js\version.js'
$contenidoVersion = @"
/* ============================================================
   version.js — sello de la compilación
   ============================================================
   ARCHIVO GENERADO AUTOMÁTICAMENTE POR build.ps1 — no editar.
   Se muestra en Configuración para verificar que el navegador
   está usando la versión más reciente y no una copia en caché.
   ============================================================ */

const BUILD = '$sello';
"@
[System.IO.File]::WriteAllText($versionJs, $contenidoVersion, (New-Object System.Text.UTF8Encoding($false)))

$scripts = @(
  'logo.js', 'version.js', 'utils.js', 'db.js', 'app.js', 'alertas.js', 'auth.js', 'nomina.js', 'dashboard.js', 'residentes.js',
  'progreso.js', 'conducta.js', 'salidas.js', 'llamadas.js', 'tareas.js',
  'reportes.js', 'configuracion.js'
)

$js = ($scripts | ForEach-Object {
  $ruta = Join-Path $appDir (Join-Path 'js' $_)
  "`n/* ===== $_ ===== */`n" + (Leer $ruta)
}) -join "`n"

# Reemplazar el <link> de la hoja de estilos por un bloque <style>
$html = $html -replace '(?m)^\s*<link rel="stylesheet" href="css/styles\.css">\s*$',
                       ("  <style>`n" + $css + "`n  </style>")

# Quitar todas las etiquetas <script src="js/...">
$html = [System.Text.RegularExpressions.Regex]::Replace(
          $html, '(?m)^\s*<script src="js/[^"]+"[^>]*></script>\s*\r?\n', '')

# Insertar el JavaScript combinado antes de </body>
$html = $html -replace '</body>', ("  <script>`n" + $js + "`n  </script>`n</body>")

[System.IO.File]::WriteAllText($salida, $html, (New-Object System.Text.UTF8Encoding($false)))

$kb = [math]::Round((Get-Item $salida).Length / 1KB, 1)
Write-Host "Generado: $salida ($kb KB)"
