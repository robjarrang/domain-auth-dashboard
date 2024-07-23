import fs from 'fs';
import path from 'path';

const csvFilePath = path.join(process.cwd(), 'domains.csv');
const backupFilePath = path.join(process.cwd(), 'domains_backup.csv');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (fs.existsSync(backupFilePath)) {
        fs.copyFileSync(backupFilePath, csvFilePath);
        res.status(200).json({ message: 'Domains reset successfully' });
      } else {
        res.status(404).json({ error: 'Backup file not found' });
      }
    } catch (error) {
      console.error('Error resetting domains:', error);
      res.status(500).json({ error: 'Failed to reset domains' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}