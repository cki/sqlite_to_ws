/** Returns columns of given table in database.

    @param {database} db - the sqlite3 database
    @param {string} tablename - the tablename for which we want to get the columns
*/
module.exports.getColumns = getColumns;
async function getColumns(db, tablename) {
    return new Promise( (resolve, reject) => {
	db.all(
	    "SELECT name FROM PRAGMA_TABLE_INFO('" + tablename + "')",
	    function(err, rows) {
		if (err) {
		    return reject();
		}
		resolve(rows.map(function(row) {
		    return row.name;
		}));
	    });
    });
}


/** Returns prepared statement which selects in 
    table of given database using 
    columns for selection.

    Security note: Column needs to be valid. 
    Cross check with getColumns. 
    Otherwise run the danger of SQL injection.

    @param {database} db - the sqlite3 database
    @param {string} tablename - the tablename for which we want to get the columns
    @param {[string]} columns - the columns which are used for filtering
*/
module.exports.getStmtForColumns = getStmtForColumns;
async function getStmtForColumns(db, tablename, columns) {

    const pre = 'select * from '+tablename+' where ';
    let whereClause = '';

    columns.forEach(function(column, idx) {
	whereClause += column + ' like $'+column;
	if (idx + 1 != columns.length) {
	    whereClause += ' and ';
	}
    });

    whereClause += ' limit 100';
    const stmt = await new Promise((resolve) => {
	let stmt = db.prepare(pre + whereClause, null, function() {
	    resolve(stmt);
	});
    });

    return stmt;
}

/**
   Returns prepared statement for.
   Not actually used.

   Security note: Column needs to be valid. 
   Cross check with getColumns. 
   Otherwise run the danger of SQL injection.
*/
module.exports.getStmtForColumn = getStmtForColumn;
async function getStmtForColumn(db, tablename, column) {
    return db.prepare('select * from '+tablename+' where '+column+' like ? limit 100');
}
