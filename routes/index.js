// routes/index.js
const express = require('express');
const router = express.Router();

// Home route
router.get('/', (req, res) => {
res.render('index', { title: "Home Page", message: "Hello, MongoDB is connected!" });
});

module.exports = router;