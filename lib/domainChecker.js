import dns from 'dns/promises';

const DNS_TIMEOUT = 5000;

export async function checkDomain(domain, selector) {
  try {
    const [dkimRecords, txtRecords, dmarcRecords] = await Promise.all([
      dns.resolveTxt(`${selector}._domainkey.${domain}`).catch(() => []),
      dns.resolveTxt(domain).catch(() => []),
      dns.resolveTxt(`_dmarc.${domain}`).catch(() => [])
    ]);

    return {
      dkim: dkimRecords.length > 0,
      spf: txtRecords.some(record => record[0].startsWith('v=spf1')),
      dmarc: dmarcRecords.some(record => record[0].startsWith('v=DMARC1')),
      dkimDetails: dkimRecords,
      spfDetails: txtRecords,
      dmarcDetails: dmarcRecords
    };
  } catch (error) {
    console.error(`Error checking domain ${domain}:`, error);
    return { dkim: false, spf: false, dmarc: false, error: error.message };
  }
}