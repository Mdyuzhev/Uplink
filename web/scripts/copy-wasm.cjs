// Копирует WASM из node_modules в public/ перед сборкой.
// Запускается автоматически через npm prebuild.
const fs = require('fs');
const path = require('path');

const wasmFile = 'matrix_sdk_crypto_wasm_bg.wasm';
const pkgPath = path.join('@matrix-org', 'matrix-sdk-crypto-wasm', 'pkg', wasmFile);

// Ищем в web/node_modules и в корневом node_modules (workspace hoisting)
const candidates = [
    path.join(__dirname, '..', 'node_modules', pkgPath),
    path.join(__dirname, '..', '..', 'node_modules', pkgPath),
];

const src = candidates.find(p => fs.existsSync(p));

if (src) {
    const destDir = path.join(__dirname, '..', 'public');
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, path.join(destDir, wasmFile));
    console.log('WASM copied to public/');
} else {
    console.log('WASM source not found, skipping (Docker will copy it)');
}
