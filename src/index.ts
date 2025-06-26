import { Bee, GlobalPostageBatch } from '@ethersphere/bee-js'
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
    const { beeEndpoint, batchId: batchIdString, port, privateKey, stamperPath } = await getConfig();
    log({ beeEndpoint, port, batchId: batchIdString }, 'Configuration');
    const bee = new Bee(beeEndpoint);

    const batchId = Binary.hexToUint8Array(batchIdString)
    const batches = await bee.getAllGlobalPostageBatch();
    const batch = batches.find((batch: GlobalPostageBatch) => batch.batchID.equals(batchId));
    if (!batch) {
        throw new Error(`No batch found with ID ${batchIdString}`);
    }
    const { depth } = batch;

    const stamper = existsSync(stamperPath)
        ? Stamper.fromState(privateKey, batchId, new Uint32Array(readFileSync(stamperPath)), depth)
        : Stamper.fromBlank(privateKey, batchId, depth);
    let stampings = 0;

    const server: Server = createServer((request, response) => {
        const requestStart = Date.now()
        const chunks: Buffer[] = []

        log({
            method: request.method,
            url: request.url,
        }, 'Incoming request');
        
        if (request.url !== '/upload' || request.method !== 'POST') {
            response.writeHead(404, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Not found' }));
            return;
        }

        request.on('data', chunk => chunks.push(chunk))

        request.on('end', async () => {
            try {
                const queue = new AsyncQueue(64, 64)
                const data = Buffer.concat(chunks)

                const tree = new MerkleTree(async chunk => {
                    await queue.enqueue(async () => {
                            const envelope = stamper.stamp(chunk);
                            await bee.uploadChunk(envelope, chunk.build());
                            stampings++;
                    })
                })

                await tree.append(data)
                const reference = await tree.finalize()
                await queue.drain();

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

                writeFileSync(stamperPath, stamper.getState())
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
            beeEndpoint,
            startupTime: new Date(Date.now()).toISOString()
        }, 'Server started successfully')
    })

    server.on('error', (err: Error) => {
        error({ err }, 'Server error');
        process.exit(1);
    })
})().catch((err: unknown) => {
    error({ err }, 'Application error');
    process.exit(1);
});
