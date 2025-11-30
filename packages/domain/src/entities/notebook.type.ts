import { Entity } from '../common/entity';
import { z } from 'zod';
import { CellTypeSchema } from '../enums/cellType';
import { RunModeSchema } from '../enums/runMode';
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
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
          query: '',
          datasources: [],
          isActive: true,
          runMode: 'default',
        },
      ],
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

    return plainToClass(NotebookEntity, NotebookSchema.parse(updatedNotebook));
  }
}
