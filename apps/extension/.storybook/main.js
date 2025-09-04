/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../sidepanel/**/*.stories.@(js|jsx|ts|tsx)",
    "../src/stories/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-viewport"
  ],
  framework: {
    name: "@storybook/preact-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: (config) => {
    // Preact configuration is handled by @storybook/preact-vite
    return config;
  }
};
export default config;
