import http from 'http';

const TARGET_HOST = 'localhost';
const TARGET_PORT = 3000; 
const PATHS = ['/users', '/posts']; 

function testGetRequest() {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/users',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('\nGET /users');
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${data.slice(0, 200)}...`); 
    });
  });

  req.on('error', err => console.error(`GET Error: ${err.message}`));
  req.end();
}

function testPostRequest() {
  const postData = JSON.stringify({
    title: 'test post',
    body: 'this is a test',
    userId: 1
  });

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: '/posts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('\nPOST /posts');
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data}`);
    });
  });

  req.on('error', err => console.error(`POST Error: ${err.message}`));
  req.write(postData);
  req.end();
}

function runTests() {
  testGetRequest();
  setTimeout(testPostRequest, 500); 
}

runTests();