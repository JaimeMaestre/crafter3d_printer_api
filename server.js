const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Route to execute shell commands
app.post('/shell-command', (req, res) => {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:3000`);
});
