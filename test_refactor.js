
const { logger } = require('./src/lib/logger');
const { isSameDay, addDays } = require('./src/lib/dateUtils');
const { TOKEN_CONFIG } = require('./src/lib/constants');

console.log('Testing Logger...');
logger.info('Test Info Log', { foo: 'bar' });

console.log('Testing DateUtils...');
const today = new Date();
const tomorrow = addDays(today, 1);
console.log('isSameDay(today, today):', isSameDay(today, today));
console.log('isSameDay(today, tomorrow):', isSameDay(today, tomorrow));

console.log('Testing Constants...');
console.log('TOKEN_CONFIG:', TOKEN_CONFIG);

console.log('All basic tests passed.');
