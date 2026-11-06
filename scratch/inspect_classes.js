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
                let nonCellCount = 0;
                const classes = {};
                for (let k = 0; k < g.rect_elements.length; k++) {
                    const cls = g.rect_elements[k]._lastClass || g.rect_elements[k].getAttribute('class');
                    if (cls !== 'cell') {
                        nonCellCount++;
                        classes[cls] = (classes[cls] || 0) + 1;
                    }
                }
                return { total: g.rect_elements.length, nonCellCount, classes };
            })()`,
            returnByValue: true
        });

        console.log("Rect element class counts at spawn:", counts.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

test().catch(console.error);

