const { spawn } = require('child_process');

async function test() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--remote-debugging-port=9340',
        '--headless=new',
        'http://127.0.0.1:8080/test_grid.html?seed=12345'
    ]);
    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9340/json');
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

        const counts = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                return {
                    bridges: g.bridge_elements.filter(Boolean).length,
                    structures: g.structure_elements.filter(Boolean).length,
                    trees: g.tree_elements.filter(Boolean).length,
                    flora: g.flora_elements.filter(Boolean).length,
                    roofs: g.roof_elements.filter(Boolean).length,
                    reticles: g.reticle_elements.filter(Boolean).length
                };
            })()`,
            returnByValue: true
        });

        console.log("Pool counts at spawn:", counts.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

test().catch(console.error);

