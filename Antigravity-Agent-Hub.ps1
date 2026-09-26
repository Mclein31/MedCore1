# Antigravity Agent Hub Launcher
$Host.UI.RawUI.WindowTitle = "Antigravity Agent Hub"
Set-Location "C:\Users\JEREIMU\Documents\Projects\MedCore1"

function Show-Menu {
    Clear-Host
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host "                    ANTIGRAVITY AGENT HUB                          " -ForegroundColor Yellow
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host "Machine:   $($env:COMPUTERNAME) (User: $($env:USERNAME))" -ForegroundColor Gray
    Write-Host "Workspace: $(Get-Location)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Active Custom Agents:" -ForegroundColor Green
    Write-Host "  [1] Default Pair Programmer  - Antigravity CLI" -ForegroundColor White
    Write-Host "  [2] code-reviewer            - Review code, bugs & security" -ForegroundColor White
    Write-Host "  [3] project-brain-keeper     - Maintains .brain & Obsidian" -ForegroundColor White
    Write-Host "  [4] project-manager          - Coordinates work & architecture" -ForegroundColor White
    Write-Host "  [5] prompt-maker             - Prompt engineering specialist" -ForegroundColor White
    Write-Host "  [6] researcher               - Technical, API & library research" -ForegroundColor White
    Write-Host ""
    Write-Host "CLI Quick Tips:" -ForegroundColor DarkYellow
    Write-Host "  - Inside any session, type /agents to switch agents" -ForegroundColor DarkGray
    Write-Host "  - Inside any session, type /help to view all slash commands" -ForegroundColor DarkGray
    Write-Host "  - To exit any session, type /exit" -ForegroundColor DarkGray
    Write-Host "===================================================================" -ForegroundColor Cyan
}

while ($true) {
    Show-Menu
    $choice = Read-Host "Select agent to launch [1-6, default=1]"
    $agy = "C:\Users\JEREIMU\AppData\Local\agy\bin\agy.exe"
    
    switch ($choice) {
        "2" { & $agy --agent code-reviewer }
        "3" { & $agy --agent project-brain-keeper }
        "4" { & $agy --agent project-manager }
        "5" { & $agy --agent prompt-maker }
        "6" { & $agy --agent researcher }
        default { & $agy }
    }
    
    Write-Host "`nCLI session finished." -ForegroundColor Yellow
    $null = Read-Host "Press Enter to return to menu, or Ctrl+C to close..."
}
