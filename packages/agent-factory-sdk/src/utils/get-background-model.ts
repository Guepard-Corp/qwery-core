/**
 * Utility to get the default model for background services (intent detection, summarization, etc.)
 * This allows configuration of a separate model for background tasks vs. main chat.
 */
export function getBackgroundModel(): string {
    const model =
        process.env.DEFAULT_BACKGROUND_MODEL ||
        process.env.DEFAULT_MODEL ||
        '';

    if (!model) {
        throw new Error(
            '[AgentFactory] Missing DEFAULT_BACKGROUND_MODEL or DEFAULT_MODEL environment variable. ' +
            'Please set one of these to configure the model for background services. ' +
            'Example: DEFAULT_BACKGROUND_MODEL=llama-cpp/qwen2.5-7b-instruct',
        );
    }

    return model;
}
