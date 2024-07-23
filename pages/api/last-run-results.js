import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('Fetching last run results from KV storage...');
      const [lastRunResults, lastRunDate] = await Promise.all([
        kv.get('lastRunResults'),
        kv.get('lastRunDate')
      ]);
      console.log('Last run date:', lastRunDate);
      console.log('Last run results:', lastRunResults ? 'Data found' : 'No data');

      res.status(200).json({
        results: lastRunResults || [],
        lastRunDate: lastRunDate || null
      });
    } catch (error) {
      console.error('Error fetching last run results:', error);
      res.status(500).json({ error: `Failed to fetch last run results: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}