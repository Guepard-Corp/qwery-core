import Agent from '../_components/agent';
import { useParams } from 'react-router';

export default function ProjectIndexPage() {
  const slug = useParams().slug;

  return <Agent conversationSlug={slug as string} />;
}
