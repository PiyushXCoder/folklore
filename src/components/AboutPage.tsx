import logo from "../assets/accordion.svg";
import { ISSUES_URL, REPO_URL, openExternal } from "../lib/menuActions";
import pkg from "../../package.json";

export function AboutPage() {
  return (
    <div className="about-page">
      <img src={logo} alt="" width={48} height={48} />
      <h1>folklore</h1>
      <p className="about-version">v{pkg.version}</p>
      <p className="about-summary">A viewer for superlore docs — desktop app and web app, one codebase.</p>
      <div className="about-links">
        <button onClick={() => openExternal(REPO_URL)}>Repository</button>
        <button onClick={() => openExternal(ISSUES_URL)}>Report Issue</button>
      </div>
      <button onClick={() => window.close()}>Close</button>
    </div>
  );
}
