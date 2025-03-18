import { Binary, Chunk, Elliptic } from 'cafe-utility'

export class Stamper {
    signer: bigint
    batchId: Uint8Array
    buckets: Uint32Array
    depth: number
    maxSlot: number
    address: Uint8Array

    private constructor(signer: bigint, batchId: Uint8Array, buckets: Uint32Array, depth: number) {
        this.signer = signer
        this.batchId = batchId
        this.buckets = buckets
        this.depth = depth
        this.maxSlot = 2 ** (this.depth - 16)
        const publicKey = Elliptic.privateKeyToPublicKey(signer)
        this.address = Elliptic.publicKeyToAddress(publicKey)
    }

    static fromBlank(signer: bigint, batchId: Uint8Array, depth: number) {
        return new Stamper(signer, batchId, new Uint32Array(65536), depth)
    }

    static fromState(signer: bigint, batchId: Uint8Array, buckets: Uint32Array, depth: number) {
        return new Stamper(signer, batchId, buckets, depth)
    }

    stamp(chunk: Chunk) {
        const address = chunk.hash()
        const bucket = Binary.uint16ToNumber(address, 'BE')
        const height = this.buckets[bucket]
        this.buckets[bucket]++
        const index = Binary.concatBytes(Binary.numberToUint32(bucket, 'BE'), Binary.numberToUint32(height, 'BE'))
        const timestamp = Binary.numberToUint64(BigInt(Date.now()), 'BE')
        const signature = Elliptic.signMessage(Binary.concatBytes(address, this.batchId, index, timestamp), this.signer)

        return {
            batchId: this.batchId,
            index,
            issuer: this.address,
            signature,
            timestamp
        }
    }

    getState(): Uint32Array {
        return this.buckets
    }
}
