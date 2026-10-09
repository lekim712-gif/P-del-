import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, DB_PATH } from '../src/lib/db';
import { seedDatabase } from '../src/lib/seed';

const t0 = Date.now();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Se vacía la base en sitio (sin borrar el archivo) para que `npm run dev` pueda seguir
// funcionando mientras se resetean los datos.
const d = openDatabase(DB_PATH);
d.exec('PRAGMA foreign_keys = OFF');
const tablas = d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
for (const t of tablas) d.exec(`DROP TABLE IF EXISTS "${t.name}"`);
d.exec('PRAGMA foreign_keys = ON');

const resumen = seedDatabase(d, new Date());
d.close();
console.log(`Base de datos creada en ${DB_PATH} (${Date.now() - t0} ms)`);
console.log(resumen);
