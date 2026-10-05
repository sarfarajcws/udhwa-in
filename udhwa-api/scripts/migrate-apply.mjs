// Offline `prisma migrate deploy` equivalent using Prisma's Wasm schema engine.
// Only needed where Prisma's native engine binaries can't be downloaded;
// production (Render) runs `npx prisma migrate deploy`.
import fs from 'node:fs'; import path from 'node:path';
import { SchemaEngine } from '@prisma/schema-engine-wasm';
import { PrismaPg } from '@prisma/adapter-pg';
import { bindMigrationAwareSqlAdapterFactory } from '@prisma/driver-adapter-utils';
import 'dotenv/config';
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const migDir = 'prisma/migrations';
const dirs = fs.readdirSync(migDir).filter(d => fs.statSync(path.join(migDir, d)).isDirectory()).sort();
const migrationDirectories = dirs.map(d => ({ path: d, migrationFile: { path: 'migration.sql', content: { tag: 'ok', value: fs.readFileSync(path.join(migDir, d, 'migration.sql'), 'utf8') } } }));
const adapter = bindMigrationAwareSqlAdapterFactory(new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }));
const engine = await SchemaEngine.new({ datamodels: [['schema.prisma', schema]] }, () => {}, adapter);
if (process.argv.includes('--reset')) { await engine.reset({ filter: { externalTables: [], externalEnums: [] } }); console.log('Database reset.'); }
const res = await engine.applyMigrations({ migrationsList: { baseDir: migDir, lockfile: { path: 'migration_lock.toml', content: 'provider = "postgresql"' }, migrationDirectories, shadowDbInitScript: '' }, filters: { externalTables: [], externalEnums: [] } });
console.log('Applied:', res.appliedMigrationNames.length ? res.appliedMigrationNames.join(', ') : '(none — up to date)');
process.exit(0);
