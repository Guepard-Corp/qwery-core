import type { AnyActorRef } from 'xstate';

/**
 * Registry for managing actor lifecycle
 */
export class ActorRegistry {
  private actors = new Map<string, AnyActorRef>();

  register(id: string, actor: AnyActorRef): void {
    if (this.actors.has(id)) {
      console.warn(
        `[ActorRegistry] Actor ${id} already registered, stopping previous`,
      );
      this.actors.get(id)?.stop();
    }
    this.actors.set(id, actor);

    // Auto-cleanup on stop
    actor.subscribe((state) => {
      if (state.status === 'stopped') {
        this.actors.delete(id);
      }
    });
  }

  get(id: string): AnyActorRef | undefined {
    return this.actors.get(id);
  }

  stop(id: string): void {
    const actor = this.actors.get(id);
    if (actor) {
      actor.stop();
      this.actors.delete(id);
    }
  }

  stopAll(): void {
    this.actors.forEach((actor) => actor.stop());
    this.actors.clear();
  }

  getAll(): Map<string, AnyActorRef> {
    return new Map(this.actors);
  }
}
