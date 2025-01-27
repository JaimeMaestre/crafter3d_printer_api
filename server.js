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

  exec(connectCommand, (connectError, connectStdout, connectStderr) => {
    if (connectError) {
      console.error(`Error connecting to network: ${connectStderr || connectError.message}`);
      if (connectStderr.includes('invalid password')) {
        exec(`sudo nmcli connection delete id "${ssid}"`)
        return res.status(401).json({ error: 'Invalid password provided' });
      }
      return res.status(500).json({ error: connectStderr || connectError.message });
    }

    // Check if the connection was successfully activated
    if (connectStdout.includes('successfully activated')) {
      return res.status(200).json({ message: `Successfully connected to ${ssid}` });
    } else {
      console.error(`Unexpected connection error: ${connectStdout}`);
      return res.status(400).json({ error: connectStdout.trim() });
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
      .filter((network) => network.ssid); // Filter out any empty SSIDs

    // Remove duplicates by SSID
    const uniqueNetworks = [];
    const seenSSIDs = new Set();

    networks.forEach((network) => {
      if (!seenSSIDs.has(network.ssid)) {
        seenSSIDs.add(network.ssid);
        uniqueNetworks.push(network);
      }
    });

    res.status(200).json(uniqueNetworks);
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

// API endpoint to connect to a known SSID
app.post('/wifi/connect-wifi', (req, res) => {
  const { ssid } = req.body;

  if (!ssid) {
    return res.status(400).json({ error: 'SSID is required' });
  }

  // Command to activate a known SSID
  const connectCommand = `sudo nmcli connection up id "${ssid}" 2>&1`;

  exec(connectCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error connecting to network: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    if (stdout.includes('Connection successfully activated')) {
      return res.status(200).json({ message: `Successfully connected to ${ssid}` });
    } else {
      return res.status(400).json({ error: stdout.trim() });
    }
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
