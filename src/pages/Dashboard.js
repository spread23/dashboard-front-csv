import React, { useState, useEffect } from 'react';
import { Container, Row, Col, ListGroup, Badge, Spinner, Button, Alert } from 'react-bootstrap';
import { getCSVFiles, downloadCSV } from '../services/api';
import FileUpload from '../components/FileUpload';
import CompareFiles from '../components/CompareFiles';

const Dashboard = ({ user, onLogout }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await getCSVFiles();
      setFiles(response.data || []);
    } catch (err) {
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = (file) => {
    // Add the new file to the list
    setFiles(prevFiles => [file, ...prevFiles]);
  };

  const handleFileUpdated = async () => {
    // Reload the file list after a file is updated
    await loadFiles();
  };

  const handleDownload = async (id, name) => {
    setDownloading(true);
    
    try {
      const response = await downloadCSV(id);
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>CSV Dashboard</h2>
            <div>
              <span className="me-3">Welcome, {user.username}</span>
              <Button variant="outline-danger" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col md={6} lg={4} className="mb-4">
          <FileUpload onFileUploaded={handleFileUploaded} />
          
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <h5>Your Files</h5>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={loadFiles}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : files.length === 0 ? (
            <Alert variant="info">
              No files uploaded yet. Use the form above to upload CSV files.
            </Alert>
          ) : (
            <ListGroup>
              {files.map(file => (
                <ListGroup.Item 
                  key={file.id}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    {file.name}
                    {file.isOriginal && (
                      <Badge bg="success" className="ms-2">Original</Badge>
                    )}
                    <div className="text-muted small">
                      {new Date(file.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleDownload(file.id, file.name)}
                    disabled={downloading}
                  >
                    Download
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Col>
        
        <Col md={6} lg={8}>
          <CompareFiles onFileUpdated={handleFileUpdated} />
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
