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

    it('should correctly identify the fields of a table', function(done) {
	const db = new sqlite3.Database(':memory:');
	db.run("CREATE TABLE cooltable (field1 text,field2 text)", async function() {
	    const fields = await dbLib.getFields(db, 'cooltable');
	    assert.equal(fields[0], 'field1');
	    assert.equal(fields[1], 'field2');
	    done();
	});
    });

    it('should create correct prepared statements for a table', function(done) {
	const db = new sqlite3.Database(':memory:');
	db.run("CREATE TABLE cooltable (field1 text,field2 text)", async function() {
	    const stmts = await dbLib.getStatementsForFields(db, 'cooltable');

	    assert.ok(stmts['field1'] !== null);
	    assert.ok(stmts['field2'] !== null);
	    
	    assert.equal(stmts['field1'].sql, 
			 'select * from cooltable where field1 like ?');
	    assert.equal(stmts['field2'].sql, 
			 'select * from cooltable where field2 like ?');

	    done();
	});
    });


});

