import mysql from 'mysql2/promise';

export async function connect(): Promise<mysql.Connection> {
    return mysql.createConnection({
        host: process.env.MY_SQL_HOST,
        port: Number(process.env.MY_SQL_PORT), // Converte a porta para número
        user: process.env.MY_SQL_USER,
        password: process.env.MY_SQL_PASSWORD,
        database: process.env.MY_SQL_DATABASE
    });
}