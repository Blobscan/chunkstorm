import { Bee } from '@ethersphere/bee-js'
import { AsyncQueue, Binary, Chunk, MerkleTree } from 'cafe-utility'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createServer, Server } from 'http'
import createKeccakHash from 'keccak'
import { Stamper } from './stamper'
import { getConfig } from './config'
import { log, error } from './logger'

process.on('uncaughtException', (err: unknown) => {
    error({ err }, 'Uncaught Exception');
});

process.on('unhandledRejection', (reason: unknown) => {
    error({ err: reason }, 'Unhandled Rejection');
});

Chunk.hashFunction = (data: Uint8Array): Uint8Array => {
    return createKeccakHash('keccak256').update(Buffer.from(data)).digest()
}

(async () => {
    const { target, batchId: batchIdString, port, privateKey } = await getConfig();
    log({ target, port, batchId: batchIdString }, 'Configuration');
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
        
        log({
            method: request.method,
            url: request.url,
        }, 'Incoming request');
        
        request.on('data', chunk => chunks.push(chunk))
        
        request.on('end', async () => {
            try {
                const errors: any[] = [];
                const queue = new AsyncQueue(64, 64)
                const data = Buffer.concat(chunks)
                
                const tree = new MerkleTree(async chunk => {
                    await queue.enqueue(async () => {
                        try {
                            const envelope = stamper.stamp(chunk);
                            await bee.uploadChunk(envelope, chunk.build());
                            stampings++;
                        } catch (err) {
                            errors.push(err);
                        }
                    })
                })
                
                await tree.append(data)
                const reference = await tree.finalize()
                await queue.drain();
                
                if (errors.length > 0) {
                    throw errors[0];
                }

                const formattedReference = Array.from(reference.hash())
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('')

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({
                    reference: formattedReference,   
                }));
                
                const processingTimeMs = Date.now() - requestStart
                log({
                    processingTimeMs,
                    stampings,
                    reference: formattedReference,
                }, 'Request completed successfully');
                
                writeFileSync(path, stamper.getState())
            } catch (err: unknown) {
                const processingTimeMs = Date.now() - requestStart;
                error({
                    processingTimeMs,
                    err,
                    stampings
                }, 'Error processing request');
                response.writeHead(500, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'Internal server error' }));
            }
        })
        
        request.on('error', (err: Error) => {
            error({
                err,
                processingTimeMs: Date.now() - requestStart
            }, 'Request error');
            response.writeHead(400, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Bad request' }));
        })
    })
    
    server.listen(port, () => {
        log({
            port,
            target,
            startupTime: new Date(Date.now()).toISOString()  
        }, 'Server started successfully')
    })
    
    server.on('error', (err: Error) => {
        error({ err }, 'Server error');
    })
})().catch((err: unknown) => {
    error({ err }, 'Application error');
    process.exit(1);
});
