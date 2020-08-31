const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

// Delaying the table query until after the connection is made
pgClient.on('connect', () => {
  pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

// According to Redis docs:
// If we ever have a client that listening or publishing information on redis,
// then we have to create a duplicate connection
const redisPublisher = redisClient.duplicate();

// Express Route Handlers
app.get('./', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * FROM values');
  res.send(values.rows);
});

// Redis library doesn't have Promiss support, that's why we use callbacks
app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;
  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }
  redisClient.hset('values', index, 'Nothing yet!');
  // The message that will be sent to the Worker process:
  redisPublisher.publish('insert', index);
  // Storing the index in Postgres:
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log('Listening...');
});
