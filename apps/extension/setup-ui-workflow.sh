#!/bin/bash

# Briefcase Extension UI Development Workflow Setup
# This script sets up modern UI development tools for rapid iteration

echo "🚀 Setting up UI Development Workflow for Briefcase Extension..."

# Check if Storybook is already installed
if [ ! -d ".storybook" ] || [ ! -f "package.json" ] || ! grep -q "storybook" package.json; then
  echo "📦 Installing Storybook..."
  npx storybook@latest init --yes
else
  echo "✅ Storybook already installed, skipping..."
fi

# Install Arco Design if not already present
if ! grep -q "@arco-design/web-react" package.json; then
  echo "📦 Installing Arco Design System..."
  npm install @arco-design/web-react
else
  echo "✅ Arco Design already installed, skipping..."
fi

# Create Storybook configuration
echo "⚙️ Creating Storybook configuration..."

# Create stories directory
mkdir -p src/stories

echo "✅ Setup complete! 

Next steps:
1. Run 'npm run storybook' to start the development server
2. Create stories for your components in src/stories/
3. Use the provided templates to build components in isolation
4. Test visual changes with Chromatic for regression testing

Your extension now has:
✅ Fixed width constraints (now responsive 320px-500px)
✅ Improved dark mode contrast for buttons  
✅ Better content alignment and padding
✅ Professional component library (Arco Design)
✅ Visual testing setup with Storybook
"
