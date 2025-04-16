import React from 'react';
import { Container } from 'react-bootstrap';
import Login from '../components/Login';

const LoginPage = ({ onLoginSuccess }) => {
  return (
    <Container className="mt-5">
      <div className="text-center mb-4">
        <h1>CSV Dashboard</h1>
        <p className="lead">Upload, compare and update CSV files</p>
      </div>
      <Login onLoginSuccess={onLoginSuccess} />
    </Container>
  );
};

export default LoginPage;
