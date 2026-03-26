import {
  forwardRef,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  useStore,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import {
  CircleHelp,
  Hand,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Canvas } from '../../ai-elements/canvas';
import type { SchemaGraphMetadata, TableNode } from './types';
import { SchemaGraphLegend } from './legend';
import { TableNode as TableNodeComponent } from './table-node';
import {
  getGraphDataFromMetadata,
  getLayoutedElementsViaDagre,
  getLayoutedElementsViaLocalStorage,
} from './utils';

function getFitViewOptions(nodeCount: number): {
  padding: number;
  minZoom: number;
  maxZoom: number;
} {
  if (nodeCount <= 8) return { padding: 0.12, minZoom: 0.9, maxZoom: 1.2 };
  if (nodeCount <= 20) return { padding: 0.1, minZoom: 0.75, maxZoom: 1.1 };
  if (nodeCount <= 60) return { padding: 0.08, minZoom: 0.6, maxZoom: 1.0 };
  return { padding: 0.06, minZoom: 0.45, maxZoom: 0.9 };
}

export interface SchemaGraphProps {
  metadata: SchemaGraphMetadata | null | undefined;
  storageKey?: string;
  selectedSchemas?: string[];
  searchQuery?: string;
}

export interface SchemaGraphHandle {
  resetLayout: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  focusTable: (tableName: string) => void;
}

function getViewportStorageKey(storageKey?: string): string | null {
  if (!storageKey) return null;
  return `${storageKey}:viewport`;
}

const SchemaGraphInner = forwardRef<SchemaGraphHandle, SchemaGraphProps>(
  ({ metadata, storageKey, selectedSchemas = [], searchQuery = '' }, ref) => {
    const isInitialLayoutDoneRef = useRef(false);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const [focusedTableId, setFocusedTableId] = useState<string | null>(null);
    const [canvasAspectRatio, setCanvasAspectRatio] = useState(16 / 9);
    const [isGrabCursorMode, setIsGrabCursorMode] = useState(true);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const reactFlowInstance = useReactFlow<TableNode, Edge>();
    const isCanvasInteractive = useStore(
      (state) => state.nodesDraggable || state.elementsSelectable,
    );
    const lastLockedToastAtRef = useRef(0);
    const previousInteractiveStateRef = useRef<boolean | null>(null);

    const nodeTypes = useMemo<NodeTypes>(
      () => ({
        table: TableNodeComponent,
      }),
      [],
    );

    const { nodes: baseNodes, edges } = useMemo(
      () => getGraphDataFromMetadata(metadata, selectedSchemas),
      [metadata, selectedSchemas],
    );

    const nodes = useMemo(() => {
      if (!focusedTableId) return baseNodes;
      return baseNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isFocused: node.id === focusedTableId,
        },
      }));
    }, [baseNodes, focusedTableId]);

    const filteredNodes = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return nodes;

      return nodes.filter((node) => {
        const tableName = node.data.name.toLowerCase();
        return tableName.includes(q);
      });
    }, [nodes, searchQuery]);

    const filteredEdges = useMemo(() => {
      const allowed = new Set(filteredNodes.map((n) => String(n.id)));
      return edges.filter(
        (e) => allowed.has(String(e.source)) && allowed.has(String(e.target)),
      );
    }, [edges, filteredNodes]);

    useEffect(() => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper || typeof window === 'undefined') return;

      const updateAspectRatio = () => {
        const width = wrapper.clientWidth;
        const height = wrapper.clientHeight;
        if (width > 0 && height > 0) {
          setCanvasAspectRatio(width / height);
        }
      };

      updateAspectRatio();
      const observer = new window.ResizeObserver(updateAspectRatio);
      observer.observe(wrapper);

      return () => {
        observer.disconnect();
      };
    }, []);

    useEffect(() => {
      if (!metadata?.tables?.length) return;

      const savedPositionsRaw =
        storageKey && typeof window !== 'undefined'
          ? window.localStorage.getItem(storageKey)
          : null;
      const savedPositions = savedPositionsRaw
        ? (JSON.parse(savedPositionsRaw) as Record<
            string,
            { x: number; y: number }
          >)
        : null;

      const { nodes: layoutNodes, edges: layoutEdges } = savedPositions
        ? getLayoutedElementsViaLocalStorage(
            filteredNodes,
            filteredEdges,
            savedPositions,
            { aspectRatio: canvasAspectRatio },
          )
        : getLayoutedElementsViaDagre(filteredNodes, filteredEdges, {
            aspectRatio: canvasAspectRatio,
          });

      reactFlowInstance.setNodes(layoutNodes);
      reactFlowInstance.setEdges(layoutEdges);
      setTimeout(() => {
        const viewportKey = getViewportStorageKey(storageKey);
        const savedViewportRaw =
          viewportKey && typeof window !== 'undefined'
            ? window.localStorage.getItem(viewportKey)
            : null;
        const savedViewport = savedViewportRaw
          ? (JSON.parse(savedViewportRaw) as {
              x: number;
              y: number;
              zoom: number;
            })
          : null;

        if (savedViewport) {
          reactFlowInstance.setViewport(savedViewport, { duration: 0 });
        } else {
          reactFlowInstance.fitView({
            ...getFitViewOptions(layoutNodes.length),
            duration: 600,
          });
        }
        isInitialLayoutDoneRef.current = true;
      }, 0);
    }, [
      metadata,
      filteredNodes,
      filteredEdges,
      reactFlowInstance,
      storageKey,
      canvasAspectRatio,
    ]);

    const saveNodePositions = useCallback(() => {
      if (!storageKey) return;
      const currentNodes = reactFlowInstance.getNodes();
      if (!currentNodes.length) return;

      const positions = currentNodes.reduce<
        Record<string, { x: number; y: number }>
      >((acc, node) => {
        acc[node.id] = node.position;
        return acc;
      }, {});

      window.localStorage.setItem(storageKey, JSON.stringify(positions));
    }, [storageKey, reactFlowInstance]);

    const saveViewport = useCallback(() => {
      const viewportKey = getViewportStorageKey(storageKey);
      if (!viewportKey) return;
      const viewport = reactFlowInstance.getViewport();
      window.localStorage.setItem(viewportKey, JSON.stringify(viewport));
    }, [storageKey, reactFlowInstance]);

    const resetLayout = useCallback(() => {
      const currentNodes = reactFlowInstance.getNodes();
      const currentEdges = reactFlowInstance.getEdges();

      const { nodes: layoutNodes, edges: layoutEdges } =
        getLayoutedElementsViaDagre(
          currentNodes as unknown as TableNode[],
          currentEdges,
          { aspectRatio: canvasAspectRatio },
        );

      reactFlowInstance.setNodes(layoutNodes);
      reactFlowInstance.setEdges(layoutEdges);
      setTimeout(() => {
        reactFlowInstance.fitView({
          ...getFitViewOptions(layoutNodes.length),
          duration: 600,
        });
        setTimeout(() => {
          saveViewport();
        }, 700);
      }, 0);
      saveNodePositions();
    }, [reactFlowInstance, saveNodePositions, canvasAspectRatio, saveViewport]);

    const fitCurrentView = useCallback(() => {
      const currentNodes = reactFlowInstance.getNodes();
      if (!currentNodes.length) return;
      reactFlowInstance.fitView({
        ...getFitViewOptions(currentNodes.length),
        duration: 300,
      });
      setTimeout(() => {
        saveViewport();
      }, 350);
    }, [reactFlowInstance, saveViewport]);

    const zoomIn = useCallback(() => {
      void reactFlowInstance.zoomIn({ duration: 180 });
      setTimeout(() => {
        saveViewport();
      }, 220);
    }, [reactFlowInstance, saveViewport]);

    const zoomOut = useCallback(() => {
      void reactFlowInstance.zoomOut({ duration: 180 });
      setTimeout(() => {
        saveViewport();
      }, 220);
    }, [reactFlowInstance, saveViewport]);

    const focusTable = useCallback(
      (tableName: string) => {
        const query = tableName.toLowerCase();
        const currentNodes = reactFlowInstance.getNodes();
        const node = currentNodes.find(
          (n) => n.data.name.toLowerCase() === query,
        );

        if (node) {
          setFocusedTableId(node.id);
          reactFlowInstance.fitView({
            nodes: [node],
            duration: 800,
            padding: 0.5,
          });
        }
      },
      [reactFlowInstance],
    );

    useImperativeHandle(ref, () => ({
      resetLayout,
      zoomIn,
      zoomOut,
      focusTable,
    }));

    const notifyLockedCanvasDragAttempt = useCallback(
      (event: ReactMouseEvent<Element>) => {
        const pane = (event.target as HTMLElement | null)?.closest(
          '.react-flow__pane',
        );
        if (!pane) return;
        if (isCanvasInteractive) return;
        const now = Date.now();
        if (now - lastLockedToastAtRef.current < 1500) return;
        lastLockedToastAtRef.current = now;
        toast.info('Canvas is locked. Unlock it to drag and move nodes.');
      },
      [isCanvasInteractive],
    );

    useEffect(() => {
      const previousState = previousInteractiveStateRef.current;
      if (previousState === null) {
        previousInteractiveStateRef.current = isCanvasInteractive;
        return;
      }

      if (previousState !== isCanvasInteractive) {
        toast.info(
          isCanvasInteractive
            ? 'Schema graph unlocked.'
            : 'Schema graph locked.',
        );
      }

      previousInteractiveStateRef.current = isCanvasInteractive;
    }, [isCanvasInteractive]);

    useEffect(() => {
      if (typeof window === 'undefined') return;

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const target = event.target as HTMLElement | null;
        const isTypingTarget =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable;
        if (isTypingTarget) return;

        const key = event.key.toLowerCase();
        if (key === 'f') {
          event.preventDefault();
          fitCurrentView();
          return;
        }

        if (key === 'h') {
          event.preventDefault();
          setIsGrabCursorMode(true);
          return;
        }

        if (key === 'v') {
          event.preventDefault();
          setIsGrabCursorMode(false);
          return;
        }

        if (key === 'r') {
          event.preventDefault();
          resetLayout();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
      };
    }, [fitCurrentView, resetLayout]);

    if (!metadata) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-muted-foreground text-sm">
            No metadata available for this datasource.
          </p>
        </div>
      );
    }

    if (!metadata.tables?.length) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-muted-foreground text-sm">
            This datasource has no tables.
          </p>
        </div>
      );
    }

    return (
      <div ref={canvasWrapperRef} className="relative h-full w-full">
        <Canvas
          defaultNodes={[]}
          defaultEdges={[]}
          fitView={false}
          nodeTypes={nodeTypes}
          panOnDrag={isGrabCursorMode}
          selectionOnDrag={!isGrabCursorMode}
          className={
            isGrabCursorMode
              ? '[&_.react-flow__pane]:cursor-grab [&_.react-flow__pane:active]:cursor-grabbing'
              : '[&_.react-flow__pane]:cursor-default'
          }
          proOptions={{ hideAttribution: true }}
          selectionMode={SelectionMode.Partial}
          onNodeDragStop={() => {
            if (isInitialLayoutDoneRef.current) {
              saveNodePositions();
            }
          }}
          onMoveEnd={() => {
            if (isInitialLayoutDoneRef.current) {
              saveViewport();
            }
          }}
          onPaneClick={() => setFocusedTableId(null)}
          onMouseDown={notifyLockedCanvasDragAttempt}
        >
          <Background
            gap={16}
            className="[&>*]:stroke-muted opacity-[12%]"
            variant={BackgroundVariant.Dots}
            color="inherit"
          />
          <Controls
            showZoom={false}
            showFitView={false}
            showInteractive={true}
            fitViewOptions={getFitViewOptions(filteredNodes.length)}
            position="top-right"
            className="border-border/50 [&_.react-flow__controls-button]:border-border/50 [&_.react-flow__controls-interactive]:before:bg-border overflow-hidden rounded-md border shadow-sm [--xy-controls-button-background-color-default:#52525b] [--xy-controls-button-background-color-hover-default:#3f3f46] [--xy-controls-button-color-default:#fafafa] [--xy-controls-button-color-hover-default:#fafafa] dark:[--xy-controls-button-background-color-default:#ffffff] dark:[--xy-controls-button-background-color-hover-default:#f4f4f5] dark:[--xy-controls-button-color-default:#111111] dark:[--xy-controls-button-color-hover-default:#111111] [&_.react-flow__controls-button]:border-b [&_.react-flow__controls-button]:!bg-[var(--xy-controls-button-background-color-default)] [&_.react-flow__controls-button]:last:border-b-0 hover:[&_.react-flow__controls-button]:!bg-[var(--xy-controls-button-background-color-hover-default)] [&_.react-flow__controls-button_svg]:!text-[var(--xy-controls-button-color-default)] hover:[&_.react-flow__controls-button_svg]:!text-[var(--xy-controls-button-color-hover-default)] [&_.react-flow__controls-button_svg_*]:!fill-current [&_.react-flow__controls-button_svg_*]:!stroke-current [&_.react-flow__controls-interactive]:relative [&_.react-flow__controls-interactive]:before:absolute [&_.react-flow__controls-interactive]:before:inset-x-0 [&_.react-flow__controls-interactive]:before:top-0 [&_.react-flow__controls-interactive]:before:h-px"
          >
            <ControlButton
              aria-label="Zoom in"
              title="Zoom in"
              onClick={zoomIn}
            >
              <Plus className="h-4 w-4 !text-zinc-50 dark:!text-zinc-900" />
            </ControlButton>
            <ControlButton
              aria-label="Zoom out"
              title="Zoom out"
              onClick={zoomOut}
            >
              <Minus className="h-4 w-4 !text-zinc-50 dark:!text-zinc-900" />
            </ControlButton>
            <ControlButton
              aria-label={
                isGrabCursorMode
                  ? 'Switch to pointer cursor'
                  : 'Switch to grab cursor'
              }
              title={
                isGrabCursorMode
                  ? 'Switch to pointer cursor'
                  : 'Switch to grab cursor'
              }
              onClick={() => setIsGrabCursorMode((prev) => !prev)}
            >
              {isGrabCursorMode ? (
                <MousePointer2 className="h-4 w-4 !text-zinc-50 dark:!text-zinc-900" />
              ) : (
                <Hand className="h-4 w-4 !text-zinc-50 dark:!text-zinc-900" />
              )}
            </ControlButton>
            <ControlButton
              aria-label="Fit view"
              title="Fit view"
              onClick={fitCurrentView}
            >
              <Maximize className="h-4 w-4 !text-zinc-50 dark:!text-zinc-900" />
            </ControlButton>
            <ControlButton
              aria-label={isGuideOpen ? 'Hide guide' : 'Show guide'}
              title={isGuideOpen ? 'Hide guide' : 'Show guide'}
              onClick={() => setIsGuideOpen((prev) => !prev)}
              className="[&_svg_*]:!fill-none"
            >
              <CircleHelp className="h-4 w-4 !text-zinc-50 dark:!text-zinc-900" />
            </ControlButton>
          </Controls>
          {isGuideOpen && (
            <div className="bg-background/95 text-foreground border-border absolute top-2 right-14 z-10 w-56 rounded-md border p-2 text-[10px] shadow-md backdrop-blur-sm">
              <div className="mb-1 font-semibold">Graph Guide</div>
              <div className="space-y-0.5">
                <div>
                  <span className="text-muted-foreground">F</span> Fit view
                </div>
                <div>
                  <span className="text-muted-foreground">H</span> Hand mode
                </div>
                <div>
                  <span className="text-muted-foreground">V</span> Pointer mode
                </div>
                <div>
                  <span className="text-muted-foreground">R</span> Reset layout
                </div>
                <div className="pt-1 text-[9px] text-zinc-600 dark:text-zinc-300">
                  Locked canvas prevents drag. Use lock button or press H.
                </div>
              </div>
            </div>
          )}
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            className="border-border/40 bg-background/50 !right-1 !bottom-10 overflow-hidden rounded-md border shadow-none"
            nodeClassName="fill-muted stroke-border"
            maskColor="rgba(150, 150, 150, 0.4)"
          />
          <SchemaGraphLegend />
        </Canvas>
      </div>
    );
  },
);

SchemaGraphInner.displayName = 'SchemaGraphInner';

export const SchemaGraph = forwardRef<SchemaGraphHandle, SchemaGraphProps>(
  (props, ref) => {
    return (
      <ReactFlowProvider>
        <SchemaGraphInner {...props} ref={ref} />
      </ReactFlowProvider>
    );
  },
);

SchemaGraph.displayName = 'SchemaGraph';
