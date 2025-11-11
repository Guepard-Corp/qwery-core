import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../shadcn/avatar';

type SessionProps = {
  displayName: string | null;
  pictureUrl?: string | null;
};

type TextProps = {
  text: string;
};

type ProfileAvatarProps = (SessionProps | TextProps) & {
  className?: string;
  fallbackClassName?: string;
};

export function ProfileAvatar(props: ProfileAvatarProps) {
  const avatarClassName = cn(
    'mx-auto h-9 w-9 group-focus:ring-2',
    props.className,
  );

  if ('text' in props) {
    return (
      <Avatar className={avatarClassName}>
        <AvatarFallback
          className={cn(
            props.fallbackClassName,
            'animate-in fade-in uppercase',
          )}
        >
          {props.text.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
    );
  }

  const initials = props.displayName?.slice(0, 1);

  return (
    <Avatar className={avatarClassName}>
      <AvatarImage src={props.pictureUrl ?? undefined} />

      <AvatarFallback
        className={cn(props.fallbackClassName, 'animate-in fade-in')}
      >
        <span suppressHydrationWarning className={'uppercase'}>
          {initials}
        </span>
      </AvatarFallback>
    </Avatar>
  );
}
