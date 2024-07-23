import { checkDomain } from '../../lib/domainChecker';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import dns from 'dns/promises';

const CHUNK_SIZE = 3; // Process 3 domains per request
const DNS_TIMEOUT = 5000; // 5 seconds timeout for DNS lookups

async function getDetailedResults(domain, selector) {
  try {
    const dkimResult = await Promise.race([
      dns.resolveTxt(`${selector}._domainkey.${domain}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DKIM lookup timeout')), DNS_TIMEOUT))
    ]);

    const spfResult = await Promise.race([
      dns.resolveTxt(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SPF lookup timeout')), DNS_TIMEOUT))
    ]);

    const dmarcResult = await Promise.race([
      dns.resolveTxt(`_dmarc.${domain}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DMARC lookup timeout')), DNS_TIMEOUT))
    ]);

    return {
      dkimDetails: dkimResult,
      spfDetails: spfResult.filter(record => record[0].startsWith('v=spf1')),
      dmarcDetails: dmarcResult,
      dkim: dkimResult.length > 0,
      spf: spfResult.some(record => record[0].startsWith('v=spf1')),
      dmarc: dmarcResult.some(record => record[0].startsWith('v=DMARC1'))
    };
  } catch (error) {
    console.error(`Error getting detailed results for ${domain}:`, error.message);
    return {
      dkimDetails: [],
      spfDetails: [],
      dmarcDetails: [],
      dkim: false,
      spf: false,
      dmarc: false,
      error: true
    };
  }
}

export default async function handler(req, res) {
  const { start = 0 } = req.query;
  const startIndex = parseInt(start, 10);

  try {
    const csvFilePath = path.join(process.cwd(), 'domains.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });

    const chunk = records.slice(startIndex, startIndex + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async record => {
        const result = await getDetailedResults(record.domain, record.selector);
        return { domain: record.domain, ...result };
      })
    );

    const nextIndex = startIndex + CHUNK_SIZE;
    const isComplete = nextIndex >= records.length;

    res.status(200).json({
      results,
      nextIndex: isComplete ? null : nextIndex,
      isComplete,
      total: records.length
    });
  } catch (error) {
    console.error('Error processing chunk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}