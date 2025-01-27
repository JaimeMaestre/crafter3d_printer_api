const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());



// Route to execute shell commands
app.post('/shell/execute', (req, res) => {
  const { command } = req.body; // Get command from the request body

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  // Execute the command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.warn(`Stderr: ${stderr}`);
      return res.status(200).json({ stderr });
    }
    return res.status(200).json({ stdout }); // Send back the output
  });
});

// API endpoint to connect to a new network
app.post('/wifi/new-connection', (req, res) => {
  const { ssid, password } = req.body;

  if (!ssid) {
    return res.status(400).json({ error: 'SSID is required' });
  }

  const connectCommand = password
    ? `sudo nmcli device wifi connect "${ssid}" password "${password}" 2>&1`
    : `sudo nmcli device wifi connect "${ssid}" 2>&1`;

  exec(connectCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    if (stdout.includes('successfully activated')) {
      return res.status(200).json({ message: `Successfully connected to ${ssid}` });
    } else {
      return res.status(400).json({ error: stdout.trim() });
    }
  });
});

// API endpoint to fetch available networks
app.get('/wifi/available-networks', (req, res) => {
  exec('sudo nmcli -t -f SSID,SIGNAL,SECURITY dev wifi', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    const networks = stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [ssid, signal, security] = line.split(':');
        return { ssid, signal, security };
      })
      .filter((network) => network.ssid);

    res.status(200).json(networks);
  });
});

// API endpoint to fetch saved connections
app.get('/wifi/saved-connections', (req, res) => {
  exec('sudo nmcli -t -f NAME connection show', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    const connections = stdout.trim().split('\n').filter((name) => name);
    res.status(200).json(connections);
  });
});

// API endpoint to forget a saved connection
app.post('/wifi/forget-connection', (req, res) => {
  const { ssid } = req.body;

  if (!ssid) {
    return res.status(400).json({ error: 'SSID is required' });
  }

  exec(`sudo nmcli connection delete id "${ssid}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    res.status(200).json({ message: `Successfully forgot ${ssid}` });
  });
});

// API endpoint to fetch the currently active connection
app.get('/wifi/active-connection', (req, res) => {
  exec('sudo nmcli -t -f NAME connection show --active', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    const unwantedWords = ['Crafter3D', 'Wired connection 1', 'lo'];
    let activeConnection = stdout.trim();
    unwantedWords.forEach((word) => {
      activeConnection = activeConnection.replace(word, '').trim();
    });

    res.status(200).json({ activeConnection });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
