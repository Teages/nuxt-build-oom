import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { finished } from 'node:stream/promises'

const FILE_COUNT = process.env.FILE_COUNT ? Number(process.env.FILE_COUNT) : 5
const TARGET_SIZE = process.env.FILE_SIZE_BYTES
  ? Number(process.env.FILE_SIZE_BYTES)
  : 12 * 1024 * 1024
const CHUNK_SIZE = 1024 * 1024
const OUTPUT_DIR = resolve('app/assets/generated')

// Generates a JS module: export default `<random base64 content>`
async function generateFile(outputPath, size) {
  const stream = createWriteStream(outputPath, { encoding: 'utf8' })

  // Write the opening of the template literal
  stream.write('export default `')

  let written = 0
  while (written < size) {
    const currentChunkSize = Math.min(CHUNK_SIZE, size - written)
    const sourceSize = Math.ceil((currentChunkSize * 3) / 4)
    // Escape backticks and backslashes so the template literal stays valid
    const chunk = randomBytes(sourceSize)
      .toString('base64')
      .slice(0, currentChunkSize)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')

    if (!stream.write(chunk)) {
      await new Promise(resolveDrain => stream.once('drain', resolveDrain))
    }

    written += currentChunkSize
  }

  stream.write('`\n')
  stream.end()
  await finished(stream)
  return written
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const perFileSize = Math.ceil(TARGET_SIZE / FILE_COUNT)

  for (let i = 1; i <= FILE_COUNT; i++) {
    const fileSize = i < FILE_COUNT ? perFileSize : TARGET_SIZE - perFileSize * (FILE_COUNT - 1)
    const outputPath = FILE_COUNT === 1
      ? resolve(OUTPUT_DIR, 'random.js')
      : resolve(OUTPUT_DIR, `random-part-${i}.js`)
    const written = await generateFile(outputPath, fileSize)
    console.log(`Generated: ${outputPath} (${written} bytes)`)
  }
}

main().catch((error) => {
  console.error('Failed to generate random file:', error)
  process.exitCode = 1
})
