import { Bee } from '@ethersphere/bee-js'
import { AsyncQueue, Binary, Chunk, MerkleTree } from 'cafe-utility'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createServer, Server } from 'http'
import createKeccakHash from 'keccak'
import { Stamper } from './stamper'
import { getConfig } from './config'
import logger from './logger'

Chunk.hashFunction = (data: Uint8Array): Uint8Array => {
    return createKeccakHash('keccak256').update(Buffer.from(data)).digest()
}

(async () => {
    const { target, batchId: batchIdString, port, privateKey } = await getConfig();
    logger.info({ target, port, batchId: batchIdString }, 'Starting app with configuration');
    const bee = new Bee(target);
    const path = `${batchIdString}.bin`;
    const batchId = Binary.hexToUint8Array(batchIdString)
    const stamper = existsSync(path)
        ? Stamper.fromState(privateKey, batchId, new Uint32Array(readFileSync(path)))
        : Stamper.fromBlank(privateKey, batchId);
    let stampings = 0;

    const server: Server = createServer((request, response) => {
        const requestStart = Date.now()
        const chunks: Buffer[] = []
        
        logger.info({
            method: request.method,
            url: request.url,
        }, 'Incoming request');
        
        request.on('data', chunk => chunks.push(chunk))
        
        request.on('end', async () => {
            try {
                const queue = new AsyncQueue(64, 64)
                const data = Buffer.concat(chunks)
                let chunkCount = 0
                
                const tree = new MerkleTree(async chunk => {
                    await queue.enqueue(async () => {
                        const startStamp = Date.now()
                        const envelope = stamper.stamp(chunk)
                        await bee.uploadChunk(envelope, chunk.build())
                        chunkCount++
                        stampings++
                        
                        logger.debug({
                            chunkIndex: chunkCount,
                            stampTime: Date.now() - startStamp
                        }, 'Chunk stamped and uploaded')
                    })
                })
                
                await tree.append(data)
                const reference = await tree.finalize()
                await queue.drain()

                const formattedReference = Array.from(reference.hash())
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('')

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({
                    reference: formattedReference,   
                }));
                
                const processingTimeMs = Date.now() - requestStart
                logger.info({
                    processingTimeMs,
                    stampings,
                    chunksProcessed: chunkCount,
                    reference: formattedReference,
                }, 'Request completed successfully');
                
                writeFileSync(path, stamper.getState())
            } catch (error) {
                const processingTimeMs = Date.now() - requestStart
                logger.error({
                    processingTimeMs,
                    err: error,
                    stampings
                }, 'Error processing request');
                response.writeHead(500, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'Internal server error' }));
            }
        })
        
        request.on('error', (error) => {
            logger.error({
                err: error,
                processingTimeMs: Date.now() - requestStart
            }, 'Request error');
            response.writeHead(400, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Bad request' }));
        })
    })
    
    server.listen(port, () => {
        logger.info({
            port,
            target,
            batchId: batchIdString,
            startupTime: new Date(Date.now()).toISOString()  
        }, 'Server started successfully')
    })
    
    server.on('error', (error) => {
        logger.error({ err: error }, 'Server error');
        process.exit(1);
    })
})().catch(error => {
    logger.error({ err: error }, 'Application error');
    process.exit(1);
});
