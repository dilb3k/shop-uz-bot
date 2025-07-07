const { exec } = require('child_process');
const portInUse = require('port-in-use');

// Check if port is already in use
const PORT = process.env.PORT || 5000;

portInUse(PORT).then(inUse => {
    if (inUse) {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
    }
}).catch(err => {
    console.error('Port check error:', err);
    process.exit(1);
});

// Windows-specific process check
if (process.platform === 'win32') {
    exec('tasklist', (err, stdout) => {
        if (err) return;

        const lines = stdout.split('\n');
        const nodeProcesses = lines.filter(line => line.includes('node.exe'));

        if (nodeProcesses.length > 1) {
            console.error('❌ Another Node process is already running');
            process.exit(1);
        }
    });
}