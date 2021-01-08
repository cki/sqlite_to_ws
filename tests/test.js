const assert = require('assert');

describe('Webserver', function() {
    const main = require('../src/main');
    const http = require('http');
    const request = require('./http_req');
    const sqlite3 = require('sqlite3').verbose()

    async function getMinimalServer(cb) {
	const db = new sqlite3.Database(':memory:');
	await new Promise( (resolve) => {
	    db.run('CREATE TABLE cooltable (col1 text, col2 text)', resolve);
	});

	await new Promise( (resolve) => {
	    db.run(
		'INSERT INTO cooltable (col1, col2) '+
		    'VALUES '+
		    '("xxx", "yyy"),'+
		    '("hello", "world"),'+
		    '("hello foo", "world bar"),'+
		    '("foo hello","bar world")', resolve);
	});
	const server = await main.run(db, '/', 'cooltable', 8000);
	cb(server);
    }

    it('should drop requests for http path we don\'t serve', function(done) {
	const db = new sqlite3.Database(':memory:');
	main
	    .run(db, '/goodpathpath', 'cooltable', 8000)
	    .then(function(server) {
    		request({'abla':1}, 'localhost', '/badpath', 8000, function(data) {
    		    assert.ok(data.length > 0);
    		    data = JSON.parse(data)
    		    assert.ok(data.errorMessage !== null);
		    assert.equal(data.errorMessage, 'wrong url');
		    server.close();
		    done();
		});
	    });
    });

    it('should drop requests for non existing columns in table', function(done) {
    	getMinimalServer(function(server) {
    	    let reqObject = {'f__': 'hello'};
    	    request(reqObject, 'localhost', '/', 8000, function(data) {
    		assert.ok(data.length > 0);
    		data = JSON.parse(data)
    		assert.ok(data.errorMessage !== null);
    		assert.equal(data.errorMessage, 'wrong req');

    		server.close();
    		done();
    	    });
    	});
    });

    it('should answer requests for existing columns in table', function(done) {
    	getMinimalServer(function(server) {
    	    let reqObject = {'col1': 'xxx'};
    	    request(reqObject, 'localhost', '/', 8000, function(data) {
    		assert.ok(data.length > 0);
    		data = JSON.parse(data)
    		assert.ok(data.errorMessage == null);
    		assert.equal(data.length, 1);
    		assert.deepEqual(data, [{'col1': 'xxx', 'col2': 'yyy'}]);
    		server.close();
    		done();
    	    });
    	});
    });

    it('should answer requests for existing columns in table', function(done) {
    	getMinimalServer(function(server) {
    	    let reqObject = {'col1': 'hello', 'col2': 'bar'};
    	    request(reqObject, 'localhost', '/', 8000, function(data) {
    		assert.ok(data.length > 0);
    		data = JSON.parse(data);
    		assert.ok(data.errorMessage == null);

    		assert.deepEqual(data,
    				 [
    				     {'col1': 'hello foo', 'col2': 'world bar'},
    				     {'col1': 'foo hello', 'col2': 'bar world'}
    				 ]);
    		server.close();
    		done();
    	    });
    	});
    });

    it('should drop requests for a mix '+
       'of existing / non existing fields in table', function(done) {
    	   getMinimalServer(function(server) {
    	       let reqObject = {'col1': 'hello', 'fieldnonexisting': 'bar'};
    	       request(reqObject, 'localhost', '/', 8000, function(data) {
    		   assert.ok(data.length > 0);
    		   data = JSON.parse(data)
    		   assert.ok(data.errorMessage !== null);
    		   assert.equal(data.errorMessage, 'wrong req');

    		   server.close();
    		   done();
    	       });
    	   });
       });

    it('should not answer requests containing basic SQL injections '+
       'of existing / non existing fields in table', function(done) {
    	   getMinimalServer(function(server) {
    	       let reqObject = {'col1': '\' OR col2 = "yyy"'};
    	       request(reqObject, 'localhost', '/', 8000, function(data) {
    		   assert.ok(data.length > 0);
    		   data = JSON.parse(data)
    		   assert.equal(data.length, 0);

    		   server.close();
    		   done();
    	       });
    	   });
       });

})

describe('Database library', function() {
    const dbLib = require('../src/db');
    const sqlite3 = require('sqlite3').verbose();

    it('should identify the columns of a table', function(done) {
	const db = new sqlite3.Database(':memory:');
	db.run("CREATE TABLE cooltable (col1 text,col2 text)", async function() {
	    const fields = await dbLib.getColumns(db, 'cooltable');
	    assert.equal(fields[0], 'col1');
	    assert.equal(fields[1], 'col2');
	    done();
	});
    });

    it('should create prepared statement for a column', function(done) {
	const db = new sqlite3.Database(':memory:');
	db.run("CREATE TABLE cooltable (col1 text,col2 text)", async function() {
	    const col1stmt = await dbLib.getStmtForColumn(db, 'cooltable', 'col1');
	    const col2stmt = await dbLib.getStmtForColumn(db, 'cooltable', 'col2');

	    assert.equal(col1stmt.sql, 
                         'select * from cooltable where col1 like ? limit 100');
	    assert.equal(col2stmt.sql, 
                         'select * from cooltable where col2 like ? limit 100');
	    done();
	});
    });

    it('should create prepared statement for multiple columns', async function() {
	const db = new sqlite3.Database(':memory:');

	await new Promise( (resolve) => {
	    db.run("CREATE TABLE cooltable (col1 text,col2 text)", resolve);
	});

	const colsstmt = await dbLib.getStmtForColumns(db, 
						       'cooltable', 
						       ['col1','col2']);

	assert.equal(colsstmt.sql, 
                     'select * from cooltable '+ 
	    	     'where col1 like $col1 and col2 like $col2 limit 100');
    });
});

