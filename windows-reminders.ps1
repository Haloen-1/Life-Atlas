param(
    [switch]$Install, [switch]$Run, [switch]$Test, [switch]$OpenJournal,
    [switch]$Remove, [switch]$ValidateOnly, [string]$ConfigPath
)
$ErrorActionPreference = 'Stop'
$homeDir = Join-Path $env:LOCALAPPDATA 'Life Atlas Reminders'
$taskName = 'Life Atlas Journal Reminder'
$appId = 'LifeAtlas.Journal'
$configFile = Join-Path $homeDir 'schedule.json'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Life Atlas Reminders.lnk'

function Read-ReminderConfig([string]$Path) {
    $c = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    if ($c.app -ne 'Life Atlas' -or $c.version -ne 1 -or !$c.reminder) { throw 'Choose an exported Life Atlas Windows schedule.' }
    $r = $c.reminder
    if ($r.openTarget -and $r.openTarget -notin @('laptop','website')) { throw 'Choose laptop app or website for the notification destination.' }
    if ($r.time -notmatch '^([01]\d|2[0-3]):[0-5]\d$' -or
        $r.frequency -notin @('day','week','month','year') -or
        $r.interval -lt 1 -or $r.interval -gt 99 -or [int]$r.interval -ne $r.interval) { throw 'Invalid reminder schedule.' }
    [void][datetime]::ParseExact($r.start,'yyyy-MM-dd',[cultureinfo]::InvariantCulture)
    if ($r.end) {
        [void][datetime]::ParseExact($r.end,'yyyy-MM-dd',[cultureinfo]::InvariantCulture)
        if ($r.end -lt $r.start) { throw 'The end date is before the start.' }
    }
    if ($r.frequency -eq 'week' -and @($r.days).Count -eq 0) { throw 'Choose reminder weekdays.' }
    foreach ($day in $r.days) { if ($day -lt 0 -or $day -gt 6 -or [int]$day -ne $day) { throw 'Invalid weekday.' } }
    $url = [uri]$c.url
    if (!$url.IsAbsoluteUri -or $url.Scheme -notin @('https','file') -or $url.UserInfo) { throw 'Only an HTTPS website or local Life Atlas page can be opened.' }
    if ($url.IsFile -and ([IO.Path]::GetFileName($url.LocalPath) -ne 'index.html' -or $url.IsUnc)) { throw 'Choose the local Life Atlas index.html page.' }
    $c.url = $url.AbsoluteUri
    return $c
}

function Resolve-JournalUrl($Config) {
    $uri = [uri]$Config.url
    if ($Config.reminder.openTarget -eq 'website') {
        if ($uri.Scheme -eq 'https') { return $uri.AbsoluteUri }
        return 'https://lifeatlas.uk/#journal'
    }
    if ($Config.reminder.openTarget -ne 'laptop') { return $uri.AbsoluteUri }
    if ($uri.IsFile -and (Test-Path -LiteralPath $uri.LocalPath -PathType Leaf)) { return $uri.AbsoluteUri }
    $shell = New-Object -ComObject WScript.Shell
    try {
        $links = @(
            (Join-Path ([Environment]::GetFolderPath('Programs')) 'Life Atlas.lnk'),
            (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Life Atlas.lnk')
        )
        foreach ($link in $links) {
            if (!(Test-Path -LiteralPath $link)) { continue }
            $target = $shell.CreateShortcut($link).TargetPath
            if (!$target) { continue }
            $page = Join-Path (Split-Path $target) 'index.html'
            if (Test-Path -LiteralPath $page -PathType Leaf) { return ([uri]$page).AbsoluteUri + '#journal' }
        }
    } finally { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) }
    throw 'Life Atlas laptop app was not found. Export from the local app, or select Website in Workspace > Permissions.'
}

function Test-ReminderDay($Reminder, [datetime]$Day) {
    $first = [datetime]::ParseExact($Reminder.start,'yyyy-MM-dd',[cultureinfo]::InvariantCulture)
    $key = $Day.ToString('yyyy-MM-dd')
    if ($key -lt $Reminder.start -or ($Reminder.end -and $key -gt $Reminder.end)) { return $false }
    $days = [int]($Day.Date - $first.Date).TotalDays
    switch ($Reminder.frequency) {
        'day' { return ($days % $Reminder.interval -eq 0) }
        'week' { return ([math]::Floor(($days + [int]$first.DayOfWeek)/7) % $Reminder.interval -eq 0 -and [int]$Day.DayOfWeek -in $Reminder.days) }
        default {
            $months = ($Day.Year-$first.Year)*12 + $Day.Month-$first.Month
            $period = [int]$Reminder.interval
            if ($Reminder.frequency -eq 'year') { $period *= 12 }
            return ($Day.Day -eq $first.Day -and $months % $period -eq 0)
        }
    }
}

function Show-JournalToast([bool]$IsTest) {
    [void][Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]
    [void][Windows.UI.Notifications.ToastNotifier,Windows.UI.Notifications,ContentType=WindowsRuntime]
    [void][Windows.UI.Notifications.ToastNotification,Windows.UI.Notifications,ContentType=WindowsRuntime]
    [void][Windows.UI.Notifications.NotificationSetting,Windows.UI.Notifications,ContentType=WindowsRuntime]
    [void][Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]
    $image = [Security.SecurityElement]::Escape(([uri](Join-Path $homeDir 'life-atlas.png')).AbsoluteUri)
    $body = if ($IsTest) { 'Your journal reminder is ready.' } else { 'A moment for your journal.' }
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml(@"
<toast activationType="protocol" launch="lifeatlas-journal:open">
  <visual><binding template="ToastGeneric">
    <image placement="appLogoOverride" src="$image" hint-crop="circle"/>
    <text>Life Atlas</text><text>$body</text>
  </binding></visual>
  <actions><action content="Open journal" activationType="protocol" arguments="lifeatlas-journal:open"/></actions>
  <audio src="ms-winsoundevent:Notification.Default"/>
</toast>
"@)
    [Windows.UI.Notifications.ToastNotifier]$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
    $permission = $notifier.Setting
    if ($null -ne $permission -and $permission.ToString() -ne 'Enabled') { throw "Windows notification permission: $permission" }
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    $toast.Tag = if ($IsTest) { 'test' } else { 'journal' }
    $toast.Group = 'LifeAtlas'
    $toast.ExpirationTime = [DateTimeOffset]::Now.AddHours(12)
    $notifier.Show($toast)
}

if ($ValidateOnly) {
    $c = Read-ReminderConfig $ConfigPath
    Write-Output ('Valid Windows schedule: ' + $c.reminder.time)
    exit 0
}
if ($Remove) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath 'HKCU:\Software\Classes\lifeatlas-journal' -Recurse -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath ('HKCU:\Software\Classes\AppUserModelId\'+$appId) -Recurse -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $shortcut -ErrorAction SilentlyContinue
    Write-Output 'Windows reminders removed. Your Life Atlas data is unchanged.'
    exit 0
}
try {
    if ($Install) {
        if (!$ConfigPath) {
            Add-Type -AssemblyName System.Windows.Forms
            $picker = New-Object Windows.Forms.OpenFileDialog
            $picker.Title = 'Choose the Windows schedule exported from Life Atlas'
            $picker.Filter = 'Life Atlas Windows schedule (*.json)|*.json'
            if ($picker.ShowDialog() -ne 'OK') { exit 0 }
            $ConfigPath = $picker.FileName
        }
        $c = Read-ReminderConfig $ConfigPath
        $c.url = Resolve-JournalUrl $c
        New-Item -ItemType Directory -Path $homeDir -Force | Out-Null
        foreach ($name in @('windows-reminders.ps1','windows-toast.cs','life-atlas.png','life-atlas.ico')) {
            $source = Join-Path $PSScriptRoot $name
            $target = Join-Path $homeDir $name
            if ([IO.Path]::GetFullPath($source) -ne [IO.Path]::GetFullPath($target)) { Copy-Item -LiteralPath $source -Destination $target -Force }
        }
        if (Test-Path -LiteralPath $configFile) { Copy-Item -LiteralPath $configFile -Destination (Join-Path $homeDir 'schedule.previous.json') -Force }
        $c | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $configFile -Encoding UTF8
        Add-Type -Path (Join-Path $homeDir 'windows-toast.cs')
        $worker = Join-Path $homeDir 'windows-reminders.ps1'
        $openArgs = '-NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -OpenJournal' -f $worker
        [LifeAtlas.Shortcut]::Create($shortcut,$powershell,$openArgs,(Join-Path $homeDir 'life-atlas.ico'),$appId)
        $registration = 'HKCU:\Software\Classes\AppUserModelId\'+$appId
        New-Item -Path $registration -Force | Out-Null
        New-ItemProperty -Path $registration -Name DisplayName -Value 'Life Atlas' -Force | Out-Null
        New-ItemProperty -Path $registration -Name IconUri -Value (Join-Path $homeDir 'life-atlas.ico') -Force | Out-Null
        $protocol = 'HKCU:\Software\Classes\lifeatlas-journal'
        New-Item -Path ($protocol+'\shell\open\command') -Force | Out-Null
        Set-Item -Path $protocol -Value 'URL:Life Atlas journal'
        New-ItemProperty -Path $protocol -Name 'URL Protocol' -Value '' -Force | Out-Null
        Set-Item -Path ($protocol+'\shell\open\command') -Value ('"'+$powershell+'" '+$openArgs)
        $action = New-ScheduledTaskAction -Execute $powershell -Argument ('-NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -Run' -f $worker)
        $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
        $triggers = @(New-ScheduledTaskTrigger -Daily -At $c.reminder.time; New-ScheduledTaskTrigger -AtLogOn -User $user)
        $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Life Atlas journal reminder, even when the app is closed.' -Force | Out-Null
        if (!$c.reminder.enabled) { Disable-ScheduledTask -TaskName $taskName | Out-Null }
        else { Enable-ScheduledTask -TaskName $taskName | Out-Null }
        Write-Output 'Windows reminder installed. Use -Test to send a test; -Remove uninstalls it.'
        exit 0
    }
    $c = Read-ReminderConfig $configFile
    if ($OpenJournal) {
        $c.url = Resolve-JournalUrl $c
        $browser = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe","$env:LocalAppData\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if ($browser) { Start-Process -FilePath $browser -ArgumentList ('--app="'+$c.url+'"') }
        else { Start-Process -FilePath $c.url }
        exit 0
    }
    if ($Test) { Show-JournalToast $true; Write-Output 'Test submitted to Windows.'; exit 0 }
    if (!$Run -or !$c.reminder.enabled) { exit 0 }
    $now = Get-Date
    if (!(Test-ReminderDay $c.reminder $now)) { exit 0 }
    $due = [datetime]::ParseExact(($now.ToString('yyyy-MM-dd')+' '+$c.reminder.time),'yyyy-MM-dd HH:mm',[cultureinfo]::InvariantCulture)
    if ($now -lt $due -or ($c.reminder.catchUp -eq $false -and ($now-$due).TotalMinutes -ge 1)) { exit 0 }
    $slot = $due.ToString('yyyy-MM-ddTHH:mm')
    $sent = Join-Path $homeDir 'last-delivered.txt'
    if ((Test-Path -LiteralPath $sent) -and (Get-Content -LiteralPath $sent -Raw).Trim() -eq $slot) { exit 0 }
    Show-JournalToast $false
    Set-Content -LiteralPath $sent -Value $slot -Encoding ASCII
} catch {
    if (Test-Path -LiteralPath $homeDir) { $_.Exception.Message | Set-Content -LiteralPath (Join-Path $homeDir 'last-error.txt') }
    Write-Error $_
    exit 1
}
