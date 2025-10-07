// Function to verify Cloudflare Turnstile response
async function verifyTurnstile(token, ip) {
const response = await
fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: new URLSearchParams({
secret: process.env.TURNSTILE_SECRET,
response: token,
remoteip: ip
})
});
return response.json();
}

module.exports = verifyTurnstile;