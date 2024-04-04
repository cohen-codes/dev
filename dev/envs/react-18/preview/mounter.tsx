import { createMounter } from '@teambit/react.mounter';

export function MyReactProvider({ children }) {
  return children;
}

// @ts-ignore
export default createMounter(MyReactProvider) as any;
