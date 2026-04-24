# DT Fellowship: The Daily Reflection Tree

This project is a deterministic reflection tool built as a submission for the DT Fellowship assignment. It guides an employee through an end-of-day reflection across three psychological axes: **Locus of Control**, **Orientation**, and **Radius of Concern**.

## Project Structure

```
/tree/
  reflection-tree.json    <-- Part A: The tree data (40+ nodes)
  tree-diagram.md         <-- Part A: Mermaid visual diagram
/agent/                   <-- Part B: Runnable Web UI
  index.html
  style.css
  agent.js                <-- The deterministic walker engine
/transcripts/             <-- Part B: Sample run transcripts
  persona-1-transcript.md
  persona-2-transcript.md
write-up.md               <-- Design rationale & psychology
README.md                 <-- This file
```

## How to Run the Agent

The agent is built with vanilla HTML/JS/CSS and requires no build step.

1.  Navigate to the `/agent` directory.
2.  Open `index.html` in any modern web browser.
3.  *Note:* Because the agent fetches `reflection-tree.json`, you may need to serve it via a local server (like `npx serve` or Live Server) due to browser CORS policies for `file://` URIs.

```bash
# Example using python
cd agent
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Design Philosophy

-   **No LLM at Runtime:** The intelligence is encoded into the tree structure itself. The agent uses string interpolation and deterministic branching to create a personalized experience without hallucinations.
-   **Deterministic:** Every path is traceable. Given the same answers, the user will always receive the same reflections and summary.
-   **Psychologically Grounded:** Questions are derived from the work of Julian Rotter (Locus), Carol Dweck (Mindset), and Abraham Maslow (Self-Transcendence).

## The Three Axes

1.  **Locus (Victim vs Victor):** Surfacing agency even on "stormy" days.
2.  **Orientation (Entitlement vs Contribution):** Making discretionary effort visible.
3.  **Radius (Self-Centric vs Altrocentric):** Contextualizing problems within a wider web of others.

---
*Developed for the DeepThought Growth Teams BA/DS Fellowship.*
