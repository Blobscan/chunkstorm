import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import Web3 from 'web3';

dotenv.config();

export interface AppConfig {
  target: string;
  port: number;
  depth: number;
  batchId: string;
  privateKey: bigint;
}

export async function getConfig(): Promise<AppConfig> {
  if (!process.env.BATCH_ID) {
    throw new Error('Missing required environment variable: BATCH_ID');
  }
  
  const useKeystore = process.env.USE_KEYSTORE === 'true';
  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  const privateKeyString = process.env.PRIVATE_KEY;
  
  if (useKeystore) {
    if (!keystorePath || !keystorePassword) {
      throw new Error('USE_KEYSTORE is true, but KEYSTORE_PATH or KEYSTORE_PASSWORD is missing');
    }
  } else {
    if (!privateKeyString) {
      throw new Error('PRIVATE_KEY must be provided if USE_KEYSTORE is not true');
    }
  }
  
  let privateKey: bigint;
  if (useKeystore) {
    const web3 = new Web3();
    const keystore = JSON.parse(readFileSync(keystorePath!, 'utf-8'));
    const account = await web3.eth.accounts.decrypt(keystore, keystorePassword!);
    privateKey = BigInt(account.privateKey);
  } else {
    privateKey = BigInt(privateKeyString!);
  }
  
  const config: AppConfig = {
    target: process.env.TARGET || 'http://localhost:1633',
    port: Number(process.env.PORT) || 3000,
    depth: Number(process.env.DEPTH) || 17,
    batchId: process.env.BATCH_ID,
    privateKey
  };

  return config;
}

