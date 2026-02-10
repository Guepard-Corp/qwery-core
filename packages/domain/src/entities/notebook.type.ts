import { Entity } from '../common/entity';
import { z } from 'zod';
import { CellTypeSchema } from '../enums/cellType';
import { RunModeSchema } from '../enums/runMode';
import {
  Exclude,
  Expose,
  instanceToPlain,
  plainToClass,
  Type,
} from 'class-transformer';
import { generateIdentity } from '../utils/identity.generator';
import { CreateNotebookInput, UpdateNotebookInput } from '../usecases';

const CellSchema = z.object({
  query: z.string().optional().describe('The query of the cell'),
  cellType: z.enum(CellTypeSchema.options).describe('The type of the cell'),
  cellId: z.number().int().min(1).describe('The cell identifier'),
  datasources: z
    .array(z.string().min(1))
    .describe('The datasources to use for the cell'),
  isActive: z.boolean().describe('Whether the cell is active'),
  runMode: z.enum(RunModeSchema.options).describe('The run mode of the cell'),
  title: z.string().optional().describe('The optional title of the cell'),
});

type Cell = z.infer<typeof CellSchema>;

/**
 * Notebook schema
 * Notebook is a collection of cells that can be run in order.
 * This schema is used to validate the notebook data
 */
const NotebookSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the notebook'),
  projectId: z
    .string()
    .uuid()
    .describe('The unique identifier for the project'),
  title: z.string().min(1).max(255).describe('The title of the notebook'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .optional()
    .describe('The description of the notebook'),
  slug: z.string().min(1).describe('The slug of the notebook'),
  version: z.number().int().min(1).describe('The version of the notebook'),
  createdAt: z.date().describe('The date and time the notebook was created'),
  updatedAt: z
    .date()
    .describe('The date and time the notebook was last updated'),
  datasources: z
    .array(z.string().min(1))
    .describe('The datasources to use for the Notebook'),
  cells: z.array(CellSchema),
  createdBy: z
    .string()
    .uuid()
    .optional()
    .describe('The user who created the notebook'),
  isPublic: z
    .boolean()
    .default(false)
    .describe('If true, this notebook is publicly viewable'),
  remixedFrom: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .describe('If set, this notebook was remixed from another notebook'),
});

export type Notebook = z.infer<typeof NotebookSchema>;

@Exclude()
export class NotebookEntity extends Entity<string, typeof NotebookSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public name!: string;
  @Expose()
  public title!: string;
  @Expose()
  public description!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public version!: number;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;
  @Expose()
  public datasources!: string[];
  @Expose()
  public cells!: Cell[];
  @Expose()
  public createdBy?: string;
  @Expose()
  public isPublic!: boolean;
  @Expose()
  public remixedFrom?: string | null;

  public static create(newNotebook: CreateNotebookInput): NotebookEntity {
    const { id, slug } = generateIdentity();
    const now = new Date();
    const notebook: Notebook = {
      id,
      projectId: newNotebook.projectId,
      title: newNotebook.title,
      description: newNotebook.description,
      slug,
      version: 1,
      createdAt: now,
      updatedAt: now,
      datasources: [],
      cells: [
        {
          cellId: 1,
          cellType: 'query',
          query: '\n'.repeat(9), // 10 lines total (9 newlines + 1 empty line)
          datasources: [],
          isActive: true,
          runMode: 'default',
          title: 'Cell 1',
        },
      ],
      isPublic: false,
    };

    return plainToClass(NotebookEntity, NotebookSchema.parse(notebook));
  }

  public static update(
    notebook: Notebook,
    notebookDTO: UpdateNotebookInput,
  ): NotebookEntity {
    const date = new Date();
    const { cells, ...restDTO } = notebookDTO;

    const updatedNotebook: Notebook = {
      ...notebook,
      ...restDTO,
      ...(cells !== undefined && { cells: cells as Cell[] }),
      updatedAt: date,
    };

    const transformed = plainToClass(NotebookEntity, updatedNotebook);

    const plainData = instanceToPlain(transformed) as Notebook;

    return plainToClass(NotebookEntity, NotebookSchema.parse(plainData));
  }
}
