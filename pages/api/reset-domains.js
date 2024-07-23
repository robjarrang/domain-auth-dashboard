import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const csvFilePath = path.join(process.cwd(), 'domains.csv');
      const fileContent = fs.readFileSync(csvFilePath, 'utf8');
      const domains = parse(fileContent, { columns: true, skip_empty_lines: true });
      
      // Update domains in KV storage
      await kv.set('domains', JSON.stringify(domains));
      
      res.status(200).json({ message: 'Domains reset successfully' });
    } catch (error) {
      console.error('Error resetting domains:', error);
      res.status(500).json({ error: `Failed to reset domains: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}