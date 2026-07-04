import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir);

for (const file of files) {
    if (file.endsWith('.sql')) {
        const filePath = path.join(migrationsDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // Remove extension creation
        content = content.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/ig, '-- uuid-ossp extension removed');

        // Replace uuid_generate_v4() with gen_random_uuid()
        content = content.replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
}
