const config = require('./config.json');
const pkg = require('./package.json');
console.log(`${pkg.name} | v${pkg.version}`);
console.log(`Author: ${pkg.author.name} (${pkg.author.url})`);
console.log(" ");

console.log("[!] Initialization [rebirthdb-js]")
const r = require('rebirthdb-js')({
    pool: false,
    cursor: false
});

console.log("[!] Connection [rebirthdb-js] | WAIT");
r.connect(config.rethinkdb)
    .then((connection) => {
        connection.on('error', (err) => {
            console.error("[!] Connection [rebirthdb-js] | ERROR");
            console.error(err.stack);
            return process.exit();
        });

        global.conn = connection;
        console.log("[!] Initialization [mysql]")
        const con = require('mysql')
            .createConnection(config.mysql);

        console.log("[!] Connection [mysql] | WAIT");
        con.connect((err) => {
            if(err) {
                console.error("[!] Connection [mysql] | ERROR");
                console.error(err.stack);
                return process.exit();
            }

            console.log("[!] We are ready!");
            console.log("");
            console.log(`[!] RethinkDB Database: ${config.rethinkdb.db}`);
            console.log(`[!] MySQL Database: ${config.mysql.database}`);
            console.log("");
            console.log("[!] Starting...");

            con.query("SHOW TABLES", (err, tables) => {
                if(err) throw err;
                
                let columnName = `Tables_in_${config.mysql.database}`;
                for (let table of tables) {
                    con.query(`SELECT * FROM ${table[columnName]}`, (err, data) => {
                        if(err) throw err;
                        r.table(table[columnName])
                            .insert(data)
                            .run(global.conn)
                                .error((err) => {
                                    console.error("[!] Requesting data [rebirthdb-js] | ERROR");
                                    console.error(
                                        err.message.includes("does not exist in:")
                                            ? err.message
                                            : err.stack
                                    );
                                    
                                    return process.exit();
                                });
                    });
                }

                console.info("[!] Ok, we transfered all data from MySQL to RethinkDB. Now, please check all your tables in RethinkDB.");
            });
        });
    });