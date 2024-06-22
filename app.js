const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', // replace with your MySQL password
    database: 'enquiry_db',
    port: 3308 // specify the port
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database.');
});

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // e.g., 'gmail', 'yahoo', etc.
    auth: {
        user: '', // replace with your email
        pass: ''   // replace with your email password
    }
});

// Serve the form
app.get('/', (req, res) => {
    // res.sendFile(__dirname + '/index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

// Serve the admin login page
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Handle admin login
app.post('/admin-login', (req, res) => {
    const { adminId, password } = req.body;
    // Replace with your admin ID and password
    const admin = { id: 'admin', password: 'admin123' };

    if (adminId === admin.id && password === admin.password) {
        req.session.admin = admin;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid Admin ID or Password' });
    }
});

// Middleware to protect admin routes
function isAdmin(req, res, next) {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/admin');
    }
}

// Serve the admin panel page
app.get('/admin-panel', isAdmin, (req, res) => {
    res.sendFile(__dirname + '/admin-panel.html');
});

// Get all enquiries
app.get('/get-enquiries', isAdmin, (req, res) => {
    const query = 'SELECT * FROM enquiries ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) {
            res.json({ success: false, message: 'Database error: ' + err });
            return;
        }
        res.json({ success: true, enquiries: results });
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid', { path: '/' });
        res.status(204).send(); // No content response
    });
});


// Handle form submission
app.post('/submit-enquiry', (req, res) => {
    const { name, email, mobile , message } = req.body;
    const query = 'INSERT INTO enquiries (name, email, mobile, message) VALUES (?, ?, ?, ?)';

    db.query(query, [name, email, mobile, message], (err, result) => {
        if (err) {
            res.json({ success: false, message: 'Database error: ' + err });
            return;
        }

        // Email options
        const mailOptions = {
            from: 'myproject221228@gmail.com', // replace with your email
            to: 'akashtiwari8808968@gmail.com', // replace with the recipient's email
            subject: 'New Enquiry Received',
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email error: ' + error);
            }
            // Always send success response if data is saved successfully
            res.json({ success: true, message: 'Enquiry submitted successfully!' });
        });
    });
});
// Delete an enquiry
app.post('/delete-enquiry', isAdmin, (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM enquiries WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            res.json({ success: false, message: 'Database error: ' + err });
            return;
        }

        if (result.affectedRows === 0) {
            res.json({ success: false, message: 'Enquiry not found' });
        } else {
            res.json({ success: true, message: 'Enquiry deleted successfully' });
        }
    });
});



app.post('/admin-login', (req, res) => {
    const { adminId, password } = req.body;
    const query = 'SELECT * FROM admins WHERE admin_id = ? AND password = ?';
    
    db.query(query, [adminId, password], (err, results) => {
        if (err) {
            res.json({ success: false, message: 'Database error: ' + err });
            return;
        }
        
        if (results.length > 0) {
            req.session.admin = results[0];
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Invalid Admin ID or Password' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
