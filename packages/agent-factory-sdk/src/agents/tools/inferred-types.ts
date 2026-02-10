/**
 * Inferred tool types using InferUITools
 *
 * This file provides type-safe access to tool input/output types
 * based on the actual tool definitions in read-data-agent.actor.ts
 *
 * Note: These types are manually maintained to match the tool definitions.
 * In the future, we can extract tools to a separate file to enable automatic inference.
 */

import type { InferUITool, Tool } from 'ai';
import type { tool } from 'ai';
import { z } from 'zod';
import type {
  ChartConfig,
  ChartTypeSelection,
  SQLQueryResult,
  SchemaData,
} from './types';
import { ChartTypeSchema, type ChartType } from '../types/chart.types';

// ============================================================================
// Tool Type Definitions
// ============================================================================

// These types represent the structure of tools as defined in read-data-agent.actor.ts
// We use type-only imports and manual type definitions since tools are created
// inside a function with runtime dependencies.

type TestConnectionTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<Record<string, never>>;
    execute: () => Promise<string>;
  }>
>;

type GetSchemaTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<{
      viewName: z.ZodOptional<z.ZodString>;
    }>;
    execute: (input: { viewName?: string }) => Promise<{
      schema: SchemaData;
      businessContext: {
        domain: string;
        entities: Array<{ name: string; columns: string[]; views?: string[] }>;
        relationships: Array<{
          fromView: string;
          toView: string;
          fromColumn: string;
          toColumn: string;
          type: string;
          join: string;
        }>;
        vocabulary: Record<
          string,
          {
            businessTerm: string;
            technicalTerms: string[];
            synonyms: string[];
          }
        >;
      };
    }>;
  }>
>;

type RunQueryTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<{
      query: z.ZodString;
    }>;
    execute: (input: { query: string }) => Promise<SQLQueryResult>;
  }>
>;

type SelectChartTypeTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<{
      queryResults: z.ZodObject<{
        rows: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        columns: z.ZodOptional<z.ZodArray<z.ZodString>>;
        sqlQuery: z.ZodOptional<z.ZodString>;
        userInput: z.ZodOptional<z.ZodString>;
      }>;
      sqlQuery: z.ZodOptional<z.ZodString>;
      userInput: z.ZodOptional<z.ZodString>;
    }>;
    execute: (input: {
      queryResults?: {
        rows?: Record<string, unknown>[];
        columns?: string[];
        sqlQuery?: string;
        userInput?: string;
      };
      sqlQuery?: string;
      userInput?: string;
    }) => Promise<ChartTypeSelection>;
  }>
>;

type GenerateChartTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<{
      chartType: typeof ChartTypeSchema;
      queryResults: z.ZodObject<{
        rows: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        columns: z.ZodOptional<z.ZodArray<z.ZodString>>;
        sqlQuery: z.ZodOptional<z.ZodString>;
        userInput: z.ZodOptional<z.ZodString>;
      }>;
      sqlQuery: z.ZodOptional<z.ZodString>;
      userInput: z.ZodOptional<z.ZodString>;
    }>;
    execute: (input: {
      chartType: ChartType;
      queryResults?: {
        rows?: Record<string, unknown>[];
        columns?: string[];
        sqlQuery?: string;
        userInput?: string;
      };
      sqlQuery?: string;
      userInput?: string;
    }) => Promise<ChartConfig>;
  }>
>;

// ============================================================================
// Tool Set Type (represents all tools)
// ============================================================================

type RenameTableTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<{
      oldTableName: z.ZodString;
      newTableName: z.ZodString;
    }>;
    execute: (input: {
      oldTableName: string;
      newTableName: string;
    }) => Promise<{
      oldTableName: string;
      newTableName: string;
      message: string;
    }>;
  }>
>;

type DeleteTableTool = ReturnType<
  typeof tool<{
    description: string;
    inputSchema: z.ZodObject<{
      tableNames: z.ZodArray<z.ZodString>;
    }>;
    execute: (input: { tableNames: string[] }) => Promise<{
      deletedTables: string[];
      failedTables: Array<{ tableName: string; error: string }>;
      message: string;
    }>;
  }>
>;

export type ReadDataAgentTools = {
  testConnection: TestConnectionTool;
  renameTable: RenameTableTool;
  deleteTable: DeleteTableTool;
  getSchema: GetSchemaTool;
  runQuery: RunQueryTool;
  selectChartType: SelectChartTypeTool;
  generateChart: GenerateChartTool;
};

// ============================================================================
// Inferred Tool Types
// ============================================================================

// Helper type to work around complex Tool constraint issues with InferUITool
// InferUITool expects a Tool type, but our tools have a slightly different structure
// We use intersection type to satisfy the constraint
type InferUIToolUnsafe<T> = InferUITool<T & Tool>;

// Using type assertions to work around complex Tool constraint issues with InferUITool
export type ReadDataAgentToolTypes = {
  [K in keyof ReadDataAgentTools]: InferUIToolUnsafe<ReadDataAgentTools[K]>;
};

// Individual tool type exports for convenience
export type TestConnectionToolType = InferUIToolUnsafe<TestConnectionTool>;
export type RenameTableToolType = InferUIToolUnsafe<RenameTableTool>;
export type DeleteTableToolType = InferUIToolUnsafe<DeleteTableTool>;
export type GetSchemaToolType = InferUIToolUnsafe<GetSchemaTool>;
export type RunQueryToolType = InferUIToolUnsafe<RunQueryTool>;
export type SelectChartTypeToolType = InferUIToolUnsafe<SelectChartTypeTool>;
export type GenerateChartToolType = InferUIToolUnsafe<GenerateChartTool>;

// ============================================================================
// Tool Name Type
// ============================================================================

export type ToolName = keyof ReadDataAgentTools;

// ============================================================================
// Helper: Get tool input/output types by name
// ============================================================================

export type ToolInput<T extends ToolName> = ReadDataAgentToolTypes[T]['input'];
export type ToolOutput<T extends ToolName> =
  ReadDataAgentToolTypes[T]['output'];
