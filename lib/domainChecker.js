import dns from 'dns/promises';

export async function checkDomain(domain, selector) {
  const results = { dkim: false, spf: false, dmarc: false };
  
  try {
    // Check DKIM
    const dkimRecords = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
    results.dkim = dkimRecords.length > 0;

    // Check SPF
    const txtRecords = await dns.resolveTxt(domain);
    results.spf = txtRecords.some(record => record[0].startsWith('v=spf1'));

    // Check DMARC
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
    results.dmarc = dmarcRecords.some(record => record[0].startsWith('v=DMARC1'));
  } catch (error) {
    console.error(`Error checking ${domain}:`, error);
  }

  return results;
}