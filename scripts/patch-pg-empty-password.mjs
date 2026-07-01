/**
 * Patches node-pg to support empty-password local Postgres (SCRAM with no password).
 * Re-applied automatically after npm install.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

const connectionParamsPath = join(root, 'node_modules/pg/lib/connection-parameters.js');
const saslPath = join(root, 'node_modules/pg/lib/crypto/sasl.js');

if (!existsSync(connectionParamsPath) || !existsSync(saslPath)) {
  console.log('[patch-pg] pg not installed, skipping');
  process.exit(0);
}

let conn = readFileSync(connectionParamsPath, 'utf8');
const connOld = `  if (config[key]) {
    return config[key]
  }`;
const connNew = `  if (config[key] !== undefined && config[key] !== null) {
    return config[key]
  }`;
if (conn.includes(connOld)) {
  conn = conn.replace(connOld, connNew);
  writeFileSync(connectionParamsPath, conn);
  console.log('[patch-pg] Patched connection-parameters.js for empty password support');
}

let sasl = readFileSync(saslPath, 'utf8');
const saslBlock = `  if (password === '') {
    throw new Error('SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string')
  }`;
if (sasl.includes(saslBlock)) {
  sasl = sasl.replace(saslBlock + '\n', '');
  writeFileSync(saslPath, sasl);
  console.log('[patch-pg] Patched sasl.js for empty password support');
}
