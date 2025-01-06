import { config } from 'dotenv';
config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    try {
        const { amount, currency, customerData } = req.body;

        // Step 1: Create a Customer
        const customer = await stripe.customers.create({
            name: `${customerData.firstName} ${customerData.lastName}`,
            email: customerData.email,
            metadata: {
                firstName: customerData.firstName,
                lastName: customerData.lastName,
            },
        });

        // Step 2: Create a PaymentIntent and associate the Customer
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            customer: customer.id, // Associate the Customer with the PaymentIntent
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                email: customerData.email,
            },
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create PaymentIntent or Customer' });
    }
}
