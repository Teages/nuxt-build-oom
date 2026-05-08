import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { finished } from 'node:stream/promises'

const TARGET_SIZE = process.env.FILE_SIZE_BYTES
  ? Number(process.env.FILE_SIZE_BYTES)
  : 10 * 1024 * 1024
const CHUNK_SIZE = 1024 * 1024
const outputPath = resolve('app/assets/generated/random-100m.txt')

async function generateRandomTextFile() {
  await mkdir(dirname(outputPath), { recursive: true })

  const stream = createWriteStream(outputPath, { encoding: 'utf8' })
  let written = 0

  while (written < TARGET_SIZE) {
    const currentChunkSize = Math.min(CHUNK_SIZE, TARGET_SIZE - written)
    const sourceSize = Math.ceil((currentChunkSize * 3) / 4)
    const chunk = randomBytes(sourceSize).toString('base64').slice(0, currentChunkSize)

    if (!stream.write(chunk)) {
      await new Promise(resolveDrain => stream.once('drain', resolveDrain))
    }

    written += currentChunkSize
  }

  stream.end()
  await finished(stream)

  // Keep postinstall logs concise while still exposing final size for verification.
  console.log(`Generated random file: ${outputPath} (${written} bytes)`)
}

generateRandomTextFile().catch((error) => {
  console.error('Failed to generate random file:', error)
  process.exitCode = 1
})
