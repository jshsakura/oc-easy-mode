// Builds the extension, packages it, assembles the site exactly as GitHub Pages
// will, and serves the result — so the download button can be pressed and the
// zip it hands out actually installed.
//
// This is not a preview of the page. It is the page, with a real package behind
// the button, because the two things that break an install are both invisible
// from a preview: a zip whose contents are not what the build produced, and a
// button whose address is right on the deployed site and wrong everywhere else.
//
//   npm run site        → http://localhost:4173

import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { createReadStream, cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { createRequire } from 'node:module'

const root = dirname(import.meta.dirname)
const out = join(root, '_site')
const require = createRequire(import.meta.url)
const { version } = require(join(root, 'package.json'))

// The package file is named in ASCII even though the product is not. A Korean
// filename survives a local download and then turns into percent-encoded noise
// in a URL, an install dialog and a bug report. The name people read is in the
// page; the name the file carries is for machines.
const SLUG = 'renewtube'

const PORT = Number(process.env.PORT ?? 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} → ${result.status ?? result.error}`)
  }
}

// ——— assemble ————————————————————————————————————————————————

run(process.execPath, ['scripts/build.mjs'])

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'download'), { recursive: true })
cpSync(join(root, 'site'), out, { recursive: true })

// The version rides in the filename, the same as on a release. A browser that
// cached the previous zip and hands the installer a stale file fails with the
// same one-line error a bad package does — indistinguishable, and the version
// in the name is what separates them.
const zipName = `${SLUG}-${version}.zip`
// Zipped from inside dist/, so the archive's root is the extension itself. A
// zip whose top level is a `dist` folder loads as an extension with no
// manifest, and the browser's error for that names neither cause nor fix.
run('zip', ['-qr', join(out, 'download', zipName), '.'], join(root, 'dist'))

const size = statSync(join(out, 'download', zipName)).size

// What the page reads to address its own download button. Written here and by
// the Pages workflow alike, so the button works the same in both places and
// never depends on reaching the GitHub API.
writeFileSync(
  join(out, 'download', 'index.json'),
  JSON.stringify({ name: zipName, size, version }, null, 2) + '\n',
)

// ——— serve ———————————————————————————————————————————————————

createServer((req, res) => {
  // `normalize` after stripping the query, and a dot-dot check, so a request
  // cannot walk out of _site.
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]))
  if (path.includes('..')) {
    res.writeHead(400).end('no')
    return
  }

  let file = join(out, path)
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404')
    return
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    // Nothing here is cached: the whole purpose is to test the file that was
    // just built, and a cached zip would defeat the exercise.
    'Cache-Control': 'no-store',
  })
  createReadStream(file).pipe(res)
}).listen(PORT, () => {
  console.log(`\n  RenewTube v${version}`)
  console.log(`  http://localhost:${PORT}/`)
  console.log(`  download/${zipName} — ${(size / 1024).toFixed(0)}KB\n`)
})
