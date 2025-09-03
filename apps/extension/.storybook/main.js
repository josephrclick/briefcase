/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../sidepanel/**/*.stories.@(js|jsx|ts|tsx)",
    "../src/stories/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-viewport",
    "@storybook/addon-docs",
    "@storybook/addon-controls"
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: (config) => {
    // Handle Preact JSX
    config.resolve.alias = {
      ...config.resolve.alias,
      "react": "preact/compat",
      "react-dom": "preact/compat"
    };
    return config;
  }
};
export default config;
