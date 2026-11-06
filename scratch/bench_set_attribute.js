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

        const bench = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const uses = Array.from(document.querySelectorAll('use')).filter(u => u.style.display !== 'none');
                
                // Benchmark updating x and y on all active uses
                const t0 = performance.now();
                for (let i = 0; i < uses.length; i++) {
                    const u = uses[i];
                    u.setAttribute("x", "20px");
                }
                const t1 = performance.now();

                return {
                    activeUsesCount: uses.length,
                    durationMs: (t1 - t0).toFixed(3)
                };
            })()`,
            returnByValue: true
        });

        console.log("Benchmark setAttribute on uses:", bench.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

test().catch(console.error);

