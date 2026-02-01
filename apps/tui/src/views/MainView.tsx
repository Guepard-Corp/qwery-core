import type { AppState } from '../state/types.ts';
import { Logo } from '../components/Logo.tsx';
import { InputSection } from '../components/InputSection.tsx';
import { Shortcuts } from '../components/Shortcuts.tsx';
import { Tip } from '../components/Tip.tsx';
import { StatusBar } from '../components/StatusBar.tsx';

interface MainViewProps {
  state: AppState;
}

export function MainView({ state }: MainViewProps) {
  const logo = <Logo />;
  const inputSection = (
    <InputSection
      input={state.input}
      menuItems={state.menuItems}
      selectedIdx={state.selectedIdx}
      width={state.width}
    />
  );
  const shortcuts = <Shortcuts />;
  const tip = <Tip />;
  const statusBar = <StatusBar width={state.width} mesh={state.meshStatus} />;

  return (
    <box
      flexDirection="column"
      width={state.width}
      height={state.height}
      flexGrow={1}
    >
      <box
        flexGrow={1}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
      >
        <box alignItems="center" flexDirection="column">
          {logo}
        </box>
        <box height={2} />
        <box alignItems="center">{inputSection}</box>
        <box height={2} />
        <box alignItems="center">{shortcuts}</box>
        <box height={2} />
        <box alignItems="center">{tip}</box>
      </box>
      {statusBar}
    </box>
  );
}
