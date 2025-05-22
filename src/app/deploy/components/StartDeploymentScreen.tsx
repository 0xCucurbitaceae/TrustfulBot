import React from 'react';
import { Button } from '@/components/ui/button';

interface StartDeploymentScreenProps {
  onStart: () => void;
}

const StartDeploymentScreen: React.FC<StartDeploymentScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 mt-12">
      <p className="text-lg text-muted-foreground">Ready to deploy your EAS resolver and schemas?</p>
      <Button size="lg" onClick={onStart}>
        Start Deployment Process
      </Button>
    </div>
  );
};

export default StartDeploymentScreen;
