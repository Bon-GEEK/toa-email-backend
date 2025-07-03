const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000; // Changed to port 5000

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Serve static files from parent directory

// Rate limiting - prevent spam
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many email submissions from this IP, please try again later.'
  }
});

// Email configuration
const createTransporter = () => {
  console.log('Email config:', {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? '***' : 'NOT SET'
  });
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not found in environment variables');
  }
  
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS  // Your app password
    }
  });
};

// Validate email format
const validateEmail = (email) => {
  return validator.isEmail(email);
};

// Store emails in memory (in production, use a database)
const emailSubscribers = new Map(); // Changed to Map to store additional data

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'TOA Creatives Email Collection API is running on port 5000!' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Subscribe endpoint
app.post('/api/subscribe', emailLimiter, async (req, res) => {
  try {
    const { email, name = 'Anonymous' } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Check if email already exists
    if (emailSubscribers.has(email.toLowerCase())) {
      return res.status(409).json({ 
        success: false, 
        message: 'This email is already subscribed to our newsletter' 
      });
    }

    // Add to subscribers list with metadata
    emailSubscribers.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      name: name,
      subscribedAt: new Date().toISOString(),
      status: 'active'
    });

    // Create email transporter
    const transporter = createTransporter();

    // Email to admin
    const adminEmail = {
      from: 'thetoacreatives@gmail.com',
      to: 'thetoacreatives@gmail.com, great.igbokwe.242981@gmail.com',
      subject: '🎉 New Newsletter Subscription - TOA Creatives',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff1744 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">New Newsletter Subscription!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">TOA Creatives - The Oasis of Awesomeness</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Subscription Details</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subscribed at:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Subscribers:</strong> ${emailSubscribers.size}</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; background: white; border-radius: 10px;">
            <p style="color: #666; margin: 0;">This email was sent from your TOA Creatives website contact form.</p>
          </div>
        </div>
      `
    };

    // Confirmation email to subscriber
    const confirmationEmail = {
      from: 'thetoacreatives@gmail.com',
      to: email,
      subject: '🌟 Welcome to TOA Creatives Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff1744 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to TOA Creatives!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">The Oasis of Awesomeness</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Thank you for subscribing!</h2>
            <p>Hi ${name},</p>
            <p>Welcome to our creative community! You're now part of The Oasis of Awesomeness, where we:</p>
            <ul style="color: #555; line-height: 1.6;">
              <li>🎨 Share the latest design trends and insights</li>
              <li>💡 Provide marketing tips and strategies</li>
              <li>🚀 Showcase our latest projects and case studies</li>
              <li>📈 Offer exclusive business growth resources</li>
            </ul>
            <p>Stay tuned for exciting updates, creative inspiration, and valuable content delivered straight to your inbox!</p>
          </div>
          
          <div style="background: #ffeb3b; padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center;">
            <h3 style="color: #333; margin-top: 0;">Ready to get started?</h3>
            <p style="color: #555; margin-bottom: 20px;">Let's discuss how we can help transform your brand!</p>
            <a href="https://wa.me/2348100876959" style="background: #25D366; color: white; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">💬 Chat with us on WhatsApp</a>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px; color: #666; font-size: 14px;">
            <p>Follow us on social media for daily inspiration!</p>
            <p style="margin: 10px 0;">
              📧 thetoacreatives@gmail.com | 📱 +234 (0) 810 087 6959
            </p>
            <p style="font-size: 12px; color: #999;">
              You're receiving this email because you subscribed to our newsletter at toacreatives.com
            </p>
          </div>
        </div>
      `
    };

    // Send emails
    await Promise.all([
      transporter.sendMail(adminEmail),
      transporter.sendMail(confirmationEmail)
    ]);

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed! Check your email for confirmation.',
      totalSubscribers: emailSubscribers.size
    });

  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process subscription. Please try again later.'
    });
  }
});

// Get subscribers count (for admin)
app.get('/api/subscribers/count', (req, res) => {
  res.json({
    success: true,
    count: emailSubscribers.size
  });
});

// Get all subscribers (for admin - add authentication in production)
app.get('/api/subscribers', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }

  res.json({
    success: true,
    subscribers: Array.from(emailSubscribers.values()),
    count: emailSubscribers.size
  });
});

// Admin dashboard HTML (simple, protected by query param for now)
app.get('/admin', (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).send('<h2>Unauthorized</h2>');
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>TOA Creatives Admin Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 40px; }
      h1 { color: #ff6b35; }
      table { border-collapse: collapse; width: 100%; background: white; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #ffeb3b; color: #333; }
    </style>
  </head>
  <body>
    <h1>TOA Creatives Subscribers</h1>
    <table id="subsTable">
      <thead>
        <tr><th>Email</th><th>Name</th><th>Subscribed At</th><th>Status</th></tr>
      </thead>
      <tbody></tbody>
    </table>
    <script>
      fetch('/api/subscribers', { headers: { 'x-admin-key': '${process.env.ADMIN_KEY}' } })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const tbody = document.querySelector('#subsTable tbody');
            data.subscribers.forEach(sub => {
              const tr = document.createElement('tr');
              tr.innerHTML = '<td>' + sub.email + '</td><td>' + sub.name + '</td><td>' + sub.subscribedAt + '</td><td>' + sub.status + '</td>';
              tbody.appendChild(tr);
            });
          }
        });
    </script>
  </body>
</html>`);
});

// Contact form endpoint
app.post('/api/contact', emailLimiter, async (req, res) => {
  try {
    const { name, email, message, subject = 'New Contact Form Submission' } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Create email transporter
    const transporter = createTransporter();

    // Contact form email
    const contactEmail = {
      from: 'thetoacreatives@gmail.com',
      to: 'thetoacreatives@gmail.com, great.igbokwe.242981@gmail.com',
      subject: `📧 ${subject} - TOA Creatives`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff1744 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">TOA Creatives - The Oasis of Awesomeness</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Contact Details</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px;">
              <p style="margin: 0; line-height: 1.6;">${message}</p>
            </div>
            <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; background: white; border-radius: 10px;">
            <p style="color: #666; margin: 0;">This email was sent from your TOA Creatives website contact form.</p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(contactEmail);

    res.status(200).json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TOA Creatives Email Backend running on port ${PORT}`);
  console.log(`📧 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
}); 