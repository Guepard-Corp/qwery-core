import { z } from 'zod';

const RouteMatchingEnd = z
  .union([z.boolean(), z.function().args(z.string()).returns(z.boolean())])
  .default(false)
  .optional();

const Divider = z.object({
  divider: z.literal(true),
});

const RouteChildElement = z.object({
  label: z.string(),
  labelSuffix: z.string().optional(),
  path: z.string(),
  Icon: z.custom<React.ReactNode>().optional(),
  end: RouteMatchingEnd,
  renderAction: z.custom<React.ReactNode>().optional(),
  title: z.string().optional(),
});

const RouteSubChild = z.object({
  label: z.string(),
  labelSuffix: z.string().optional(),
  path: z.string(),
  Icon: z.custom<React.ReactNode>().optional(),
  end: RouteMatchingEnd,
  renderAction: z.custom<React.ReactNode>().optional(),
  title: z.string().optional(),
});

const RouteGroupChild = z.object({
  label: z.string(),
  labelSuffix: z.string().optional(),
  Icon: z.custom<React.ReactNode>().optional(),
  end: RouteMatchingEnd,
  renderAction: z.custom<React.ReactNode>().optional(),
  children: z.array(RouteChildElement).default([]).optional(),
  collapsible: z.boolean().default(false).optional(),
  collapsed: z.boolean().default(false).optional(),
  title: z.string().optional(),
});

const RouteChild = z.object({
  label: z.string(),
  labelSuffix: z.string().optional(),
  path: z.string(),
  Icon: z.custom<React.ReactNode>().optional(),
  end: RouteMatchingEnd,
  children: z.array(RouteSubChild).default([]).optional(),
  collapsible: z.boolean().default(false).optional(),
  collapsed: z.boolean().default(false).optional(),
  renderAction: z.custom<React.ReactNode>().optional(),
  title: z.string().optional(),
});

const RouteGroup = z.object({
  label: z.string(),
  labelSuffix: z.string().optional(),
  collapsible: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  children: z.array(z.union([RouteChild, RouteGroupChild])),
  renderAction: z.custom<React.ReactNode>().optional(),
});

export const NavigationConfigSchema = z.object({
  routes: z.array(z.union([RouteGroup, Divider])),
});
