// utils/passwordUtils.js
import * as Crypto from 'expo-crypto';
const APP_INTERNAL_SECRET = "a$bK@9!zQp7yX1mG_wL3fR2hC0jUdE4I5tG6oN8sPq";

export const generateRandomPassword = (length = 12) => {
    const charset =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
};


export const generatePassword = async (username) => {
    if (!username || typeof username !== 'string') {
        throw new Error('Username must be a non-empty string.');
    }

    // Step 1: Clean and standardize the username
    const cleanedUsername = username.trim().toLowerCase();

    // Step 2: Combine with the internal secret in a non-obvious way
    // We'll interleave parts of the username and the secret.
    let scrambledInput = '';
    const usernameLength = cleanedUsername.length;
    const secretLength = APP_INTERNAL_SECRET.length;
    const maxLength = Math.max(usernameLength, secretLength);

    for (let i = 0; i < maxLength; i++) {
        if (i < usernameLength) {
            scrambledInput += cleanedUsername[i];
        }
        if (i < secretLength) {
            scrambledInput += APP_INTERNAL_SECRET[i];
        }
    }

    // Step 3: Add more deterministic manipulation (e.g., reverse a section)
    // This adds another layer of "obscurity" for someone just looking at the output.
    const segmentLength = Math.floor(scrambledInput.length / 3);
    const firstSegment = scrambledInput.substring(0, segmentLength);
    const middleSegment = scrambledInput.substring(segmentLength, scrambledInput.length - segmentLength);
    const lastSegment = scrambledInput.substring(scrambledInput.length - segmentLength);

    // Example rearrangement: first + reversed(middle) + last
    const finalStringForHash = firstSegment + middleSegment.split('').reverse().join('') + lastSegment;

    // Step 4: Perform a strong cryptographic hash (SHA-256)
    // This ensures the output is one-way and cannot be easily reversed.
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        finalStringForHash,
        { encoding: Crypto.CryptoEncoding.HEX }
    );

    return digest;
};
