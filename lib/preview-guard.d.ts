// Preview-only type guard so accidental imports don't explode the build.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@lib/payroll/*' { const x: any; export = x; }
declare module '@lib/statutory/*' { const x: any; export = x; }
/* eslint-enable @typescript-eslint/no-explicit-any */
