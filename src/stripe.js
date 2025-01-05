document.addEventListener('DOMContentLoaded', async () => {
    // Store form data that we'll need for ActiveCampaign
    let customerData = {
        firstName: '',
        lastName: '',
        email: '',
        amount: 25.00
    };

    let stripe;
    let elements;

    // First, add ActiveCampaign tracking code (this should also be in your HTML head)
    (function(e,t,o,n,p,r,i){e.visitorGlobalObjectAlias=n;e[e.visitorGlobalObjectAlias]=e[e.visitorGlobalObjectAlias]||function(){(e[e.visitorGlobalObjectAlias].q=e[e.visitorGlobalObjectAlias].q||[]).push(arguments)};e[e.visitorGlobalObjectAlias].l=(new Date).getTime();r=t.createElement("script");r.src=o;r.async=true;i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)})(window,document,"https://diffuser-cdn.app-us1.com/diffuser/diffuser.js","vgo");
    vgo('setAccount', '2');
    vgo('setTrackByDefault', true);
    vgo('process');

    try {
        // Fetch configuration from the backend
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to load configuration');

        const { publicKey, publicDomain } = await response.json();
        if (!publicKey || !publicDomain) throw new Error('Missing configuration values');

        console.log('Stripe Public Key:', publicKey);
        console.log('Public Domain:', publicDomain);

        stripe = Stripe(publicKey);

        // Fetch the PaymentIntent client secret from the backend
        const { clientSecret } = await fetch(`/api/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2500, currency: 'usd' }),
        }).then((res) => res.json());

        elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount('#payment-element');
    } catch (error) {
        console.error('Error:', error.message);
        return;
    }

    // Function to send data to ActiveCampaign
    async function sendToActiveCampaign(data) {
        try {
            // First, identify the user with tracking script
            vgo('setEmail', data.email);
            vgo('setFirstName', data.firstName);
            vgo('setLastName', data.lastName);
            
            // Track the purchase event
            vgo('trackEvent', 'Masterclass Purchase', {
                value: data.amount,
                currency: 'USD',
                productName: 'Masterclass'
            });
            // Send to ActiveCampaign API
            const response = await fetch('https://kaedarenterprisesllc.api-us1.com/api/3/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Token': '2c11706ea9256289405f03d9a8daa694b3728199c0619dec5911104fd59edb015607a4a1'
                },
                body: JSON.stringify({
                    contact: {
                        email: data.email,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        fieldValues: [
                            {
                                field: 'PURCHASE_DATE',
                                value: new Date().toISOString()
                            },
                            {
                                field: 'PURCHASE_AMOUNT',
                                value: data.amount
                            }
                        ]
                    }
                })
            });

            if (!response.ok) {
                console.error('ActiveCampaign API error:', await response.text());
                return;
            }

            const result = await response.json();
            await addToList(result.contact.id, '12');
            
            console.log('Successfully sent data to ActiveCampaign');
        } catch (error) {
            // Log but don't throw - we don't want ActiveCampaign failures to affect the user experience
            console.error('Error sending to ActiveCampaign:', error);
        }
    }

    // Helper function to add contact to a list
    async function addToList(contactId, listId) {
        try {
            await fetch('https://kaedarenterprisesllc.api-us1.com/api/3/contactLists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Token': '2c11706ea9256289405f03d9a8daa694b3728199c0619dec5911104fd59edb015607a4a1'
                },
                body: JSON.stringify({
                    contactList: {
                        list: listId,
                        contact: contactId,
                        status: 1
                    }
                })
            });
        } catch (error) {
            console.error('Error adding to list:', error);
        }
    }

    // Handle "Continue to Payment" button
    document.getElementById('personal-form').addEventListener('submit', (event) => {
        event.preventDefault();

        // Store the customer data for later use with ActiveCampaign
        customerData.firstName = document.getElementById('firstName').value;
        customerData.lastName = document.getElementById('lastName').value;
        customerData.email = document.getElementById('email').value;

        // Transition to Payment Step
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '66.66%';
    });

    // Handle Payment Submission
    document.getElementById('payment-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {},
                redirect: 'if_required',
            });

            if (error) {
                // Payment Failed: Show error message
                document.getElementById('step-2').classList.add('hidden');
                document.getElementById('step-3').classList.remove('hidden');

                // Show error-related content
                document.getElementById('error-icon').classList.remove('hidden');
                document.getElementById('error-message-header').classList.remove('hidden');
                document.getElementById('error-description').classList.remove('hidden');
                document.getElementById('try-again-button').classList.remove('hidden');
            } else {
                // Payment Successful: Send data to ActiveCampaign before showing confirmation
                await sendToActiveCampaign(customerData);

                // Show success UI
                document.getElementById('step-2').classList.add('hidden');
                document.getElementById('step-3').classList.remove('hidden');

                // Show success-related content
                document.getElementById('success-icon').classList.remove('hidden');
                document.getElementById('success-message').classList.remove('hidden');
                document.getElementById('success-description').classList.remove('hidden');
                document.getElementById('progress-bar').style.width = '100%';
            }
        } catch (err) {
            console.error('Error during payment:', err);
            document.getElementById('error-message').textContent = 'An error occurred. Please try again.';
        }
    });

    // Handle "Try Again" button
    document.getElementById('try-again-button').addEventListener('click', () => {
        // Reset the error message and transition back to the payment screen
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '66.66%';

        // Hide error-related content
        document.getElementById('error-icon').classList.add('hidden');
        document.getElementById('error-message-header').classList.add('hidden');
        document.getElementById('error-description').classList.add('hidden');
        document.getElementById('try-again-button').classList.add('hidden');
    });
});