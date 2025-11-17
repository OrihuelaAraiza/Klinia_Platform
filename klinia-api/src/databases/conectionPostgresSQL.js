import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'klinia_db',
    password: 'user', // Tu contraseña personal
    port: 5432,
});


pool.connect((err) => {
    if (err) {
        console.error('Error al conectar con la base de datos local:', err.stack);
    } else {
        console.log('Conectado exitosamente a la base de datos local (klinia_db)');
    }
});


export default pool;