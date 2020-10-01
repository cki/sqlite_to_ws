const assert = require('assert');

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
