// Libraries
const udp = require('dgram')
const path = require('path');
const express = require('express');
const cors = require('cors');
const dbPath = path.resolve(__dirname, '..', 'db', 'udpTest.db')

// Sqlite3
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);

// Express config
const app = express();
app.use(cors());
app.use(express.json());

// Create Service UDP
const server = udp.createSocket('udp4');

// Timer for check errors
var timer = 0

// Error quantity route
app.get('/udptest/errors', (req, res) => {
  db.serialize(async () => {
    await db.all('SELECT * FROM udpTest WHERE success = false', [], (err, rows) => {
      res.json({ errors: rows.length})
    })
  })
})

// Success quantity route
app.get('/udptest/success', (req, res) => {
  db.serialize(async () => {
    await db.all('SELECT * FROM udpTest WHERE success = true', [], (err, rows) => {
      res.json({ success: rows})
    })
  })
})

app.get('/udptest', (req, res) => {
  var udptest = []
  db.serialize(async () => {
    await db.all('SELECT * FROM udpTest', [], (err, rows) => {
      var success = []
      var errors = []
      errors = rows.map(i => i.success == false)
      success = rows.map(i => i.success == true)

      success2 = success.filter(i => i == true)
      errors2 = success.filter(i => i == false)
      
      res.json({
        success: success2.length,
        errors: errors2.length
      })

    })
  })
})

// Route to list all
app.get('/udptest/list', (req, res) => {
  var udptest = []
  db.serialize(async () => {
    await db.all('SELECT * FROM udpTest', [], (err, rows) => {
      udptest.push(rows)
      res.json(udptest)
    })
  })
})

// Route to calculate average
app.get('/udptest/average', (req, res) => {
  db.serialize(async () => {
    await db.all('SELECT * FROM udpTest', [], (err, rows) => {
      var items = []

      items = rows.map(i => i.success == true)

      var success2 = items.filter(i => i == true)
      var errors2 = items.filter(i => i == false)
      
      var sl = success2.length
      var el = errors2.length

      var psl = (sl - el) / sl * 100
      var pel = (el - sl) / el * 100

      res.json({
        averageSuccesses: sl < el ? 100 - pel + '%': psl + '%',
        averageErrors: el < sl ? 100 - psl + '%' : pel + '%'
      })
    })
  })
})

// Server Error
server.on('error', (error) => {
  console.log("udp_server", "error", error)
  server.close()
});

// Server Message
server.on('message', (msg, info) => {
  var messageUdp = String(msg) // message udp
  if(timer >= 2) {
    db.serialize(async () => {
      await db.run('INSERT INTO udpTest(success) VALUES(false)');
      timer = 0
      console
    })
  }

  if(messageUdp === 'yes, i received') {
    db.serialize(async () => {
      await db.run('INSERT INTO udpTest(success) VALUES(true)');
      timer = 0
    })
  }
})

// Server Listening
server.on('listening', () => {
  db.serialize(async () => {
    await db.run('CREATE TABLE IF NOT EXISTS udpTest (success bool)');
  })

  const address = server.address()
  const port = address.port
  const ipAddress = address.address

  console.log("listening port: " + port)
  console.log("ip server: " + ipAddress)

  // sending packages every second
  setInterval(() => {
    server.send('was?', 5009, 'localhost', (err) => err && console.log('error'));
    timer++
  }, 1000)
})

// Server Close
server.on('close', () => {
  console.log('the socket is closed')
})

// Setup server port
server.bind(5009)

// Server Listenig express
app.listen(3339, () => {
  console.log('server starded on port 3339');
});
