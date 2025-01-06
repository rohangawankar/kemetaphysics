import { config } from 'dotenv';

config();

const activeCampaignApiToken = process.env.ACTIVE_CAMPAIGN_API_TOKEN;
const activeCampaignAccountName = process.env.ACTIVE_CAMPAIGN_ACCOUNT_ID;
const activeCampaignApiUrl = `https://${activeCampaignAccountName}.api-us1.com`;
const targetListId = process.env.ACTIVE_CAMPAIGN_TARGET_LIST_ID;
const actid = process.env.ACTIVE_CAMPAIGN_ACCOUNT_ID;
const eventKey = process.env.ACTIVE_CAMPAIGN_EVENT_KEY;

export default async function handler(req, res) {
    console.log('Request received:', req.method, req.url);
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { firstName, lastName, email, amount, productName } = req.body; // Add productName
    console.log('Request body:', req.body);

    if (!firstName || !lastName || !email || !amount || !productName) { // Add productName validation
        res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, amount, or productName' });
        return;
    }

    try {
        // Dynamically import node-fetch
        const fetch = (await import('node-fetch')).default;

        // Step 1: Sync/Create the contact
        const contactPayload = {
            contact: {
                email,
                firstName,
                lastName,
                fieldValues: [
                    {
                        field: 'PURCHASE_AMOUNT', // Use the personalization tag in uppercase
                        value: amount,
                    },
                ],
                tags: [productName], // Add the product name as a tag
            },
        };

        console.log('Contact Payload:', contactPayload);

        const contactResponse = await fetch(`${activeCampaignApiUrl}/api/3/contact/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Token': activeCampaignApiToken,
            },
            body: JSON.stringify(contactPayload),
        });

        console.log('Contact API Response Status:', contactResponse.status);

        if (!contactResponse.ok) {
            const errorText = await contactResponse.text();
            console.error('Contact API Error:', errorText);
            res.status(contactResponse.status).json({ error: errorText });
            return;
        }

        const contactData = await contactResponse.json();
        console.log('Contact API Response Data:', contactData);
        const contactId = contactData.contact.id;

        // Step 2: Add the contact to the specified list
        const listPayload = {
            contactList: {
                list: targetListId,
                contact: contactId,
                status: 1, // 1 = Subscribe
            },
        };

        console.log('List Payload:', listPayload);

        const listResponse = await fetch(`${activeCampaignApiUrl}/api/3/contactLists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Token': activeCampaignApiToken,
            },
            body: JSON.stringify(listPayload),
        });

        console.log('List API Response Status:', listResponse.status);

        if (!listResponse.ok) {
            const errorText = await listResponse.text();
            console.error('List API Error:', errorText);
            res.status(listResponse.status).json({ error: errorText });
            return;
        }
        const listData = await listResponse.json();
        console.log('List API Response Data:', listData);

        res.json({
            message: 'Contact successfully synced, added to list', 
            contactData,
        });

    } catch (error) {
        console.error('General Error:', error);
        res.status(500).json({ error: error.message });
    }
}