import { checkDomain } from '../../lib/domainChecker';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const csvFilePath = path.join(process.cwd(), 'domains.csv');
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  const records = parse(fileContent, { columns: true, skip_empty_lines: true });

  const results = [];

  for (const record of records) {
    const { domain, selector } = record;
    const checkResult = await checkDomain(domain, selector);
    results.push({ domain, ...checkResult });
  }

  res.status(200).json({ message: 'Daily check completed', results });
}