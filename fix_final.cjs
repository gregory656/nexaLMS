const fs = require('fs');
let content = fs.readFileSync('src/lib/pdf.ts', 'utf8');

// Fix downloadPdf
content = content.replace(
    /export function downloadPdf\(doc: jsPDF, fileName: string\) \{[\s\S]*?const win = window\.open\(url, '_blank'\);[\s\S]*?setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 60000\);[\s\S]*?\}/,
    `export function downloadPdf(doc: jsPDF, fileName: string) {
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`\${fileName}.pdf\`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}`
);

// Fix downloadCsv - remove old code and replace
content = content.replace(
    /const win = window\.open\(url, '_blank'\);[\s\S]*?if \(!win\) \{[\s\S]*?throw new Error\('Pop-up blocked'\);[\s\S]*?\}[\s\S]*?setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 60000\);/,
    `const link = document.createElement('a');
    link.href = url;
    link.download = \`\${fileName}.csv\`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);`
);

fs.writeFileSync('src/lib/pdf.ts', content);
console.log('Fixed!');
