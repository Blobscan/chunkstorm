import { Bee } from '@ethersphere/bee-js'
import { AsyncQueue, Binary, Chunk, MerkleTree } from 'cafe-utility'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createServer } from 'http'
import createKeccakHash from 'keccak'
import { Stamper } from './stamper'

const privateKey = 0x1234567812345678123456781234567812345678123456781234567812345678n
const batchIdString = '0x1234567812345678123456781234567812345678123456781234567812345678'
const depth = 17
const target = 'http://localhost:1633'

Chunk.hashFunction = (data: Uint8Array): Uint8Array => {
    return createKeccakHash('keccak256').update(Buffer.from(data)).digest()
}

const bee = new Bee(target)
const batchId = Binary.hexToUint8Array(batchIdString)
const path = `${batchIdString}.bin`

const stamper = existsSync(path)
    ? Stamper.fromState(privateKey, batchId, new Uint32Array(readFileSync(path)), depth)
    : Stamper.fromBlank(privateKey, batchId, depth)

let stampings = 0

const server = createServer((request, response) => {
    const before = Date.now()
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(chunk))
    request.on('end', async () => {
        const queue = new AsyncQueue(64, 64)
        const data = Buffer.concat(chunks)
        const tree = new MerkleTree(async chunk => {
            await queue.enqueue(async () => {
                const envelope = stamper.stamp(chunk)
                await bee.uploadChunk(envelope, chunk.build())
                stampings++
            })
        })
        await tree.append(data)
        await tree.finalize()
        await queue.drain()
        response.write(`Time taken: ${Date.now() - before}ms, Stampings: ${stampings}`)
        response.end()
        writeFileSync(path, stamper.getState())
    })
})
server.listen(3000)
