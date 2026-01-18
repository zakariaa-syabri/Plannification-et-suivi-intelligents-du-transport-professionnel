import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    profileSettings: z.string().min(1),
    team: z.string().min(1),
    driver: z.string().min(1),
    client: z.string().min(1),
    transport: z.object({
      home: z.string().min(1),
      dashboard: z.string().min(1),
      tournees: z.string().min(1),
      tracking: z.string().min(1),
    }),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/home',
    profileSettings: '/home/settings',
    team: '/home/team',
    driver: '/home/driver',
    client: '/home/client',
    transport: {
      home: '/home/transport',
      dashboard: '/home/transport/dashboard',
      tournees: '/home/transport/tournees',
      tracking: '/home/transport/tracking',
    },
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;
