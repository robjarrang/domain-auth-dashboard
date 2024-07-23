import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Table, ProgressBar, Alert, Modal, Form } from 'react-bootstrap';

const CHUNK_SIZE = 3;

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
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editableDomains, setEditableDomains] = useState([]);
  const [lastRunDate, setLastRunDate] = useState(null);
  const [lastRunResults, setLastRunResults] = useState([]);

  useEffect(() => {
    fetchDomains();
    fetchLastRunResults();
  }, []);

  async function fetchResults() {
    setLoading(true);
    setResults([]);
    setProgress(0);
    setError(null);
    let nextIndex = 0;
    let isComplete = false;
    let total = 0;
    let allResults = [];

    while (!isComplete) {
      try {
        console.log(`Fetching chunk starting at index ${nextIndex}`);
        const response = await fetch(`/api/daily-check?start=${nextIndex}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response for chunk ${nextIndex}:`, errorText);
          if (response.status === 504) {
            console.log("Timeout occurred, continuing with next chunk");
            nextIndex += CHUNK_SIZE;
            continue;
          }
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`Received data for chunk ${nextIndex}:`, data);
        allResults = [...allResults, ...data.results];
        setResults(allResults);
        nextIndex = data.nextIndex;
        isComplete = data.isComplete;
        total = data.total;
        setProgress(Math.round((nextIndex / total) * 100));
      } catch (error) {
        console.error(`Error fetching chunk ${nextIndex}:`, error);
        if (allResults.length > 0) {
          setError(`Some domains could not be checked. Partial results are available.`);
        } else {
          setError(`Failed to fetch results. Please try again later. Error: ${error.message}`);
        }
        break;
      }
    }

    setLoading(false);
    if (allResults.length > 0) {
      // Store partial results
      await fetch('/api/update-last-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: allResults, date: new Date().toISOString() })
      });
    }
    fetchLastRunResults();
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
        throw new Error('Failed to update domains');
      }
      setShowEditModal(false);
      setError('Domains updated successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Error updating domains:', error);
      setError('Failed to update domains. Please try again.');
    }
  }

  async function handleResetDomains() {
    try {
      const response = await fetch('/api/reset-domains', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to reset domains');
      }
      fetchDomains();
      setShowEditModal(false);
      setError('Domains reset successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Error resetting domains:', error);
      setError('Failed to reset domains. Please try again.');
    }
  }

  async function fetchLastRunResults() {
    try {
      console.log('Fetching last run results...');
      const response = await fetch('/api/last-run-results');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch last run results: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Received last run data:', data);
      setLastRunResults(data.results);
      setLastRunDate(data.lastRunDate);
    } catch (error) {
      console.error('Detailed error fetching last run results:', error);
      setError(`Failed to fetch last run results: ${error.message}`);
    }
  }

  function handleRemoveDomain(indexToRemove) {
    setEditableDomains(prevDomains => prevDomains.filter((_, index) => index !== indexToRemove));
  }

  function handleAddDomain() {
    setEditableDomains(prevDomains => [...prevDomains, { domain: '', selector: '' }]);
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
      {lastRunDate && (
        <Row className="mb-4">
          <Col>
            <Alert variant="info">
              Last run date: {new Date(lastRunDate).toLocaleString()}
            </Alert>
          </Col>
        </Row>
      )}
      {!loading && (results.length > 0 || lastRunResults.length > 0) && (
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
                {(results.length > 0 ? results : lastRunResults).map((result, index) => (
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
                <div className="d-flex">
                  <div className="flex-grow-1 me-2">
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
                  </div>
                  <Button 
                    variant="danger" 
                    onClick={() => handleRemoveDomain(index)}
                    className="align-self-start"
                  >
                    Remove
                  </Button>
                </div>
              </Form.Group>
            ))}
          </Form>
          <Button 
            variant="success" 
            onClick={handleAddDomain}
            className="mt-3"
          >
            Add New Domain
          </Button>
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