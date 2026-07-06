const fs = require('fs');
let content = fs.readFileSync('src/lib/pdf.ts', 'utf8');

// Find the line with URL.revokeObjectURL(url); in the CSV function and add setTimeout before it
content = content.replace(
    '    URL.revokeObjectURL(url);\n}',
    '    setTimeout(() => URL.revokeObjectURL(url), 1000);\n}'
);

fs.writeFileSync('src/lib/pdf.ts', content);
console.log('Fixed!');
