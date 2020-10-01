const querystring = require('querystring');
const http = require('http');

// TODO Write tests for this
module.exports = makeReq;
function makeReq(reqObject, host, path, port, cb) {
    const postData = querystring.stringify(reqObject);

    const options = {
	hostname: host,
	port: port,
	path: path,
	method: 'POST',
	headers: {
	    'Content-Type': 'application/x-www-form-urlencoded',
	    'Content-Length': Buffer.byteLength(postData)
	}
    };

    const req = http.request(options, (res) => {
	res.setEncoding('utf8');
	let data = '';
	res.on('data', (chunk) => {
	    data += chunk;
	});
	res.on('end', () => {
	    cb(data);
	});
    });

    req.on('error', (e) => {
	console.error(`problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}
