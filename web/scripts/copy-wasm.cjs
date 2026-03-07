// Копирует WASM из node_modules в public/ перед сборкой.
// Запускается автоматически через npm prebuild.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules',
    '@matrix-org', 'matrix-sdk-crypto-wasm', 'pkg',
    'matrix_sdk_crypto_wasm_bg.wasm');

const destDir = path.join(__dirname, '..', 'public');
const dest = path.join(destDir, 'matrix_sdk_crypto_wasm_bg.wasm');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('WASM copied to public/');
