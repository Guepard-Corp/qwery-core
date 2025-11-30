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
    joinTeam: z.string().min(1),
    organizations: z.string().min(1),
    organization: z.string().min(1),
    organizationView: z.string().min(1),
    organizationDatasources: z.string().min(1),
    organizationTeam: z.string().min(1),
    organizationIntegrations: z.string().min(1),
    organizationUsage: z.string().min(1),
    organizationBilling: z.string().min(1),
    organizationSettings: z.string().min(1),
    project: z.string().min(1),
    projectQuery: z.string().min(1),
    projectDatasources: z.string().min(1),
    projectSchemas: z.string().min(1),
    projectSettings: z.string().min(1),
    projectDatasourceView: z.string().min(1),
    newProjectDatasource: z.string().min(1),
    availableSources: z.string().min(1),
    projectNotebook: z.string().min(1),
    projectPlayground: z.string().min(1),
    projectConversation: z.string().min(1),
    conversation: z.string().min(1),
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
    home: '/',
    joinTeam: '/join',
    organizations: '/organizations',
    organization: '/org/[slug]',
    organizationView: '/org/[slug]',
    organizationDatasources: '/org/[slug]/ds',
    organizationTeam: '/org/[slug]/team',
    organizationIntegrations: '/org/[slug]/integrations',
    organizationUsage: '/org/[slug]/usage',
    organizationBilling: '/org/[slug]/billing',
    organizationSettings: '/org/[slug]/settings',
    project: '/prj/[slug]',
    projectQuery: '/prj/[slug]/query',
    projectDatasources: '/prj/[slug]/ds',
    projectSchemas: '/prj/[slug]/schemas',
    projectSettings: '/prj/[slug]/settings',
    projectDatasourceView: '/ds/[slug]',
    availableSources: '/prj/[slug]/ds/new',
    newProjectDatasource: '/prj/[slug]/ds/[name]/new',
    projectNotebook: '/notebook/[slug]',
    projectPlayground: '/prj/[slug]/playground',
    projectConversation: '/prj/[slug]/c',
    conversation: '/c/[slug]',
  },
} satisfies z.infer<typeof PathsSchema>);

export function createPath(path: string, slug: string) {
  return path.replace('[slug]', slug);
}

export default pathsConfig;
