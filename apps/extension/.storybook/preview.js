import '../sidepanel/index.css';
import '../sidepanel/styles.css';
import '@arco-design/web-react/dist/css/arco.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    viewport: {
      viewports: {
        extension: {
          name: 'Chrome Extension',
          styles: {
            width: '350px',
            height: '600px',
          },
        },
        extensionWide: {
          name: 'Extension Wide',
          styles: {
            width: '450px',
            height: '600px',
          },
        },
      },
      defaultViewport: 'extension',
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },
  },
  // Global decorators for theming
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      
      // Apply theme to document element
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      
      return (
        <div data-theme={theme} style={{ 
          minHeight: '100vh',
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          color: theme === 'dark' ? '#e0e0e0' : '#333333'
        }}>
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
