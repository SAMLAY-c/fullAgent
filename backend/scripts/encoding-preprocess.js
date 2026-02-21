/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const SHOULD_WRITE = process.argv.includes('--write');
const ROOT = path.resolve(__dirname, '../..');
const TARGET_DIRS = ['backend/src', 'frontend/public', 'tests'];
const EXT_WHITELIST = new Set(['.js', '.ts', '.tsx', '.json', '.html', '.css', '.md']);
const IGNORE_SEGMENTS = new Set(['node_modules', '.git', 'dist', 'coverage', 'test-results', 'results']);
const IGNORE_FILES = new Set([
  path.normalize('backend/src/utils/encoding.ts'),
  path.normalize('backend/scripts/encoding-preprocess.js')
]);

const MOJIBAKE_HINT = /[馃锛銆鈥]|浣犵殑|鑾峰彇|澶辫触|鐧诲綍|宸茶繛鎺ュ悗绔|鍙戦€侀/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_SEGMENTS.has(entry.name)) continue;
      walk(fullPath, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (EXT_WHITELIST.has(ext)) out.push(fullPath);
  }
  return out;
}

function likelyMojibake(segment) {
  return MOJIBAKE_HINT.test(segment);
}

function repairSegment(segment) {
  if (!likelyMojibake(segment)) return segment;
  try {
    const repaired = iconv.decode(iconv.encode(segment, 'gbk'), 'utf8');
    if (!repaired || repaired === segment) return segment;
    if (likelyMojibake(repaired)) return segment;
    return repaired;
  } catch {
    return segment;
  }
}

function repairFileContent(content) {
  return content.replace(/[^\x00-\x7F]{2,}/g, (segment) => repairSegment(segment));
}

function main() {
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  let changedCount = 0;

  for (const file of files) {
    const relativePath = path.normalize(path.relative(ROOT, file));
    if (IGNORE_FILES.has(relativePath)) continue;

    const buffer = fs.readFileSync(file);
    const original = buffer.toString('utf8');
    const repaired = repairFileContent(original);
    if (repaired !== original) {
      changedCount += 1;
      if (SHOULD_WRITE) {
        fs.writeFileSync(file, repaired, 'utf8');
        console.log(`[fixed] ${relativePath}`);
      } else {
        console.log(`[needs-fix] ${relativePath}`);
      }
    }
  }

  if (!SHOULD_WRITE && changedCount > 0) {
    console.error(`\nDetected ${changedCount} file(s) with likely mojibake. Run: npm run encoding:fix`);
    process.exit(1);
  }

  console.log(`\nEncoding preprocess complete. changed=${changedCount}, mode=${SHOULD_WRITE ? 'write' : 'check'}`);
}

main();
