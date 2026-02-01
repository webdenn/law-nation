
import 'dotenv/config';
import { adobeService } from '../services/adobe.service.js';

console.log('--- Testing Adobe Service Initialization ---');
try {
    // Access private property or call a method to trigger check
    // Since checkAvailability is private, we can try to call a public method with a dummy path
    // Or just rely on the constructor logs which happen on import/instantiation

    // We can use reflection to check isAvailable if we want, or just see if it threw during init
    console.log('Service imported.');

    // Let's try to verify if it thinks it's available
    // We'll wrap it in a try-catch block of a method call that checks availability
    // We don't actually want to run a conversion, just check availability.

    // Checking internal state via 'any' casting for testing
    const isAvailable = (adobeService as any).isAvailable;
    console.log(`Is available: ${isAvailable}`);

    if ((adobeService as any).initError) {
        console.error(`Init Error: ${(adobeService as any).initError}`);
    }

} catch (error) {
    console.error('Test failed:', error);
}
