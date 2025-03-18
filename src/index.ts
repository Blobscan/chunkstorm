import { MerkleTree } from 'cafe-utility'
import { createServer } from 'http'
import { Stamper } from './stamper'

const privateKey = 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdefn
const batchId = new Uint8Array(32)
const depth = 30

const stamper = Stamper.fromBlank(privateKey, batchId, depth)
let stampings = 0

const server = createServer((request, response) => {
    const before = Date.now()
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(chunk))
    request.on('end', async () => {
        const data = Buffer.concat(chunks)
        const tree = new MerkleTree(async chunk => {
            const envelope = stamper.stamp(chunk)
            // TODO: await bee.uploadChunk with the envelope and the chunk data
            stampings++
        })
        await tree.append(data)
        await tree.finalize()
        response.write(`Time taken: ${Date.now() - before}ms, Stampings: ${stampings}`)
        response.end()
    })
})
server.listen(3000)
