import z from "zod";

export const schema = z.object({
  url: z
    .url()
    .min(1)
    .meta({
      label: 'JSO. Use S3 extension to connect to S3-compatible storage that needs authentication',
      placeholder: 'https://example.com/data.json',
    }),
});