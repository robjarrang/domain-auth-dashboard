require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

async function initializeKV() {
  try {
    console.log('Reading domains.csv file...');
    const fileContent = fs.readFileSync('domains.csv', 'utf8');
    console.log('Parsing CSV content...');
    const domains = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    console.log('Attempting to connect to KV storage...');
    await kv.set('test', 'connection');
    console.log('KV connection successful');

    console.log('Storing domains in KV storage...');
    const domainsJson = JSON.stringify(domains);
    console.log('Domains JSON:', domainsJson);
    await kv.set('domains', domainsJson);
    console.log('KV storage initialized with domains from CSV');

    // Verify the data was stored
    const storedDomains = await kv.get('domains');
    console.log('Stored domains (raw):', storedDomains);
    
    if (typeof storedDomains === 'string') {
      try {
        const parsedDomains = JSON.parse(storedDomains);
        console.log('Parsed stored domains:', parsedDomains);
      } catch (parseError) {
        console.error('Error parsing stored domains:', parseError);
      }
    } else {
      console.log('Stored domains (non-string):', storedDomains);
    }
  } catch (error) {
    console.error('Error initializing KV storage:', error);
    if (error.message.includes('KV_URL')) {
      console.error('KV_URL environment variable may not be set correctly');
    }
  }
}

initializeKV();