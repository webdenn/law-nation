
import * as AdobeSDK from '@adobe/pdfservices-node-sdk';

console.log('--- Adobe SDK Exports ---');
console.log('Keys:', Object.keys(AdobeSDK));

if ((AdobeSDK as any).ClientConfig) {
    console.log('\n--- ClientConfig ---');
    console.log('Type:', typeof (AdobeSDK as any).ClientConfig);
    console.log('Keys:', Object.keys((AdobeSDK as any).ClientConfig));
    try {
        console.log('Prototype:', Object.getOwnPropertyNames((AdobeSDK as any).ClientConfig.prototype));
    } catch (e) { }
} else {
    console.log('\n❌ ClientConfig is undefined');
}
