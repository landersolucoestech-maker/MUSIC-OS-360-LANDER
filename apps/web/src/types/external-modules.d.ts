declare module '@radix-ui/react-visually-hidden' {
  import * as React from 'react';

  export const Root: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLSpanElement> & React.RefAttributes<HTMLSpanElement>
  >;
  export const VisuallyHidden: typeof Root;
}

declare module 'dompurify' {
  export interface Config {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    [key: string]: unknown;
  }

  export function sanitize(source: string, config?: Config): string;

  const DOMPurify: {
    sanitize: typeof sanitize;
  };

  export default DOMPurify;
}
