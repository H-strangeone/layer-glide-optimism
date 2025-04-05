import React from 'react';
import FraudProof from '../components/FraudProof';

const FraudProofPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6 text-center">Fraud Proof Submission</h1>
                <FraudProof />
            </div>
        </div>
    );
};

export default FraudProofPage; 