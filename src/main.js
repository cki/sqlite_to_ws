const dbLib = require('./db');
const http = require('http');
const { parse } = require('querystring');

/**
   Toplevel Function that runs our webserver on table with port.
   Ideal starting point to call from outside.

   @param {database} db - The sqlite3 database
   @param {string} tablename - Name of table we want to query against
   @param {int} port - Port we want to open to serve our requests
*/
module.exports.run = run;
async function run(db, path, tablename, port) {
    return serveContent(db, path, tablename, port);
}

/**
   Function that runs our webserver on table with port
*/
async function serveContent(db, path, tablename, port) {
    const avlColumns = await dbLib.getColumns(db, tablename);
    const requestListener = createRequestListener(avlColumns, path, tablename, db)
    const server = http.createServer(requestListener);
    server.listen(port);
    return server;
}


/**
   Ends a given request and serves error message.
   Assumes we have not already sent data on socket.
   
   @param {string} msg - Error message we want to send.
*/
function fail(msg, resp) {
    resp.writeHead(200, {"Content-Type": "application/json"});
    var json = JSON.stringify({'errorMessage': msg});
    resp.end(json);
}

/**
   Returns the JSON body of a request.
*/
async function getBody(req) {
    return new Promise( (resolve) => {
	let data = '';

	req.on('data', function(chunk) {
	    data += chunk;
	});

	req.on('end', function() {
	    let reqObj = parse(data, null, null, { maxKeys: 20 });
	    resolve(reqObj);
	});
    });
}

/**
   Returns the params object we will supply to the preparedstatement
*/
function getRequestParams(requestedColumns, reqObj) {
    let params = {};
    requestedColumns.forEach(function(column) {
	let str = reqObj[column].split(" ").join("%");
	return params['$'+column] = '%'+str+'%';
    });
    return params;
}


/**
   Answers a given request.

   This functions assumes that the reqObj 
   is already filtered  against malicious input.
*/
async function answer(reqObj, tablename, db, resp) {
    const requestedColumns = Object.keys(reqObj);
    const stmt = await dbLib.getStmtForColumns(db, tablename, requestedColumns);
    const params = getRequestParams(requestedColumns, reqObj);

    let tailRows = false;
    let errMessage = false;
    resp.writeHead(200, {"Content-Type": "application/json"});	

    stmt.each(params, 
	      function answerRow(err, row) {
		  if (errMessage) return;
		  if (err) {
		      console.log('DATABASE ERROR: ',err);
		      errMessage = true;
		  }

		  if (!tailRows) {
		      resp.write("[");
		      tailRows = true;
		      resp.write(JSON.stringify(row));
		      return;
		  }
		  resp.write(",");
		  resp.write(JSON.stringify(row));
	      },
	      function completeAnswer(err, count) {
		  if (err || errMessage) return fail('wrong url', resp);
		  if (count == 0) resp.write("[");
		  resp.end("]");
	      });
}


/**
   Returns closure which serves only requests 
   filtering on columns of table.   

   @param {[string]} avlColumns - Columns we serve requests for
   @param {string} tablename - Name of table we want to query against
   @param {database} db - Database we query against
*/
function createRequestListener(avlColumns, path, tablename, db) {

    // checks if the requested keys are existing column names
    function requestsAvlColumns(requestedColumns)  {
	return requestedColumns.filter(function(requestedColumn) {

	    for (let avlColumn of avlColumns) {
		if (avlColumn === requestedColumn) return true;
	    }
	    return false;
	}).length === requestedColumns.length;
    }

    return async function(req, resp) {
	// filter bad requests
	if (req.url !== path) return fail('wrong url', resp);
	if (req.method !== 'POST') return fail('wrong method', resp);
	
	let reqObj = await getBody(req);
	if (!requestsAvlColumns(Object.keys(reqObj))) 
	    return fail('wrong req', resp);

	// answer request
	answer(reqObj, tablename, db, resp);
    }
}
