const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const saltRounds = 12;

// Registration (POST)
router.post('/register', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');

// Check if email already exists
        const existingUser = await usersCollection.findOne({ email: req.body.email });
        if (existingUser) return res.send("User already exists with this email.");

// Hash password
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const currentDate = new Date();

// Build new user object
        const newUser = {
            userId: uuidv4(),
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            passwordHash: hashedPassword,
            role: 'customer', // default role
            accountStatus: 'active',
            isEmailVerified: false,
            createdAt: currentDate,
            updatedAt: currentDate
        };

// Insert into MongoDB
        await usersCollection.insertOne(newUser);
        res.send(`
        <h2>Registration Successful!</h2>

        <p>User ${newUser.firstName} ${newUser.lastName} registered with ID:

        ${newUser.userId}</p>

        <a href="/users/login">Proceed to Login</a>
        `);

    } catch (err) {
        console.error("Error saving user:", err);
        res.send("Something went wrong.");
    }

// Show login form
    router.get('/login', (req, res) => {
    res.render('login', { title: "Login" });
    });
// Handle login form submission
    router.post('/login', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');

// Find user by email
        const user = await usersCollection.findOne({ email: req.body.email });
            if (!user) return res.send("User not found.");
            // Check if account is active
            if (user.accountStatus !== 'active') return res.send("Account is not active.");

// Compare hashed password
        const isPasswordValid = await bcrypt.compare(req.body.password,
        user.passwordHash);
            if (isPasswordValid) {
        // Store session
                req.session.user = {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
                };
                res.redirect('/users/dashboard');
            } else {
                res.send("Invalid password.");
            }
            } catch (err) {
                console.error("Error during login:", err);
                res.send("Something went wrong.");
            }
            });
});

module.exports = router;