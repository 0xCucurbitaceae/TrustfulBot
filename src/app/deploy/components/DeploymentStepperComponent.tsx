import React from 'react';

interface DeploymentStepperComponentProps {
  currentStep: number;
  steps: string[];
}

const DeploymentStepperComponent: React.FC<DeploymentStepperComponentProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center">
        {steps.map((label, index) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <p
                className={`mt-2 text-xs text-center ${
                  index <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default DeploymentStepperComponent;
