const [, , sqlitePath, databasePath, action, value] = process.argv
const sqlite3 = require(sqlitePath)
const database = new sqlite3.Database(databasePath)
database.configure('busyTimeout', 10000)
const key = 'syncloud_backup_test'

const fail = error => {
  console.error(error)
  process.exit(1)
}

if (action === 'set') {
  database.serialize(() => {
    database.run('delete from key_values where key = ?', [key], error => error && fail(error))
    database.run('insert into key_values (key, type, value) values (?, 2, ?)', [key, value], error => {
      if (error) fail(error)
      database.close()
    })
  })
} else {
  database.get('select value from key_values where key = ?', [key], (error, row) => {
    if (error) fail(error)
    console.log(row ? row.value : '')
    database.close()
  })
}
