This is a proof of concept for a simple Node.js server that splits, stamps and distributes chunks to multiple Bee nodes.

## Setup

Run `npm install`.

Run `npm run build`.

## Environment Variables Configuration

Create a `.env` file in the project root directory based on `.env.example`.

### Required Variables

- **`BATCH_ID`**: The Ethereum batch ID for stamping chunks (hexadecimal string)
  - Format: `0x` followed by 64 hexadecimal characters

### Authentication (One of these options is required)

- **Option 1: Private Key**
  - **`PRIVATE_KEY`**: Your Ethereum private key for signing stamps

- **Option 2: Keystore File**
  - **`KEYSTORE_PATH`**: Path to your Ethereum keystore file
  - **`KEYSTORE_PASSWORD`**: Password to decrypt the keystore file

### Optional Variables

- **`BEE_ENDPOINT`**: URL of the Bee node API
  - Default: `http://localhost:1633`

- **`PORT`**: Port number for the Chunkstorm server
  - Default: `3050`

- **`STAMPERSTORE_PATH`**: Directory path to store stamper binary files
  - Default: `.` (current directory)

## Use

Start the server with `node dist`.

Run the benchmark with `node dist/perf.js`.

## Info

The benchmark uploads 45 randomly generated 128KB files to the server. It should finish in less than 12 seconds.

The current stamper in Bee-JS finished in 40301ms.

This was brought down to 21467ms by switching to an optimized stamper.

Another 2.5X speedup could be achieved by a faster secp256k1 signature implementation.
