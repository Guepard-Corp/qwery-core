export interface AgentEvalCase<M, I> {
    id: string
    input: M[]
    
    // What to evaluate
    expected: {
      finalIntent?: I
      toolsCalled?: { name: string; argsMatch?: Record<string, unknown> }[]
      toolsNotCalled?: string[]
      statesVisited?: string[]
      sqlContains?: string[]  // for read-data
      responseContains?: string[]
      taskSuccess: boolean  // ground truth
    }
  }