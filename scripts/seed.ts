import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, DB_PATH } from '../src/lib/db';
import { seedDatabase } from '../src/lib/seed';

const t0 = Date.now();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
for (const ext of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + ext, { force: true });

const d = openDatabase(DB_PATH);
const resumen = seedDatabase(d, new Date());
d.close();
console.log(`Base de datos creada en ${DB_PATH} (${Date.now() - t0} ms)`);
console.log(resumen);
