import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Table, ProgressBar, Alert, Modal, Form } from 'react-bootstrap';

const CHUNK_SIZE = 3; // This should match the CHUNK_SIZE in the API

function DomainRow({ result }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr>
        <td>
          <Button 
            variant="link"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="text-decoration-none me-2"
          >
            {expanded ? '▼' : '▶'}
          </Button>
          {result.domain}
        </td>
        <td>{result.dkim ? '✅' : '❌'}</td>
        <td>{result.spf ? '✅' : '❌'}</td>
        <td>{result.dmarc ? '✅' : '❌'}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="4">
            <Alert variant="light">
              <h5>DKIM:</h5>
              <pre className="overflow-auto" style={{ maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.dkimDetails, null, 2)}
              </pre>
              <h5 className="mt-3">SPF:</h5>
              <pre className="overflow-auto" style={{ maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.spfDetails, null, 2)}
              </pre>
              <h5 className="mt-3">DMARC:</h5>
              <pre className="overflow-auto" style={{ maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.dmarcDetails, null, 2)}
              </pre>
            </Alert>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Home() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editableDomains, setEditableDomains] = useState([]);

  useEffect(() => {
    checkNotificationPermission();
    fetchDomains();
  }, []);

  function checkNotificationPermission() {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }

  async function requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  }

  async function fetchResults() {
    setLoading(true);
    setResults([]);
    setProgress(0);
    setError(null);
    let nextIndex = 0;
    let isComplete = false;
    let total = 0;
    let retries = 0;
    const maxRetries = 3;

    while (!isComplete && retries < maxRetries) {
      try {
        const response = await fetch(`/api/daily-check?start=${nextIndex}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setResults(prev => [...prev, ...data.results]);
        nextIndex = data.nextIndex;
        isComplete = data.isComplete;
        total = data.total;
        setProgress(Math.round((nextIndex / total) * 100));
        retries = 0; // Reset retries on successful request
      } catch (error) {
        console.error('Error fetching chunk:', error);
        retries++;
        if (retries >= maxRetries) {
          setError(`Failed to fetch results after ${maxRetries} attempts. Please try again later.`);
          break;
        }
        // Wait for a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const failedDomains = results.filter(result => 
      !result.dkim || !result.spf || !result.dmarc
    );

    if (failedDomains.length > 0 && notificationPermission === 'granted') {
      new Notification('Domain Authentication Alert', {
        body: `${failedDomains.length} domain(s) have failed authentication checks.`,
      });
    }

    setLoading(false);
  }

  async function fetchDomains() {
    try {
      const response = await fetch('/api/update-domains');
      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }
      const domains = await response.json();
      setEditableDomains(domains);
    } catch (error) {
      console.error('Error fetching domains:', error);
      setError('Failed to fetch domains. Please try again.');
    }
  }

  async function handleUpdateDomains() {
    try {
      const response = await fetch('/api/update-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: editableDomains }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update domains: ${errorData.error || response.statusText}`);
      }
      setShowEditModal(false);
      fetchResults(); // Refresh results with new domains
    } catch (error) {
      console.error('Error updating domains:', error);
      setError(`Failed to update domains: ${error.message}`);
    }
  }

  async function handleResetDomains() {
    try {
      const response = await fetch('/api/reset-domains', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset domains');
      }
      fetchDomains(); // Refresh the domain list
      setShowEditModal(false);
      fetchResults(); // Refresh results with reset domains
    } catch (error) {
      console.error('Error resetting domains:', error);
      setError('Failed to reset domains. Please try again.');
    }
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>Domain Authentication Dashboard</h1>
        </Col>
      </Row>
      <Row className="mb-4">
        <Col>
          <Button 
            variant="primary"
            onClick={fetchResults}
            disabled={loading}
            className="me-2"
          >
            {loading ? 'Checking...' : 'Run Check'}
          </Button>
          <Button 
            variant="secondary"
            onClick={() => setShowEditModal(true)}
            className="me-2"
          >
            Edit Domains
          </Button>
          {notificationPermission !== 'granted' && (
            <Button 
              variant="success"
              onClick={requestNotificationPermission}
            >
              Enable Notifications
            </Button>
          )}
        </Col>
      </Row>
      {loading && (
        <Row className="mb-4">
          <Col>
            <ProgressBar now={progress} label={`${progress}%`} />
          </Col>
        </Row>
      )}
      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}
      {!loading && results.length > 0 && (
        <Row>
          <Col>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>DKIM</th>
                  <th>SPF</th>
                  <th>DMARC</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <DomainRow key={index} result={result} />
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      )}

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Domains</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {editableDomains.map((domain, index) => (
              <Form.Group key={index} className="mb-3">
                <Form.Label>Domain {index + 1}</Form.Label>
                <Form.Control 
                  type="text" 
                  value={domain.domain}
                  onChange={(e) => {
                    const newDomains = [...editableDomains];
                    newDomains[index].domain = e.target.value;
                    setEditableDomains(newDomains);
                  }}
                />
                <Form.Control 
                  type="text" 
                  value={domain.selector}
                  onChange={(e) => {
                    const newDomains = [...editableDomains];
                    newDomains[index].selector = e.target.value;
                    setEditableDomains(newDomains);
                  }}
                  className="mt-2"
                />
              </Form.Group>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleUpdateDomains}>
            Save Changes
          </Button>
          <Button variant="danger" onClick={handleResetDomains}>
            Reset to Default
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}