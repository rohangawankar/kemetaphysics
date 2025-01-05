const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET); // Access the secret key from .env

app.use(cors());
app.use(express.json());

// Endpoint to create a PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents (e.g., 2500 for $25.00)
      currency,
      automatic_payment_methods: { enabled: true }, // Automatically enable relevant methods
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get('/config', (req, res) => {
  res.send({
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    publicDomain: process.env.PUBLIC_DOMAIN,
  });
});

module.exports = app; // Export the app for Vercel
