import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { LegalPolicyModal } from '@/components/legal/LegalPolicyModal';
import { ShieldCheck, AlertTriangle, CheckCircle, FileText, Shield, Users2 } from 'lucide-react';

interface LegalConsentStepProps {
  onConsentChange: (given: boolean) => void;
  isConsentGiven: boolean;
}

export const LegalConsentStep = ({ onConsentChange, isConsentGiven }: LegalConsentStepProps) => {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Initialize state from existing consent if given
  useEffect(() => {
    if (isConsentGiven) {
      setAgeConfirmed(true);
      setTermsAccepted(true);
    }
  }, [isConsentGiven]);

  const handleAgeChange = (checked: boolean) => {
    setAgeConfirmed(checked);
    const newConsentStatus = checked && termsAccepted;
    onConsentChange(newConsentStatus);
  };

  const handleTermsChange = (checked: boolean) => {
    setTermsAccepted(checked);
    const newConsentStatus = ageConfirmed && checked;
    onConsentChange(newConsentStatus);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Welcome to SyncChat</h3>
        <p className="text-muted-foreground">
          Before we get started, we need to ensure compliance with safety regulations and user privacy laws
        </p>
      </div>

      {/* Age Confirmation */}
      <Card className="p-6 border-border/50">
        <div className="flex items-start gap-4">
          <Checkbox
            id="age-confirmation"
            checked={ageConfirmed}
            onCheckedChange={handleAgeChange}
            className="mt-1"
          />
          <div className="flex-1">
            <label 
              htmlFor="age-confirmation" 
              className="text-sm font-medium cursor-pointer block mb-1"
            >
              Age Verification
            </label>
            <p className="text-sm text-muted-foreground">
              I confirm that I am at least 13 years of age. Users under 18 may require parental consent in some jurisdictions.
            </p>
          </div>
          {ageConfirmed && (
            <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
          )}
        </div>
      </Card>

      {/* Terms and Policies */}
      <Card className="p-6 border-border/50">
        <div className="flex items-start gap-4">
          <Checkbox
            id="terms-acceptance"
            checked={termsAccepted}
            onCheckedChange={handleTermsChange}
            className="mt-1"
          />
          <div className="flex-1">
            <label 
              htmlFor="terms-acceptance" 
              className="text-sm font-medium cursor-pointer block mb-2"
            >
              Legal Agreement
            </label>
            <p className="text-sm text-muted-foreground mb-4">
              I acknowledge that I have read, understood, and agree to be bound by the Terms of Service and Privacy Policy.
            </p>
            
            {/* Policy Links */}
            <div className="flex flex-wrap gap-4 text-sm">
              <LegalPolicyModal
                policyType="terms"
                trigger={
                  <Button variant="link" className="h-auto p-0 text-primary hover:text-primary/80 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    View Terms of Service
                  </Button>
                }
              />
              <LegalPolicyModal
                policyType="privacy"
                trigger={
                  <Button variant="link" className="h-auto p-0 text-primary hover:text-primary/80 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    View Privacy Policy
                  </Button>
                }
              />
              <LegalPolicyModal
                policyType="community"
                trigger={
                  <Button variant="link" className="h-auto p-0 text-primary hover:text-primary/80 flex items-center gap-1">
                    <Users2 className="w-3 h-3" />
                    View Community Guidelines
                  </Button>
                }
              />
            </div>
          </div>
          {termsAccepted && (
            <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
          )}
        </div>
      </Card>

      {/* Legal Notice */}
      <Card className="p-4 bg-muted/50 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
              Legal Compliance Notice
            </p>
            <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
              This service complies with applicable laws including COPPA and GDPR. By proceeding, you confirm your eligibility and consent to our data practices as outlined in our Privacy Policy.
            </p>
          </div>
        </div>
      </Card>

      {/* Consent Status */}
      {isConsentGiven && (
        <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Requirements completed. You may now continue setting up your profile.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};