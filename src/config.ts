import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import Web3 from 'web3';

dotenv.config();

export interface AppConfig {
  beeEndpoint: string;
  port: number;
  batchId: string;
  privateKey: bigint;
}

async function getPrivateKey(): Promise<bigint> {
  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  const privateKeyString = process.env.PRIVATE_KEY;

  if (privateKeyString) {
    return BigInt(privateKeyString);
  } else if (keystorePath && keystorePassword) {
    if (!existsSync(keystorePath)) {
      throw new Error(`Keystore file not found: ${keystorePath}`);
    }
    const web3 = new Web3();
    const keystore = JSON.parse(readFileSync(keystorePath, 'utf-8'));
    const account = await web3.eth.accounts.decrypt(keystore, keystorePassword);
    return BigInt(account.privateKey);
  } else {
    throw new Error('Either KEYSTORE_PATH and KEYSTORE_PASSWORD or PRIVATE_KEY must be provided');
  }
}

export async function getConfig(): Promise<AppConfig> {
  if (!process.env.BATCH_ID) {
    throw new Error('Missing required environment variable: BATCH_ID');
  }

  const privateKey = await getPrivateKey();

  const config: AppConfig = {
    beeEndpoint: process.env.BEE_ENDPOINT || 'http://localhost:1633',
    port: Number(process.env.PORT) || 3050,
    batchId: process.env.BATCH_ID,
    privateKey
  };

  return config;
}

