This is a proof of concept for a simple Node.js server that splits, stamps and distributes chunks to multiple Bee nodes.

## Setup

Run `npm install`.

Run `npm run build`.

## Use

Start the server with `node dist`.

Run the benchmark with `node dist/perf.js`.

## Info

The benchmark uploads 45 randomly generated 128KB files to the server. It should finish in less than 12 seconds.

The current stamper in Bee-JS finished in 40301ms.

This was brought down to 21467ms by switching to an optimized stamper.

Another 2.5X speedup could be achieved by a faster secp256k1 signature implementation.
