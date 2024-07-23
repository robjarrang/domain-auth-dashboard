import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'csv-parse/sync';

const csvFilePath = path.join(process.cwd(), 'domains.csv');
const backupFilePath = path.join(process.cwd(), 'domains_backup.csv');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { domains } = req.body;
      
      // Backup current CSV
      fs.copyFileSync(csvFilePath, backupFilePath);

      // Write new domains to CSV
      const csv = stringify(domains, { header: true, columns: ['domain', 'selector'] });
      fs.writeFileSync(csvFilePath, csv);

      res.status(200).json({ message: 'Domains updated successfully' });
    } catch (error) {
      console.error('Error updating domains:', error);
      res.status(500).json({ error: 'Failed to update domains' });
    }
  } else if (req.method === 'GET') {
    try {
      const fileContent = fs.readFileSync(csvFilePath, 'utf8');
      const domains = parse(fileContent, { columns: true, skip_empty_lines: true });
      res.status(200).json(domains);
    } catch (error) {
      console.error('Error reading domains:', error);
      res.status(500).json({ error: 'Failed to read domains' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}