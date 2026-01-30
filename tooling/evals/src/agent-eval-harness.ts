import { AgentEvalCase } from "./agent-eval-case";

export class AgentEvalHarness<M, I> {
    constructor(private cases: AgentEvalCase<M, I>[]) { }

    async run() {
    }
}