import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Table, Spinner, Badge } from 'react-bootstrap';
import { getCSVFiles, compareCSVFiles, updateOriginalCSV } from '../services/api';

const CompareFiles = ({ onFileUpdated }) => {
  const [originalFile, setOriginalFile] = useState('');
  const [compareFile, setCompareFile] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);
  const [filteredDifferences, setFilteredDifferences] = useState([]);
  const [showAccepted, setShowAccepted] = useState(true);
  const [acceptedChanges, setAcceptedChanges] = useState({});

  // Fetch files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  // Load CSV files from the API
  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await getCSVFiles();
      setFiles(response.data || []);
    } catch (err) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  // Handle compare button click
  const handleCompare = async () => {
    if (!originalFile || !compareFile) {
      setError('Please select both files to compare');
      return;
    }

    setComparing(true);
    setError('');
    setComparison(null);
    setAcceptedChanges({});

    try {
      const response = await compareCSVFiles(originalFile, compareFile);
      const comparisonData = response.data.comparison;
      
      setComparison(comparisonData);
      // Initialize all changes as accepted
      const initialAccepted = {};
      
      // Process differences
      comparisonData.differences.forEach((diff, index) => {
        initialAccepted[`diff_${index}`] = diff.differences.map(() => true);
      });
      
      // Process additions
      comparisonData.additions.forEach((_, index) => {
        initialAccepted[`add_${index}`] = true;
      });
      
      // Process deletions
      comparisonData.deletions.forEach((_, index) => {
        initialAccepted[`del_${index}`] = true;
      });
      
      setAcceptedChanges(initialAccepted);
      updateFilteredDifferences(comparisonData, initialAccepted, true);
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to compare files. Please try again.'
      );
    } finally {
      setComparing(false);
    }
  };

  // Update filtered differences based on show accepted flag
  const updateFilteredDifferences = (comp, accepted, showAccepted) => {
    if (!comp) return;
    
    // Filter differences
    const filtered = {
      differences: comp.differences.filter((diff, index) => {
        return diff.differences.some((_, diffIndex) => 
          showAccepted ? true : accepted[`diff_${index}`][diffIndex]
        );
      }),
      additions: showAccepted ? comp.additions : 
        comp.additions.filter((_, index) => accepted[`add_${index}`]),
      deletions: showAccepted ? comp.deletions : 
        comp.deletions.filter((_, index) => accepted[`del_${index}`])
    };
    
    setFilteredDifferences(filtered);
  };

  // Toggle showing accepted changes
  const handleToggleAccepted = () => {
    const newValue = !showAccepted;
    setShowAccepted(newValue);
    updateFilteredDifferences(comparison, acceptedChanges, newValue);
  };

  // Handle change acceptance toggle
  const handleAcceptChange = (type, index, diffIndex = null) => {
    const key = `${type}_${index}`;
    const newAccepted = { ...acceptedChanges };
    
    if (diffIndex !== null) {
      // Toggle a specific field change
      newAccepted[key][diffIndex] = !newAccepted[key][diffIndex];
    } else {
      // Toggle a whole record (addition or deletion)
      newAccepted[key] = !newAccepted[key];
    }
    
    setAcceptedChanges(newAccepted);
    updateFilteredDifferences(comparison, newAccepted, showAccepted);
  };

  // Apply accepted changes to the original file
  const handleUpdateOriginal = async () => {
    if (!comparison) return;
    
    setUpdating(true);
    setError('');
    
    try {
      // Prepare the changes to send
      const changes = {
        // Include only accepted differences
        differences: comparison.differences.map((diff, index) => ({
          id: diff.id,
          differences: diff.differences.filter((_, diffIndex) => 
            acceptedChanges[`diff_${index}`][diffIndex]
          )
        })).filter(diff => diff.differences.length > 0),
        
        // Include only accepted additions
        additions: comparison.additions.filter((_, index) => 
          acceptedChanges[`add_${index}`]
        ),
        
        // Include only accepted deletions
        deletions: comparison.deletions.filter((_, index) => 
          acceptedChanges[`del_${index}`]
        ),
        
        // Pass the ID column
        idColumn: comparison.idColumn
      };
      
      // Send the update request
      const response = await updateOriginalCSV(originalFile, changes);
      
      // Notify parent component
      if (onFileUpdated) {
        onFileUpdated(response.data.updateResult.newFileId);
      }
      
      // Reset component state
      setComparison(null);
      setFilteredDifferences([]);
      setOriginalFile('');
      setCompareFile('');
      
      // Reload files to get the updated list
      await loadFiles();
      
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to update original file. Please try again.'
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <Card.Header as="h5">Compare & Update CSV Files</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Select Original File</Form.Label>
            <Form.Select
              value={originalFile}
              onChange={(e) => setOriginalFile(e.target.value)}
              disabled={loading || comparing || updating}
            >
              <option value="">-- Select Original File --</option>
              {files.filter(file => file.isOriginal).map(file => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Select File to Compare</Form.Label>
            <Form.Select
              value={compareFile}
              onChange={(e) => setCompareFile(e.target.value)}
              disabled={loading || comparing || updating}
            >
              <option value="">-- Select File to Compare --</option>
              {files.map(file => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button 
            variant="primary" 
            onClick={handleCompare}
            disabled={!originalFile || !compareFile || loading || comparing || updating}
            className="mb-3"
          >
            {comparing ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Comparing...
              </>
            ) : 'Compare Files'}
          </Button>
        </Form>

        {comparison && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
              <h5>Comparison Results</h5>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handleToggleAccepted}
              >
                {showAccepted ? 'Hide Accepted Changes' : 'Show All Changes'}
              </Button>
            </div>

            <div className="mb-4">
              <Badge bg="primary" className="me-2">
                {comparison.summary.differencesCount} Changes
              </Badge>
              <Badge bg="success" className="me-2">
                {comparison.summary.additionsCount} Additions
              </Badge>
              <Badge bg="danger">
                {comparison.summary.deletionsCount} Deletions
              </Badge>
            </div>

            {/* Display differences */}
            {filteredDifferences.differences?.length > 0 && (
              <div className="mb-4">
                <h6>Changed Records</h6>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Field</th>
                      <th>Original Value</th>
                      <th>New Value</th>
                      <th>Accept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDifferences.differences.map((diff, index) => (
                      diff.differences.map((fieldDiff, diffIndex) => (
                        <tr key={`${diff.id}-${fieldDiff.field}`}>
                          {diffIndex === 0 && (
                            <td rowSpan={diff.differences.length}>{diff.id}</td>
                          )}
                          <td>{fieldDiff.field}</td>
                          <td>{fieldDiff.originalValue}</td>
                          <td>{fieldDiff.newValue}</td>
                          <td className="text-center">
                            <Form.Check
                              type="checkbox"
                              checked={acceptedChanges[`diff_${index}`][diffIndex]}
                              onChange={() => handleAcceptChange('diff', index, diffIndex)}
                            />
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Display additions */}
            {filteredDifferences.additions?.length > 0 && (
              <div className="mb-4">
                <h6>New Records</h6>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      {Object.keys(filteredDifferences.additions[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                      <th>Accept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDifferences.additions.map((addition, index) => (
                      <tr key={`add-${index}`}>
                        {Object.values(addition).map((value, i) => (
                          <td key={i}>{value}</td>
                        ))}
                        <td className="text-center">
                          <Form.Check
                            type="checkbox"
                            checked={acceptedChanges[`add_${index}`]}
                            onChange={() => handleAcceptChange('add', index)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Display deletions */}
            {filteredDifferences.deletions?.length > 0 && (
              <div className="mb-4">
                <h6>Deleted Records</h6>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      {Object.keys(filteredDifferences.deletions[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                      <th>Accept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDifferences.deletions.map((deletion, index) => (
                      <tr key={`del-${index}`}>
                        {Object.values(deletion).map((value, i) => (
                          <td key={i}>{value}</td>
                        ))}
                        <td className="text-center">
                          <Form.Check
                            type="checkbox"
                            checked={acceptedChanges[`del_${index}`]}
                            onChange={() => handleAcceptChange('del', index)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            <Button 
              variant="success" 
              onClick={handleUpdateOriginal}
              disabled={updating}
            >
              {updating ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Updating...
                </>
              ) : 'Update Original File'}
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default CompareFiles;
