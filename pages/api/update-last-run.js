import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { results, date } = req.body;
      await kv.set('lastRunResults', results);
      await kv.set('lastRunDate', date);
      res.status(200).json({ message: 'Last run results updated successfully' });
    } catch (error) {
      console.error('Error updating last run results:', error);
      res.status(500).json({ error: 'Failed to update last run results' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}