const { spawn } = require('child_process');

async function test() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--remote-debugging-port=9346',
        '--headless=new',
        'http://127.0.0.1:8080/test_grid.html?seed=12345'
    ]);
    await new Promise(r => setTimeout(r, 1200));

    try {
        const res = await fetch('http://127.0.0.1:9346/json');
        const list = await res.json();
        const p = list.find(t => t.type === 'page');
        const ws = new WebSocket(p.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let msgId = 1;
        function sendCDP(method, params = {}) {
            return new Promise((resolve, reject) => {
                const reqId = msgId++;
                const handler = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.id === reqId) {
                        ws.removeEventListener('message', handler);
                        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                        else resolve(msg.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id: reqId, method, params }));
            });
        }

        const evalRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const svg = document.getElementById('frame');
                const defs = svg.querySelector('defs');
                
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.id = 'test_inherit_sym';
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.style.stroke = 'inherit';
                path.setAttribute('d', 'M 0 0 L 10 10');
                g.appendChild(path);
                defs.appendChild(g);

                const useEl = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                useEl.setAttribute('href', '#test_inherit_sym');
                useEl.style.stroke = 'rgb(255, 0, 0)';
                svg.appendChild(useEl);

                // Check computed stroke on shadow element or rendered appearance
                // Note: SVG use shadow elements inherit CSS inherited properties by default if path has no stroke specified!
                const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g2.id = 'test_nostyle_sym';
                const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path2.setAttribute('d', 'M 0 0 L 10 10');
                g2.appendChild(path2);
                defs.appendChild(g2);

                const useEl2 = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                useEl2.setAttribute('href', '#test_nostyle_sym');
                useEl2.style.stroke = 'rgb(0, 255, 0)';
                svg.appendChild(useEl2);

                return {
                    use1Stroke: window.getComputedStyle(useEl).stroke,
                    use2Stroke: window.getComputedStyle(useEl2).stroke
                };
            })()`,
            returnByValue: true
        });

        console.log("Result:", evalRes.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

test().catch(console.error);

