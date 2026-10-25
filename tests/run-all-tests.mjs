import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function runScript(scriptRelativePath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(rootDir, scriptRelativePath);
    console.log(`\n======================================================`);
    console.log(`Running: ${scriptRelativePath}`);
    console.log(`======================================================`);
    
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(npxCmd, ['tsx', fullPath], {
      stdio: 'inherit',
      cwd: rootDir,
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptRelativePath} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('STARTING ART GALLERY LIVE COMPLETE TEST SUITE');
  try {
    await runScript('tests/unit.test.mjs');
    await runScript('tests/e2e.test.mjs');
    console.log('\n======================================================');
    console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\nTEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

main();
