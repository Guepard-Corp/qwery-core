import { useGetMessagesByConversationSlug } from '~/lib/queries/use-get-messages';
import Agent from '../_components/agent';
import { useParams } from 'react-router';
import { useWorkspace } from '~/lib/context/workspace-context';
import { LoaderIcon } from 'lucide-react';

export default function ConversationPage() {
  const slug = useParams().slug;
  const { repositories } = useWorkspace();

  const getMessages = useGetMessagesByConversationSlug(
    repositories.conversation,
    repositories.message,
    slug as string,
  );

  return (
    <>
      {getMessages.isLoading && (
        <>
          <LoaderIcon />
        </>
      )}
      {getMessages.data && (
        <Agent
          conversationSlug={slug as string}
          initialMessages={getMessages.data}
        />
      )}
    </>
  );
}
