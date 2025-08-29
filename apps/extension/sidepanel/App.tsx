import { FunctionalComponent } from "preact";

interface AppProps {}

export const App: FunctionalComponent<AppProps> = () => {
  return (
    <div className="app">
      <header className="header">
        <h1>Briefcase</h1>
      </header>
      <main className="main">
        <p>Welcome to Briefcase - Your AI-powered web content summarizer</p>
      </main>
    </div>
  );
};
