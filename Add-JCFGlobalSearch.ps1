$ErrorActionPreference = 'Stop'
$dashboard = Join-Path (Get-Location) 'pages\dashboard.html'
if (-not (Test-Path -LiteralPath $dashboard)) {
  throw "Cannot find pages\dashboard.html. Open PowerShell in C:\Users\Sammy\projects\jcf-connect and run this script again."
}
$content = Get-Content -LiteralPath $dashboard -Raw -Encoding UTF8
if ($content -match 'id="globalSearch"' -and $content -match 'function setupGlobalSearch') {
  Write-Host 'Global search is already installed. No changes were made.' -ForegroundColor Yellow
  exit 0
}
$backup = "$dashboard.before-global-search-$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item -LiteralPath $dashboard -Destination $backup

$html = @'
      <div class="global-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" id="globalSearch" placeholder="Search JCF Connect..." aria-label="Search JCF Connect sections" autocomplete="off" />
        <div id="globalSearchResults" class="global-search-results" hidden></div>
      </div>
'@
if ($content -notmatch 'id="globalSearch"') {
  $pattern = '(?m)^(\s*)<div class="topbar-right">'
  if ($content -notmatch $pattern) { throw 'Could not find the topbar-right element. No changes were applied.' }
  $content = [regex]::Replace($content, $pattern, { param($m) $html + $m.Groups[1] + '<div class="topbar-right">' }, 1)
}

$css = @'
    .global-search { position: relative; flex: 1; min-width: 180px; max-width: 360px; }
    .global-search > span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 1.25rem; pointer-events: none; }
    .global-search input { width: 100%; padding: 0.7rem 0.9rem 0.7rem 2.2rem; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); color: var(--text); outline: none; }
    .global-search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(196, 30, 58, 0.12); }
    .global-search-results { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 150; max-height: 300px; overflow-y: auto; padding: 6px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2); }
    .global-search-results[hidden] { display: none; }
    .global-search-results a { display: block; padding: 10px; color: var(--text); text-decoration: none; border-radius: 7px; font-size: 0.88rem; }
    .global-search-results a:hover, .global-search-results a:focus { background: rgba(196, 30, 58, 0.12); outline: none; }
    .global-search-results .no-results { padding: 10px; color: var(--text-muted); font-size: 0.85rem; }
    @media (max-width: 560px) { .global-search { order: 3; flex-basis: 100%; max-width: none; } }
'@
if ($content -notmatch '\.global-search\s*\{') {
  $styleEnd = '(?m)^\s*</style>'
  if ($content -notmatch $styleEnd) { throw 'Could not find the closing style tag. No changes were applied.' }
  $content = [regex]::Replace($content, $styleEnd, { param($m) $css + "`r`n" + $m.Value }, 1)
}

$js = @'
    function setupGlobalSearch() {
      var input = document.getElementById('globalSearch');
      var results = document.getElementById('globalSearchResults');
      var nav = document.querySelector('.sidebar-nav');
      if (!input || !results || !nav) return;

      var pages = Array.prototype.slice.call(nav.querySelectorAll('a.nav-item')).map(function (link) {
        return { label: link.textContent.replace(/\s+/g, ' ').trim(), href: link.getAttribute('href') };
      }).filter(function (page) { return page.label && page.href; });
      var activeIndex = -1;

      function hideResults() { results.hidden = true; activeIndex = -1; }
      function renderResults() {
        var query = input.value.trim().toLowerCase();
        results.replaceChildren();
        activeIndex = -1;
        if (!query) { hideResults(); return; }
        var matches = pages.filter(function (page) { return page.label.toLowerCase().indexOf(query) !== -1; }).slice(0, 8);
        if (!matches.length) {
          var empty = document.createElement('div');
          empty.className = 'no-results';
          empty.textContent = 'No matching sections found';
          results.appendChild(empty);
        } else {
          matches.forEach(function (page) {
            var link = document.createElement('a');
            link.href = page.href;
            link.textContent = page.label;
            link.addEventListener('click', hideResults);
            results.appendChild(link);
          });
        }
        results.hidden = false;
      }

      input.addEventListener('input', renderResults);
      input.addEventListener('keydown', function (event) {
        var links = results.querySelectorAll('a');
        if (event.key === 'Escape') { hideResults(); input.blur(); return; }
        if (event.key === 'ArrowDown' && links.length) {
          event.preventDefault(); activeIndex = (activeIndex + 1) % links.length;
          Array.prototype.forEach.call(links, function (link, index) { link.style.outline = index === activeIndex ? '2px solid var(--accent)' : ''; });
        } else if (event.key === 'ArrowUp' && links.length) {
          event.preventDefault(); activeIndex = (activeIndex - 1 + links.length) % links.length;
          Array.prototype.forEach.call(links, function (link, index) { link.style.outline = index === activeIndex ? '2px solid var(--accent)' : ''; });
        } else if (event.key === 'Enter' && links.length) {
          event.preventDefault();
          var target = activeIndex >= 0 ? links[activeIndex] : links[0];
          window.location.href = target.href;
        }
      });
      document.addEventListener('click', function (event) {
        if (!event.target.closest('.global-search')) hideResults();
      });
    }
    setupGlobalSearch();
'@
if ($content -notmatch 'function setupGlobalSearch') {
  $anchor = '(?m)^\s*loadChurchLine\(\);'
  if ($content -notmatch $anchor) { throw 'Could not find the dashboard initialization point. No changes were applied.' }
  $content = [regex]::Replace($content, $anchor, { param($m) $js + "`r`n" + $m.Value }, 1)
}
Set-Content -LiteralPath $dashboard -Value $content -Encoding UTF8
Write-Host 'Global search has been added to pages\dashboard.html.' -ForegroundColor Green
Write-Host "Backup created: $backup" -ForegroundColor Cyan
Write-Host 'Search now filters the existing sidebar sections. Type a section name and click a result, or press Enter.'
