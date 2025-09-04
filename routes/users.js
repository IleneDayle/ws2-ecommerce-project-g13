// routes/users.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "ecommerceDB";

// Show registration form
router.get('/register', (req, res) => {
res.render('register', { title: "Register" });
});

// Registration (POST)
router.post('/register', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');
        // Check if email already exists
        const existingUser = await usersCollection.findOne({ email:
        req.body.email });
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
    });

//Show all registered users
router.get('/list', async (req, red) =>{
    try {
        await client.connect();
        const db = client.db(dbName);
        const userCollection = db.collection('users');

        const users = await userCollection.find().toArray();

        res.render('users-list',{ title: "Registered Users", users: users});
    } catch (err){
        console.error("Error fetching users:", err);
        res.send("Something went wrong.");
    }
});

// Show edit form
router.get('/edit/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ _id: new
        ObjectId(req.params.id) });
        if (!user) {
        return res.send("User not found.");
        }
        res.render('edit-user', { title: "Edit User", user: user });
    } catch (err) {
        console.error("Error loading user:", err);
        res.send("Something went wrong.");
    }
});

// Handle update form
router.post('/edit/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name: req.body.name, email: req.body.email } }
        );
        res.redirect('/users/list');
    } catch (err) {
        console.error("Error updating user:", err);
        res.send("Something went wrong.");
    }
});

// Delete user
router.post('/delete/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect('/users/list');
    } catch (err) {
        console.error("Error deleting user:", err);
        res.send("Something went wrong.");
    }
});

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

// Dashboard route
    router.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/users/login');
        res.render('dashboard', { title: "User Dashboard", user: req.session.user });
        });
    // Logout
        router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/users/login');
        });

// Admin view
router.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send("Access denied.");
    }
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const users = await db.collection('users').find().toArray();
    res.render('admin', {
    title: "Admin Dashboard",
    users,
    currentUser: req.session.user
        });
    });
    module.exports = router;