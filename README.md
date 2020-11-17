# sqlite_to_ws

## Purpose

Turns your SQLite file into a queryable webservice.

All it needs to work is:
* somewhat recent version of node (oldest tested version v10.15.0)
* sqlite3 npm package (npm install after cloning this repo)

What it needs to start:
* a path to an sqlite3 file
* a tablename
* a http path from which requests should be answered
* a port

It uses the existing structural information of the SQL table to create 
prepared statements for the given requested columns and answers requests.

Please note:
It assumes all columns in the table are strings and creates wildcard matches.
(Works with the soon to be released csv_to_sqlite)

## DEMO

### Create DB

#### Create and Insert SQL

```
cat << EOF >> /tmp/create_db.sql

CREATE TABLE books (
	title text,	
	author text
);

INSERT INTO 
	books (title, author) 
VALUES
	('Dracula', 'Bram Stoker'),
	('The Picture of Dorian Gray', 'Oscar Wilde'),
	('The Importance of Being Earnest', 'Oscar Wilde');

EOF
```

#### Create sqlite3 file

```
sqlite3 /tmp/database.db < /tmp/create_db.sql
```

### Run sqlite_to_ws

```
HTTP_PATH="/" PORT="8080" SQLPATH="/tmp/database.db" TABLENAME="books" npm start
```

### Make requests against the webserver

#### search by author
```
curl -d "author=Stoker" -H "Content-Type: application/x-www-form-urlencoded" -X POST http://localhost:8080/
```

Returns

```
[{"title":"Dracula","author":"Bram Stoker"}]
```

#### search by author and title (with use of wildcard)

```
curl -d "author=Wilde&title=Gr" -H "Content-Type: application/x-www-form-urlencoded" -X POST http://localhost:8080/
```

Returns

```
[{"title":"The Picture of Dorian Gray","author":"Oscar Wilde"}]
```

## Lawyerly stuff

This comes without any warranty. Use at your own peril.
