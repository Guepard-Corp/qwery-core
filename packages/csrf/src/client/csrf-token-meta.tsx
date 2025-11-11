/**
 * @description This component is used to render the CSRF token as a meta tag.
 * this tag can be retrieved for use in forms that require CSRF protection.
 * @constructor
 */
export function CsrfTokenMeta(props: { csrf: string }) {
  return <meta content={props.csrf} name="csrf-token" />;
}
