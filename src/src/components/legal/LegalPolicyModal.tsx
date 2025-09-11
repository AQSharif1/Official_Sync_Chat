import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink } from 'lucide-react';

interface LegalPolicyModalProps {
  policyType: 'terms' | 'privacy' | 'community';
  trigger: React.ReactNode;
  asExternal?: boolean;
}

const policyContent = {
  terms: {
    title: "Terms of Service",
    emoji: "📜",
    content: `
**Terms of Service**

Last updated: ${new Date().toLocaleDateString()}

**1. Acceptance of Terms**
By using SyncChat, you confirm that you are at least 13 years old and agree to these Terms of Service.

**2. Service Description**
SyncChat is a social platform that connects users in group chats based on shared interests and preferences.

**3. User Conduct**
- Be respectful to all community members
- No harassment, bullying, or inappropriate content
- No spam or promotional content
- Follow all applicable laws

**4. Account Responsibility**
- You are responsible for your account security
- One account per person
- Accurate information required

**5. Privacy**
- We collect minimal data necessary for the service
- Your conversations are private within your matched groups
- We may moderate content for safety

**6. Intellectual Property**
- You retain rights to your content
- You grant us license to operate the service
- Respect others' intellectual property

**7. Termination**
We may terminate accounts that violate these terms.

**8. Changes to Terms**
We may update these terms with notice to users.

**9. Contact**
For questions about these terms, contact us through the app.
    `
  },
  privacy: {
    title: "Privacy Policy",
    emoji: "🔐",
    content: `
**Privacy Policy**

Last updated: ${new Date().toLocaleDateString()}

**1. Information We Collect**
- Account information (email, username)
- Profile preferences (genres, personality traits, habits)
- Chat messages within groups
- Usage analytics (anonymous)

**2. How We Use Information**
- To match you with compatible groups
- To improve our matching algorithm
- To ensure platform safety and security
- To provide customer support

**3. Information Sharing**
- We do not sell your personal data
- Your profile is only visible to matched group members
- We may share anonymized data for research
- Legal compliance when required

**4. Data Storage**
- Your data is stored securely on our servers
- Messages are encrypted in transit
- Regular security audits and updates

**5. Your Rights**
- Access your data
- Correct inaccurate information
- Delete your account and data
- Data portability upon request

**6. Children's Privacy**
- Users must be 13 or older
- No collection of data from children under 13
- Parental consent may be required for users under 18

**7. Cookies and Tracking**
- We use essential cookies for functionality
- No third-party advertising cookies
- You can control cookie preferences

**8. International Users**
- Data may be processed in different countries
- Same privacy protections apply globally

**9. Changes to Policy**
We will notify users of any material changes to this policy.

**10. Contact Us**
For privacy questions, contact us through the app settings.
    `
  },
  community: {
    title: "Community Guidelines",
    emoji: "🧭",
    content: `
**Community Guidelines**

Welcome to SyncChat! These guidelines help maintain a positive environment for everyone.

**Our Values**
- Respect and kindness
- Authentic connections
- Safe and inclusive space
- Meaningful conversations

**Expected Behavior**
- Treat all members with respect
- Be authentic in your interactions
- Listen actively and engage thoughtfully
- Help create a welcoming environment

**Prohibited Behavior**
- Harassment, bullying, or threats
- Hate speech or discrimination
- Sharing inappropriate content
- Spam or excessive self-promotion
- Impersonation or fake accounts
- Sharing personal information of others

**Content Guidelines**
- Keep conversations relevant to your group
- No explicit or inappropriate content
- Respect intellectual property
- No commercial solicitations

**Reporting and Enforcement**
- Report violations using the report feature
- We investigate all reports promptly
- Violations may result in warnings or account suspension
- Serious violations may result in permanent bans

**Group Dynamics**
- Participate actively in your groups
- Be open to different perspectives
- Resolve conflicts respectfully
- Support group decisions

**Privacy and Safety**
- Don't share personal information publicly
- Use the block feature if needed
- Report suspicious or harmful behavior
- Keep conversations within the platform

**Consequences**
- First violation: Warning
- Repeated violations: Temporary suspension
- Serious violations: Permanent ban
- Appeals process available

**Getting Help**
- Use in-app reporting tools
- Contact support through settings
- Community moderators are available

Together, we create a space where authentic connections flourish!
    `
  }
};

export const LegalPolicyModal = ({ policyType, trigger, asExternal = false }: LegalPolicyModalProps) => {
  const policy = policyContent[policyType];

  if (asExternal) {
    return (
      <Button 
        variant="link" 
        className="h-auto p-0 text-primary hover:text-primary/80"
        onClick={() => window.open(`#${policyType}`, '_blank')}
      >
        {trigger}
        <ExternalLink className="w-3 h-3 ml-1" />
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{policy.emoji}</span>
            {policy.title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {policy.content.split('\n\n').map((section, index) => (
              <div key={index} className="text-sm">
                {section.startsWith('**') ? (
                  <h3 className="font-semibold text-foreground mb-2">
                    {section.replace(/\*\*/g, '')}
                  </h3>
                ) : (
                  <p className="text-muted-foreground leading-relaxed">
                    {section}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};