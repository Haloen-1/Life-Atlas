$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot
$source=Join-Path $root 'windows-reminders.ps1'
$tokens=$null
$errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($name in @('Read-ReminderConfig','Test-ReminderDay','Resolve-JournalUrl')) {
    $function=$ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true)
    Invoke-Expression $function.Extent.Text
}
Add-Type -Path (Join-Path $root 'windows-toast.cs')
$localUrl=([uri](Join-Path $root 'index.html')).AbsoluteUri+'#journal'
$destination=[pscustomobject]@{url=$localUrl;reminder=[pscustomobject]@{openTarget='laptop'}}
if ((Resolve-JournalUrl $destination) -ne $localUrl) { throw 'Laptop destination changed.' }
$destination.reminder.openTarget='website'
if ((Resolve-JournalUrl $destination) -ne 'https://lifeatlas.uk/#journal') { throw 'Website destination failed.' }
$destination.url='https://example.com/atlas/#journal'
if ((Resolve-JournalUrl $destination) -ne $destination.url) { throw 'Hosted website URL was not preserved.' }
$r=[pscustomobject]@{time='20:30';frequency='week';interval=2;days=@(1);start='2026-10-05';end='2026-12-31';enabled=$false;catchUp=$true}
foreach($case in @(@('2026-10-05',$true),@('2026-10-12',$false),@('2026-10-19',$true),@('2027-01-11',$false))) {
    if ((Test-ReminderDay $r ([datetime]$case[0])) -ne $case[1]) { throw "Wrong recurrence: $($case[0])" }
}
$r.frequency='day';$r.interval=2;$r.start='2026-11-17'
if (!(Test-ReminderDay $r ([datetime]'2026-11-19')) -or (Test-ReminderDay $r ([datetime]'2026-11-18'))) { throw 'Daily interval failed.' }
$r.frequency='month';$r.start='2026-01-31';$r.end=''
if (Test-ReminderDay $r ([datetime]'2026-02-28')) { throw 'Monthly recurrence shifted unexpectedly.' }
$fixture=Join-Path $root 'test-artifacts/windows-reminder-test.json'
New-Item -ItemType Directory -Path (Split-Path $fixture) -Force | Out-Null
@{app='Life Atlas';version=1;url='https://lifeatlas.uk/#journal';reminder=$r} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $fixture
[void](Read-ReminderConfig $fixture)
$c=Get-Content -LiteralPath $fixture -Raw | ConvertFrom-Json
$c.url='javascript:alert(1)'
$c | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $fixture
$rejected=$false
try { [void](Read-ReminderConfig $fixture) } catch { $rejected=$true }
if (!$rejected) { throw 'Unsafe launch URL accepted.' }
'PASS: Windows schedule validation, recurrence, safe launch URL, and shortcut helper compilation.'
