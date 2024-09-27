import { createServer } from 'https';
import { readFileSync } from 'fs';
import express, { json, urlencoded } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'express-openid-connect';
const { auth, requiresAuth } = pkg;
import * as service from './service.js';
import * as dotenv from 'dotenv';
import multer from 'multer';
import * as crypto from 'crypto';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 3000;

const config = { 
    authRequired : false,
    idpLogout : true,
    secret: process.env.SECRET,
    baseURL: externalUrl || `https://localhost:${port}`,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: 'https://web2-fer.eu.auth0.com',
    clientSecret: process.env.CLIENT_SECRET,
    authorizationParams: {response_type: 'code'}
  };

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads/');
    },
    filename: (req, file, cb) => {
        const fileType = file.mimetype.split('/');
        cb(null, `${crypto.randomBytes(16).toString('hex')}.${fileType[1]}`);
    }
});
const fileFilter = (req, file, cb) => {
    const fileType = file.mimetype.split('/');
    if (fileType[0] === 'image' && ['jpg', 'jpeg', 'png'].includes(fileType[1])) cb(null, true);
    else cb(null, false);
};
const upload = multer({'storage': fileStorage, 'fileFilter': fileFilter});

const app = express();

app.set('views', path.join(__dirname, 'public', 'views'));
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json({limit: '50mb'}));
app.use(urlencoded({limit: '50mb', extended : true}));
app.use(auth(config));

app.get('/', requiresAuth(), async (req,res) => {
    const user = req.oidc.user;
    let userExists = await service.userExistsInDB(user);
    if(!userExists) {
        if (user.name !== undefined) await service.saveNewUser(req.oidc.user);
        else await service.saveNewUser(user.sub);
    }
    res.render('index', {'name': user.name});
});

app.get('/gallery', requiresAuth(), async (req, res) => {
    const user = req.oidc.user;
    const fetchedUser = await service.getUserFromDB(user);
    if (fetchedUser !== undefined) { 
        const images = await service.getImages(fetchedUser['user_id']);
        if (images !== undefined) {
            res.render('gallery', {'name': user.name, 'images': images, 'userId': fetchedUser['user_id']});
        }
        else res.render('gallery', {'name': user.name});
    } else res.redirect('/');
});

app.post('/upload', requiresAuth(), upload.array('picture'), async (req, res) => {
    const user = req.oidc.user;
    const fetchedUser = await service.getUserFromDB(user);
    if (fetchedUser !== undefined) 
        for (let file of req.files) await service.saveImageMetadata(file, fetchedUser['user_id']);
    res.redirect('/');
});

app.post('/save', requiresAuth(), async (req, res) => {
    const user = req.oidc.user;
    const fetchedUser = await service.getUserFromDB(user);
    if (fetchedUser !== undefined && req.body.photo !== undefined) await service.saveImageURI(req.body.photo, fetchedUser['user_id']);
    res.redirect('/');
});

app.post('/delete', requiresAuth(), async (req, res) => {
    const userId = req.body.userId;
    const filename = req.body.imageFilename;
    await service.deleteImage(userId, filename);
    res.redirect('/gallery');
});

app.get('*', (req,res) => {
    res.redirect('/');
});

if (externalUrl) {
    const hostname = '0.0.0.0';
    app.listen(port, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${port}/ and from
    outside on ${externalUrl}`);
    });
} else {
    createServer({
        key: readFileSync('localhost-key.pem'),
        cert: readFileSync('localhost.pem')
      }, app)
      .listen(port, function () {
        console.log(`Server running at https://localhost:${port}/`);
      });  
}
