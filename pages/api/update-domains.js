import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  console.log('KV_URL:', process.env.KV_URL);  // Add this line for debugging

  if (req.method === 'POST') {
    try {
      const { domains } = req.body;
      
      // Update domains in KV storage
      await kv.set('domains', JSON.stringify(domains));

      res.status(200).json({ message: 'Domains updated successfully' });
    } catch (error) {
      console.error('Error updating domains:', error);
      res.status(500).json({ error: `Failed to update domains: ${error.message}` });
    }
  } else if (req.method === 'GET') {
    try {
      console.log('Fetching domains from KV storage...');
      const domainsJson = await kv.get('domains');
      console.log('Received domains from KV:', domainsJson);
      const domains = Array.isArray(domainsJson) ? domainsJson : JSON.parse(domainsJson || '[]');
      console.log('Parsed domains:', domains);
      res.status(200).json(domains);
    } catch (error) {
      console.error('Detailed error reading domains:', error);
      res.status(500).json({ error: `Failed to read domains: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}