$file = "c:\Users\Administrator\nexalms\src\lib\pdf.ts"
$content = Get-Content $file -Raw

# Replace the CSV download function
$find = '// CSV export helper
export function downloadCsv(headers: string[], rows: string[][], fileName: string) {
    const escape = (s: string) => `"${String(s || "").replace(/"/g, '""')}"`;
    const csvContent = [
        headers.map(escape).join(","),
        ...rows.map(row => row.map(escape).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}'

$replace = '// CSV export helper - using window.open like timetable
export function downloadCsv(headers: string[], rows: string[][], fileName: string) {
    const escape = (s: string) => `"${String(s || "").replace(/"/g, '""')}"`;
    const csvContent = [
        headers.map(escape).join(","),
        ...rows.map(row => row.map(escape).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
        URL.revokeObjectURL(url);
        throw new Error("Pop-up blocked. Allow pop-ups to download the CSV.");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}'

$content = $content -replace [regex]::Escape($find), $replace
$content | Set-Content $file -NoNewline -Encoding UTF8
Write-Host "Fixed!"
