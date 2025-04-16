import React, { useState } from 'react';
import { Form, Button, Alert, Card, ProgressBar } from 'react-bootstrap';
import { uploadCSV } from '../services/api';

const FileUpload = ({ onFileUploaded }) => {
  const [file, setFile] = useState(null);
  const [isOriginal, setIsOriginal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    // Check if file is CSV
    if (selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx'))) 
      {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid CSV file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setProgress(0);
    
    try {
      // Create FormData object to send file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isOriginal', isOriginal);
      
      // Upload file with progress tracking
      const response = await uploadCSV(formData);
      
      // Call parent callback with uploaded file data
      onFileUploaded(response.data.file);
      
      // Reset form
      setFile(null);
      setIsOriginal(false);
      setError('');
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'An error occurred while uploading. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">Upload CSV File</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Form.Text className="text-muted">
              Only CSV files are supported
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="This is an original file (will be used as base for comparisons)"
              checked={isOriginal}
              onChange={(e) => setIsOriginal(e.target.checked)}
              disabled={uploading}
            />
          </Form.Group>

          {uploading && (
            <ProgressBar 
              now={progress} 
              label={`${progress}%`} 
              className="mb-3" 
            />
          )}

          <Button 
            variant="primary" 
            type="submit" 
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default FileUpload;
