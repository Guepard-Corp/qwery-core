import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Notebook } from '../../entities';
import { CellType, RunMode } from '../../enums';

type Cell = {
  query?: string;
  cellType?: CellType;
  cellId?: number;
  datasources?: string[];
  isActive?: boolean;
  runMode?: RunMode;
  title?: string;
};

@Exclude()
export class NotebookOutput {
  @Expose()
  public id!: string;
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
  public isPublic!: boolean;

  public static new(notebook: Notebook): NotebookOutput {
    return plainToClass(NotebookOutput, notebook);
  }
}

export type CreateNotebookInput = {
  projectId: string;
  title: string;
  description?: string;
};

export type CellInput = {
  query?: string;
  cellType?: CellType;
  cellId?: number;
  datasources?: string[];
  isActive?: boolean;
  runMode?: RunMode;
  title?: string;
};

export type UpdateNotebookInput = {
  id: string;
  projectId?: string; // Required when creating (notebook not found)
  title?: string;
  description?: string;
  cells?: CellInput[];
  datasources?: string[];
};
