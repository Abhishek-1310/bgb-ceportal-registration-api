const {
    CognitoIdentityProviderClient,
    SignUpCommand,
    AdminConfirmSignUpCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient();

exports.handler = async (event) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    };

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "CORS preflight handled" }),
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const {
            title,
            firstName,
            lastName,
            email,
            password,
            ['confirm Password']: confirmPassword,
            ['accept Terms']: acceptTerms
        } = body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password || !confirmPassword || !acceptTerms) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: "All fields are required and terms must be accepted." }),
            };
        }

        if (password !== confirmPassword) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Passwords do not match." }),
            };
        }

        if (!acceptTerms) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Terms and conditions must be accepted." }),
            };
        }

        // Construct signup command
        const signUpCommand = new SignUpCommand({
            ClientId: process.env.CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: "email", Value: email },
                { Name: "given_name", Value: firstName },
                { Name: "family_name", Value: lastName },
                { Name: "custom:title", Value: title || "" }
            ]
        });

        const signUpResponse = await client.send(signUpCommand);

        // Automatically confirm user after signup
        const confirmCommand = new AdminConfirmSignUpCommand({
            UserPoolId: process.env.USER_POOL_ID,  // make sure this is set in environment variables
            Username: email,
        });

        await client.send(confirmCommand);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "Registration successful and user confirmed.",
                userSub: signUpResponse.UserSub
            }),
        };
    } catch (err) {
        console.error("SignUp error:", err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
