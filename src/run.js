const main = require('./main');

// check if required ENV variables are present
['HTTP_PATH', 'PORT','SQLPATH', 'TABLENAME'].forEach(function(varname) {
    if (process.env[varname] == null || process.env[varname].length === 0) {
	throw new Error('Please supply '+varname+' variable');
    }
});

const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database(process.env.SQLPATH);
main.run(db, process.env.HTTP_PATH, process.env.TABLENAME, process.env.PORT);
