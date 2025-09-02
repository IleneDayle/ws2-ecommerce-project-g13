const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');

app.use('/', indexRoute);
app.use('/users', usersRoute);

// MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        // Select database
        const database = client.db("ecommerceDB");

        // Temporary test route
        app.get('/', (req, res) => {
        res.send("Hello, MongoDB is connected!");
        });

        // Start server
        app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        });

    } catch (err) {
        console.error("MongoDB connection failed", err);
        }
    }

    main();