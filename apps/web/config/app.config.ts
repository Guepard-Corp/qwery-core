import { z } from 'zod';

const production = process.env.NODE_ENV === 'production';

const AppConfigSchema = z
  .object({
    name: z
      .string({
        description: `Qwery Studio"`,
        required_error: `Please provide the variable VITE_PRODUCT_NAME`,
      })
      .min(1),
    title: z
      .string({
        description: `Qwery Studio`,
        required_error: `Please provide the variable VITE_SITE_TITLE`,
      })
      .min(1),
    description: z.string({
      description: `Qwery Studio`,
      required_error: `Please provide the variable VITE_SITE_DESCRIPTION`,
    }),
    url: z
      .string({
        required_error: `Please provide the variable VITE_SITE_URL`,
      })
      .url({
        message: `You are deploying a production build but have entered a VITE_SITE_URL variable using http instead of https. It is very likely that you have set the incorrect URL. The build will now fail to prevent you from from deploying a faulty configuration. Please provide the variable VITE_SITE_URL with a valid URL, such as: 'https://example.com'`,
      }),
    locale: z
      .string({
        description: `en`,
        required_error: `Please provide the variable VITE_DEFAULT_LOCALE`,
      })
      .default('en'),
    theme: z.enum(['light', 'dark', 'system']).default('light'),
    production: z.boolean(),
    themeColor: z.string().default('#ffffff'),
    themeColorDark: z.string().default('#0a0a0a'),
  })
  .refine(
    (schema) => {
      const isCI = import.meta.env.VITE_CI;
      const isDesktop =
        import.meta.env.VITE_DESKTOP_APP === 'true' ||
        import.meta.env.ELECTRON === 'true' ||
        (typeof process !== 'undefined' && process.versions?.electron);

      // Allow HTTP in CI, non-production, or desktop app (localhost is safe)
      if ((isCI ?? !schema.production) || isDesktop) {
        return true;
      }

      // For production web apps, require HTTPS unless it's localhost
      try {
        const url = new URL(schema.url);
        const isLocalhost =
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname === '::1';

        if (isLocalhost) {
          return true;
        }
      } catch {
        // If URL parsing fails, fall through to HTTPS check
      }

      return !schema.url.startsWith('http:');
    },
    {
      message: `Please use a valid HTTPS URL in production.`,
      path: ['url'],
    },
  )
  .refine(
    (schema) => {
      return schema.themeColor !== schema.themeColorDark;
    },
    {
      message: `Please provide different theme colors for light and dark themes.`,
      path: ['themeColor'],
    },
  );

const appConfig = AppConfigSchema.parse({
  name: import.meta.env.VITE_PRODUCT_NAME,
  title: import.meta.env.VITE_SITE_TITLE,
  description: import.meta.env.VITE_SITE_DESCRIPTION,
  url: import.meta.env.VITE_SITE_URL,
  locale: import.meta.env.VITE_DEFAULT_LOCALE,
  theme: import.meta.env.VITE_DEFAULT_THEME_MODE,
  themeColor: import.meta.env.VITE_THEME_COLOR,
  themeColorDark: import.meta.env.VITE_THEME_COLOR_DARK,
  production,
});

export default appConfig;
