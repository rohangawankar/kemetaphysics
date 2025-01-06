document.addEventListener('DOMContentLoaded', async () => {
    let customerData = {
        firstName: '',
        lastName: '',
        email: '',

    };

    let stripe;
    let elements;

    try {
        // Fetch public configuration from the backend
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) throw new Error('Failed to load configuration');
        const { publicKey, publicDomain } = await configResponse.json();

        stripe = Stripe(publicKey);

        // Fetch PaymentIntent client secret from the backend
        const paymentIntentResponse = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2500, currency: 'usd' }),
        });
        if (!paymentIntentResponse.ok) throw new Error('Failed to create payment intent');
        const { clientSecret } = await paymentIntentResponse.json();

        elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount('#payment-element');
    } catch (error) {
        console.error('Error during initialization:', error.message);
        return;
    }

    document.getElementById('personal-form').addEventListener('submit', (event) => {
        event.preventDefault();

        customerData.firstName = document.getElementById('firstName').value;
        customerData.lastName = document.getElementById('lastName').value;
        customerData.email = document.getElementById('email').value;

        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '66.66%';
    });

    document.getElementById('payment-form').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {},
                redirect: 'if_required',
            });

            if (error) {
                console.error('Payment failed:', error.message);
                document.getElementById('step-3').classList.remove('hidden');
                return;
            }
            // Ensure payment was successful
            if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Update customerData with actual amount from paymentIntent
                customerData.amount = paymentIntent.amount / 100;

                // Send customer data to server-side for ActiveCampaign processing
                await sendToActiveCampaign(customerData);

                document.getElementById('step-2').classList.add('hidden');
                document.getElementById('step-3').classList.remove('hidden');
            } else {
                // Handle other paymentIntent statuses or errors
                console.error('Payment did not succeed:', paymentIntent);
                document.getElementById('step-3').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error during payment submission:', error);
        }
    });

    async function sendToActiveCampaign(data) {
        try {
            // Send customer data to the server for processing
            const response = await fetch('/api/activecampaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                console.error('Failed to send data to ActiveCampaign:', await response.text());
                return;
            }

            console.log('Successfully sent data to ActiveCampaign');
        } catch (error) {
            console.error('Error sending to ActiveCampaign:', error);
        }
    }

    document.getElementById('try-again-button').addEventListener('click', () => {
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
    });
}); 
