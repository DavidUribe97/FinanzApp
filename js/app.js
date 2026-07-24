import { state } from './state.js';
import { FIREBASE_CONFIG } from './config.js';
import { formatCOP } from './utils.js';
console.log('state OK:', !!state);
console.log('config OK:', FIREBASE_CONFIG.apiKey);
console.log('utils OK:', formatCOP(12345));
