# convert-to-collection.ps1
# Wraps each _data/vessels/*.yml file in Jekyll frontmatter delimiters
# and writes it to _vessels/*.md so Jekyll treats them as a Collection.
#
# Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File convert-to-collection.ps1

$sourceDir = "_data/vessels"
$targetDir = "_vessels"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$files = Get-ChildItem -Path $sourceDir -Filter "*.yml"
Write-Host "Converting $($files.Count) vessel files to Jekyll collection..."

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

    # Remove the comment header line (# _data/vessels/...) if present
    $content = $content -replace '^# _data/vessels/.*\r?\n', ''

    # Wrap in Jekyll frontmatter delimiters
    $wrapped = "---`n" + $content.TrimStart() + "`n---`n"

    $targetFile = Join-Path $targetDir ($file.BaseName + ".md")
    [System.IO.File]::WriteAllText($targetFile, $wrapped, [System.Text.Encoding]::UTF8)
}

Write-Host "Done. $($files.Count) files written to $targetDir/"
Write-Host "You can now delete _data/vessels/ if desired (it is excluded from the Jekyll build)."
