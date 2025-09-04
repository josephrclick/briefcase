import { SidePanel } from '../../sidepanel/SidePanel';

export default {
  title: 'Extension/SidePanel',
  component: SidePanel,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'extension',
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {},
};

export const DarkMode = {
  args: {},
  parameters: {
    backgrounds: { default: 'dark' },
  },
  globals: {
    theme: 'dark',
  },
};

export const WideViewport = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'extensionWide',
    },
  },
};

// Story for testing different tab states
export const SummarizeTab = {
  args: {},
  play: async ({ canvasElement }) => {
    // You can add interactions here to test specific states
  },
};

export const HistoryTab = {
  args: {},
  // Add initial state or interactions to show history tab
};

export const SettingsTab = {
  args: {},
  // Add initial state or interactions to show settings tab
};
