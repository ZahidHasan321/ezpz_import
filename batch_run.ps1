$totalItems = 0
$totalErrors = 0
$totalWarnings = 0

Get-ChildItem "Che/2nd/2017/*.json" | ForEach-Object {
    Write-Host "`n=== Checking $($_.Name) ==="

    $output = node check.cjs $_.FullName 2>&1

    $output | ForEach-Object { Write-Host $_ }

    $summary = $output | Select-String '(\d+) item\(s\), (\d+) error\(s\), (\d+) warning\(s\)'

    if ($summary) {
        $totalItems += [int]$summary.Matches.Groups[1].Value
        $totalErrors += [int]$summary.Matches.Groups[2].Value
        $totalWarnings += [int]$summary.Matches.Groups[3].Value
    }
}

Write-Host "`n========================================"
Write-Host "TOTAL"
Write-Host "========================================"
Write-Host "$totalItems item(s), $totalErrors error(s), $totalWarnings warning(s)"