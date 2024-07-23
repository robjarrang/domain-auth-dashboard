import { kv } from '@vercel/kv';
import { checkDomain } from '../../lib/domainChecker';

const CHUNK_SIZE = 3;

export default async function handler(req, res) {
  console.log('KV_URL:', process.env.KV_URL);
  const { start = 0 } = req.query;
  const startIndex = parseInt(start, 10);

  try {
    console.log('Fetching domains from KV storage...');
    const domainsJson = await kv.get('domains');
    console.log('Received domains from KV:', domainsJson);
    const domains = Array.isArray(domainsJson) ? domainsJson : JSON.parse(domainsJson || '[]');
    console.log('Parsed domains:', domains);

    const chunk = domains.slice(startIndex, startIndex + CHUNK_SIZE);
    console.log(`Processing chunk ${startIndex} to ${startIndex + CHUNK_SIZE}`);
    const results = await Promise.all(
      chunk.map(async record => {
        console.log(`Checking domain: ${record.domain}`);
        const result = await checkDomain(record.domain, record.selector);
        console.log(`Result for ${record.domain}:`, result);
        return { domain: record.domain, ...result };
      })
    );

    const nextIndex = startIndex + CHUNK_SIZE;
    const isComplete = nextIndex >= domains.length;

    // Store results, replacing previous results if this is the first chunk
    console.log('Storing results...');
    if (startIndex === 0) {
      await kv.set('lastRunResults', results);
    } else {
      const existingResults = await kv.get('lastRunResults') || [];
      await kv.set('lastRunResults', [...existingResults, ...results]);
    }
    await kv.set('lastRunDate', new Date().toISOString());
    console.log('Results stored successfully');

    res.status(200).json({
      results,
      nextIndex: isComplete ? null : nextIndex,
      isComplete,
      total: domains.length
    });
  } catch (error) {
    console.error('Detailed error in daily-check:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}