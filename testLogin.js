// test-rate-limit.js
// Simple script to test if your rate limiter is working.
// Run with: node test-rate-limit.js
 
const URL = "http://localhost:3333/api/process/1"; // change to your actual login route
const TOTAL_REQUESTS = 300; // send more than your configured limit
 
async function testRateLimit() {
  console.log(`Sending ${TOTAL_REQUESTS} requests to ${URL}...\n`);
 
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    try {
      const response = await fetch(URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // body: JSON.stringify({
        //   email: "victoreduardomartins3@gmail.com",
        //   password: "123",
        // }),
      });
 
      console.log(`Request ${i}: status ${response.status}`);
 
      if (response.status === 429) {
        console.log("  -> Rate limit triggered!");
        return
      }
    } catch (err) {
      console.error(`Request ${i} failed:`, err.message);
    }
  }
}
 
testRateLimit();