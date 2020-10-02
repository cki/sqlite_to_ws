const assert = require('assert');

describe('Webserver', function() {
    const main = require('../src/main');
    const http = require('http');
    const request = require('./http_req');
    const sqlite3 = require('sqlite3').verbose()

    async function getMinimalServer(cb) {
	const db = new sqlite3.Database(':memory:');
	await new Promise( (resolve) => {
	    db.run('CREATE TABLE cooltable (field1 text, field2 text)', resolve);
	});

	await new Promise( (resolve) => {
	    db.run(
		'INSERT INTO cooltable (field1, field2) '+
		    'VALUES ("hello", "world")', resolve);
	});
	const server = await main.run(db, 'cooltable', 8000);
	cb(server);
    }

    it('should drop requests for not existsing fields in table', function(done) {
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

    it('should answer requests for existsing fields in table', function(done) {
    	getMinimalServer(function(server) {
    	    let reqObject = {'field1': 'hello'};
    	    request(reqObject, 'localhost', '/', 8000, function(data) {
    		assert.ok(data.length > 0);
    		data = JSON.parse(data)
    		assert.ok(data.errorMessage == null);
		assert.equal(data.length, 1);
		assert.deepEqual(data[0], {'field1': 'hello', 'field2': 'world'});
    		server.close();
    		done();
    	    });
    	});
    });
})

describe('Database library', function() {
    const dbLib = require('../src/db');
    const sqlite3 = require('sqlite3').verbose()

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
                         'select * from cooltable where col1 like ?');
	    assert.equal(col2stmt.sql, 
                         'select * from cooltable where col2 like ?');
	    done();
	});
    });

    it('should create prepared statement for multiple columns', function(done) {
	const db = new sqlite3.Database(':memory:');

	db.run("CREATE TABLE cooltable (col1 text,col2 text)", async function() {
	    const colsstmt = await dbLib.getStmtForColumns(db, 
							   'cooltable', 
							   ['col1','col2']);

	    assert.equal(colsstmt.sql, 
                         'select * from cooltable '+ 
			 'where col1 like $col1 and col2 like $col2');
	    
	    
	    done();
	});
    });


});

