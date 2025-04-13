const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
const fs = require('fs');
const path = require('path');

// post
app.post('/config-save-file/printer', (req, res) => {
  const { content } = req.body;
  const filePath = '/home/crafter3d/printer_data/config/printer.cfg';

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  fs.writeFile(filePath, content, 'utf8', (error) => {
    if (error) {
      console.error(`Error writing file: ${error.message}`);
      return res.status(500).json({ error: 'Failed to write the configuration file.' });
    }
    res.status(200).json({ message: 'Configuration file updated successfully.' });
  });
});

app.post('/config-save-file/standard', (req, res) => {
  const { content } = req.body;
  const filePath = '/home/crafter3d/printer_data/config/standard.cfg';

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  fs.writeFile(filePath, content, 'utf8', (error) => {
    if (error) {
      console.error(`Error writing file: ${error.message}`);
      return res.status(500).json({ error: 'Failed to write the configuration file.' });
    }
    res.status(200).json({ message: 'Configuration file updated successfully.' });
  });
});

app.post('/config-save-file/infinite-z', (req, res) => {
  const { content } = req.body;
  const filePath = '/home/crafter3d/printer_data/config/infinite-z.cfg';

  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  fs.writeFile(filePath, content, 'utf8', (error) => {
    if (error) {
      console.error(`Error writing file: ${error.message}`);
      return res.status(500).json({ error: 'Failed to write the configuration file.' });
    }
    res.status(200).json({ message: 'Configuration file updated successfully.' });
  });
});

app.post('/config-file/toggle-standard', (req, res) => {
  const printerCfgPath = '/home/crafter3d/printer_data/config/printer.cfg';

  fs.readFile(printerCfgPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading printer.cfg:', err);
      return res.status(500).json({ error: 'Failed to read printer.cfg' });
    }

    const lines = data.split('\n');
    const newInclude = 'include standard.cfg';
    const targetLine = 'include infinite-z.cfg';

    let updatedContent;

    if (data.includes(targetLine)) {
      updatedContent = data.replace(targetLine, newInclude);
    } else if (!data.includes(newInclude)) {
      // Insert standard include at line 2
      lines.splice(1, 0, newInclude);
      updatedContent = lines.join('\n');
    } else {
      return res.status(400).json({ error: 'No valid mode to switch from' });
    }

    fs.writeFile(printerCfgPath, updatedContent, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing printer.cfg:', writeErr);
        return res.status(500).json({ error: 'Failed to write printer.cfg' });
      }

      res.status(200).json({ message: 'Switched to standard mode' });
    });
  });
});

app.post('/config-file/toggle-infinite-z', (req, res) => {
  const printerCfgPath = '/home/crafter3d/printer_data/config/printer.cfg';

  fs.readFile(printerCfgPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading printer.cfg:', err);
      return res.status(500).json({ error: 'Failed to read printer.cfg' });
    }

    const lines = data.split('\n');
    const newInclude = 'include infinite-z.cfg';
    const targetLine = 'include standard.cfg';

    let updatedContent;

    if (data.includes(targetLine)) {
      updatedContent = data.replace(targetLine, newInclude);
    } else if (!data.includes(newInclude)) {
      // Insert infinite-z include at line 2
      lines.splice(1, 0, newInclude);
      updatedContent = lines.join('\n');
    } else {
      return res.status(400).json({ error: 'No valid mode to switch from' });
    }

    fs.writeFile(printerCfgPath, updatedContent, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing printer.cfg:', writeErr);
        return res.status(500).json({ error: 'Failed to write printer.cfg' });
      }

      res.status(200).json({ message: 'Switched to infinite-z mode' });
    });
  });
});

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

app.post('/wifi/delete-connection', (req, res) => {
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

// getters
app.get('/config-get-file/printer', (req, res) => {
  const filePath = '/home/crafter3d/printer_data/config/printer.cfg';

  fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
      console.error(`Error reading file: ${error.message}`);
      return res.status(500).json({ error: 'Failed to read the configuration file.' });
    }
    res.status(200).json({ content: data });
  });
});

app.get('/config-get-file/standard', (req, res) => {
  const filePath = '/home/crafter3d/printer_data/config/standard.cfg';

  fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
      console.error(`Error reading file: ${error.message}`);
      return res.status(500).json({ error: 'Failed to read the configuration file.' });
    }
    res.status(200).json({ content: data });
  });
});

app.get('/config-get-file/infinite-z>', (req, res) => {
  const filePath = '/home/crafter3d/printer_data/config/infinite-z.cfg';

  fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
      console.error(`Error reading file: ${error.message}`);
      return res.status(500).json({ error: 'Failed to read the configuration file.' });
    }
    res.status(200).json({ content: data });
  });
});

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

app.get('/serial/devices', (req, res) => {
  const listCommand = 'ls -l /dev/serial/by-id/*';
  exec(listCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || error.message });
    }

    // Process the output to extract meaningful information
    const devices = stdout
      .trim()
      .split('\n') // Split into lines
      .filter(line => line.includes('/dev/serial/by-id/')) // Keep only relevant lines
      .map(line => {
        const [permissions, links, owner, group, size, month, day, time, ...rest] = line.split(/\s+/);
        const link = rest.join(' ');
        return { device: link.split(' -> ')[0], path: link.split(' -> ')[1] };
      });

    res.status(200).json({ devices });
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
