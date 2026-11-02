# Project Automation and Agent Guidelines

## Browser Testing Constraints
* **Environment Sandbox:** The Jetski browser subagent runs in a highly restricted sandbox environment. Direct `javascript:` URL injections and global variable reading (`window.*`) are strictly blocked by security policy.
* **Instruction Generation Rule:** When generating automated testing steps for the browser subagent, NEVER instruct it to read properties directly from the global window object. 
* **Preferred Data Exchange Pattern:** Ensure your application scripts output benchmark data or telemetry directly into the browser's console (`console.log`) or drop the payload into a specific hidden DOM element (e.g., `<textarea id="automation-json-dump">`). Instruct the subagent to read the console history or parse the DOM element's text content value instead.