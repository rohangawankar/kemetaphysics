document.addEventListener('DOMContentLoaded', async () => {
    let stripe; // Declare `stripe` in a higher scope
    let elements; // Declare `elements` in a higher scope

    try {
        // Fetch configuration from the backend
        const response = await fetch('http://localhost:3000/config'); // Replace with your backend URL
        if (!response.ok) throw new Error('Failed to load configuration');

        const { publicKey, publicDomain } = await response.json();

        // Ensure the values are correctly fetched
        if (!publicKey || !publicDomain) throw new Error('Missing configuration values');

        console.log('Stripe Public Key:', publicKey);
        console.log('Public Domain:', publicDomain);

        // Initialize Stripe with the public key
        stripe = Stripe(publicKey);

        // Fetch the PaymentIntent client secret from the backend
        const { clientSecret } = await fetch(`${publicDomain}/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2500, currency: 'usd' }),
        }).then((res) => res.json());

        // Initialize Stripe Elements with clientSecret
        elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount('#payment-element');
    } catch (error) {
        console.error('Error:', error.message);
        return; // Exit the function to prevent further errors
    }

    // Handle "Continue to Payment" button
    document.getElementById('personal-form').addEventListener('submit', (event) => {
        event.preventDefault();

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
                // Payment Successful: Show confirmation
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
