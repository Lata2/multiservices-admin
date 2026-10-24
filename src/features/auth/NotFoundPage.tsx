import { Compass } from 'lucide-react';
import { EmptyState, LinkButton } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <EmptyState
        icon={Compass}
        title="This page doesn’t exist"
        description="The link may be old or mistyped."
        action={
          <LinkButton to="/" variant="outline" size="sm">
            Go to dashboard
          </LinkButton>
        }
      />
    </div>
  );
}
