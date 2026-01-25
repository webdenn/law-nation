
import * as AdobeSDK from '@adobe/pdfservices-node-sdk';

const keys = Object.keys(AdobeSDK);
console.log('--- Adobe SDK Keys (First 10) ---');
console.log(keys.slice(0, 10));

console.log('\n--- Has ClientConfig? ---');
const hasClientConfig = 'ClientConfig' in AdobeSDK;
console.log(hasClientConfig);

if (hasClientConfig) {
    const CC = (AdobeSDK as any).ClientConfig;
    console.log('ClientConfig type:', typeof CC);
    console.log('ClientConfig keys:', Object.keys(CC));
}

console.log('\n--- Searching for Config ---');
const configKeys = keys.filter(k => k.toLowerCase().includes('config'));
console.log(configKeys);
