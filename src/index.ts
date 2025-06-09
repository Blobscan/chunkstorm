import { Bee } from '@ethersphere/bee-js'
import { AsyncQueue, Binary, Chunk, MerkleTree } from 'cafe-utility'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createServer, Server } from 'http'
import createKeccakHash from 'keccak'
import { Stamper } from './stamper'
import { getConfig } from './config'

Chunk.hashFunction = (data: Uint8Array): Uint8Array => {
    return createKeccakHash('keccak256').update(Buffer.from(data)).digest()
}

(async () => {
    const { target, batchId: batchIdString, port, privateKey } = await getConfig();
    const bee = new Bee(target);
    const path = `${batchIdString}.bin`;
    const batchId = Binary.hexToUint8Array(batchIdString)
    const stamper = existsSync(path)
        ? Stamper.fromState(privateKey, batchId, new Uint32Array(readFileSync(path)))
        : Stamper.fromBlank(privateKey, batchId);
    let stampings = 0;

    const server: Server = createServer((request, response) => {
        const before = Date.now()
        const chunks: Buffer[] = []
        
        request.on('data', chunk => chunks.push(chunk))
        
        request.on('end', async () => {
            try {
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
                const reference = await tree.finalize()
                await queue.drain()

                const formattedReference = Array.from(reference.hash())
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('');

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({
                    reference: formattedReference,   
                }));
                
                console.log(`Processed data in ${Date.now() - before}ms, Stampings: ${stampings}, Reference: ${formattedReference}`);
                writeFileSync(path, stamper.getState())
            } catch (error) {
                console.error('Error processing request:', error);
                response.writeHead(500, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'Internal server error' }));
            }
        })
        
        request.on('error', (error) => {
            console.error('Request error:', error);
            response.writeHead(400, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Bad request' }));
        })
    })
    
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    })
    
    server.on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    })
})().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
});
