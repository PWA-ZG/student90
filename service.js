import pkg from 'pg';
const {Pool} = pkg;
import * as dotenv from 'dotenv';
import { unlinkSync, writeFileSync }  from 'fs';
import * as crypto from 'crypto';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: 5432,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: true
});

export async function userExistsInDB(user){
    let booleanResult = false;
    if (user === undefined) return booleanResult;
    try {
        const client = await pool.connect();
        const result = (await client.query('SELECT * FROM users WHERE username = $1 AND sub = $2;', [user.name, user.sub])).rows;
        client.release();
        if (result !== undefined && result.length > 0) booleanResult = true;
        return booleanResult;
    } catch (error) { console.log(error); return false; }
}

export async function getUserFromDB(user) {
    if (user === undefined) return undefined;
    try {
        const client = await pool.connect();
        const result = (await client.query('SELECT * FROM users WHERE username = $1 AND sub = $2;', [user.name, user.sub])).rows[0];
        client.release();
        return result;
    } catch(error) { console.log(error); return undefined; }
}

export async function saveNewUser(user) {
    if (user === undefined) return false;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE username = $1 AND sub = $2;', [user.name, user.sub]);
        if (result.rows.length === 0) await client.query('INSERT INTO users(username,sub) VALUES ($1,$2);', [user.name, user.sub]);
        client.release();
        return true;
    } 
    catch (error) { console.log(error); return false;} 
}

export async function saveImageMetadata(image, userId) {
    if (image === undefined || userId === undefined) return false;
    try {
        const client = await pool.connect();
        await client.query(`
        INSERT INTO images(filename, user_id) 
        VALUES ($1,$2);
        `, [image.filename, userId]);
        client.release();
        return true;
    } catch(error) {console.log(error); return false; }
}

export async function getImages(userId) {
    if (userId === undefined) return undefined;
    try {
        const client = await pool.connect();
        const result = (await client.query('SELECT * from images WHERE user_id = $1;', [userId])).rows;
        client.release();
        return result;
    } catch(error) {console.log(error); return undefined;}
}

export async function deleteImage(userId, filename) {
    if (userId === undefined || filename === undefined) return false;
    try {
        unlinkSync(`./public/uploads/${filename}`);
        const client = await pool.connect();
        await client.query('DELETE FROM images WHERE user_id = $1 AND filename = $2;', [userId, filename]);
        client.release();
        return true;
    } catch(error) { console.log(error); return false; }
}

export async function saveImageURI(dataURI, userId) {
    if (dataURI === undefined || userId === undefined) return false;
    const fileType = dataURI.split(';')[0].split('/')[0].split(':')[1];
    const imageType = dataURI.split(';')[0].split('/')[1];
    if(fileType !== 'image' || !['jpg', 'jpeg', 'png'].includes(imageType)) return false;
    const filename = `${crypto.randomBytes(16).toString('hex')}.${imageType}`;
    writeFileSync('./public/uploads/' + filename, Buffer.from(dataURI.split(',')[1], 'base64'));
    try {
        const client = await pool.connect();
        await client.query(`
        INSERT INTO images(filename, user_id) 
        VALUES ($1,$2);
        `, [filename, userId]);
        client.release();
        return true;
    } catch(error) {console.log(error); return false; }
}