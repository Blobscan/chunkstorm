import { BatchId, PrivateKey } from '@ethersphere/bee-js'
import { Binary, Chunk, Elliptic } from 'cafe-utility'

export class Stamper {
    signer: PrivateKey
    batchId: Uint8Array
    buckets: Uint32Array
    address: Uint8Array
    depth: number
    maxSlot: number
    immutable: boolean

    private constructor(signer: bigint, batchId: Uint8Array, buckets: Uint32Array, depth: number, immutable: boolean) {
        this.signer = new PrivateKey(Binary.numberToUint256(signer, 'BE'))
        this.batchId = batchId
        this.buckets = buckets
        this.depth = depth
        this.immutable = immutable
        this.maxSlot = 2 ** (this.depth - 16)
        const publicKey = Elliptic.privateKeyToPublicKey(signer)
        this.address = Elliptic.publicKeyToAddress(publicKey)
    }

    static fromBlank(signer: bigint, batchId: Uint8Array, depth: number, immutable: boolean) {
        return new Stamper(signer, batchId, new Uint32Array(65536), depth, immutable)
    }

    static fromState(signer: bigint, batchId: Uint8Array, buckets: Uint32Array, depth: number, immutable: boolean) {
        return new Stamper(signer, batchId, buckets, depth, immutable)
    }

    stamp(chunk: Chunk) {
        const address = chunk.hash()
        const bucket = Binary.uint16ToNumber(address, 'BE')
        const height = this.buckets[bucket]

        if (height >= this.maxSlot && this.immutable) {
            throw Error(`Batch is full: ${new BatchId(this.batchId)}`)
        }

        this.buckets[bucket]++
        const index = Binary.concatBytes(Binary.numberToUint32(bucket, 'BE'), Binary.numberToUint32(height, 'BE'))
        const timestamp = Binary.numberToUint64(BigInt(Date.now()), 'BE')
        const message = Binary.concatBytes(address, this.batchId, index, timestamp)
        const signature = this.signer.sign(message)

        return {
            batchId: new BatchId(this.batchId),
            index,
            issuer: this.address,
            signature: signature.toUint8Array(),
            timestamp
        }
    }

    getState(): Uint32Array {
        return this.buckets
    }
}
