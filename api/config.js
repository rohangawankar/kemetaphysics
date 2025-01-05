// api/config.js
import { config } from 'dotenv';
config();

export default async function handler(req, res) {
    res.status(200).json({
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
        publicDomain: process.env.PUBLIC_DOMAIN,
    });
}