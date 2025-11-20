import type { Meta, StoryObj } from '@storybook/react';
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from './confirmation';

const meta: Meta<typeof Confirmation> = {
  title: 'AI Elements/Confirmation',
  component: Confirmation,
};

export default meta;
type Story = StoryObj<typeof Confirmation>;

export const ApprovalRequested: Story = {
  render: () => (
    <div className="max-w-md">
      <Confirmation
        state="approval-requested"
        approval={{ id: '1', approved: undefined }}
      >
        <ConfirmationTitle>
          This action requires your approval to proceed.
        </ConfirmationTitle>
        <ConfirmationRequest>
          <ConfirmationActions>
            <ConfirmationAction>Approve</ConfirmationAction>
            <ConfirmationAction variant="destructive">Reject</ConfirmationAction>
          </ConfirmationActions>
        </ConfirmationRequest>
      </Confirmation>
    </div>
  ),
};

export const Approved: Story = {
  render: () => (
    <div className="max-w-md">
      <Confirmation
        state="approval-responded"
        approval={{ id: '1', approved: true, reason: 'Looks good' }}
      >
        <ConfirmationTitle>Action approved</ConfirmationTitle>
        <ConfirmationAccepted>
          <p className="text-sm text-muted-foreground">
            The action has been approved and will proceed.
          </p>
        </ConfirmationAccepted>
      </Confirmation>
    </div>
  ),
};

export const Rejected: Story = {
  render: () => (
    <div className="max-w-md">
      <Confirmation
        state="approval-responded"
        approval={{
          id: '1',
          approved: false,
          reason: 'This action is not allowed',
        }}
      >
        <ConfirmationTitle>Action rejected</ConfirmationTitle>
        <ConfirmationRejected>
          <p className="text-sm text-muted-foreground">
            The action has been rejected. Reason: This action is not allowed
          </p>
        </ConfirmationRejected>
      </Confirmation>
    </div>
  ),
};

export const OutputAvailable: Story = {
  render: () => (
    <div className="max-w-md">
      <Confirmation
        state="output-available"
        approval={{ id: '1', approved: true }}
      >
        <ConfirmationTitle>Action completed successfully</ConfirmationTitle>
        <ConfirmationAccepted>
          <p className="text-sm text-muted-foreground">
            The approved action has been executed and completed.
          </p>
        </ConfirmationAccepted>
      </Confirmation>
    </div>
  ),
};

