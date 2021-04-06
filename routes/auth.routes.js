const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mailer = require('../email/mailer');

const authConfig = require('../config/auth.json');

const User = require('../models/User');

const router = express.Router();

function tokenGenerator( params = {}) {
    return jwt.sign(params, authConfig.secret, { expiresIn: 43200});
};


router.post('/register', async (req, res) => {

    const { email } = req.body;
    try {

        if(await User.findOne( { email})) return res.status(400).send({ error: 'User already exists'});
        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({ user, token: tokenGenerator({ id: user.id})});

    } catch (error) {
        return res.status(400).send({ error: 'MONGODB creation failed' });
    }

});

router.post('/authentication', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if(!user) return res.status(400).send({ error: 'Check your credentials' });

    if(!await bcrypt.compare(password, user.password)) return res.status(400).send({ error: 'Check your credentials'});

    user.password = undefined;

    const token = jwt.sign({ id: user.id }, authConfig.secret, { expiresIn: 43200 });

    res.send({ user, token: tokenGenerator({ id: user.id})});
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if(!user) return res.status(404).send({ error: 'User not found' });

        const token = crypto.randomBytes(20).toString('hex');

        const now = new Date();
        now.setHours(now.getHours() + 1);

        await User.findByIdAndUpdate(user.id, { 
            '$set': { 
                passwordResetToken: token,
                passwordResetExpiresIn: now,
            }
        });

        mailer.sendMail({
            to: email,
            from: 'programacao-reativa@gmail.com',
            template: 'auth/forgot-password',
            context: { token },
        }, (err) => {
            console.log(err);
            if(err) return res.status(400).send({ error: 'Cannot send forgot password email' });

            return res.send();
        })

    } catch (error) {
        res.status(400).send({ error: 'Error on forgot password'})
    }
});

router.post('/reset-password', async (req, res) => {
    const{ email, token, password } = req.body;

    try {
        const user = await User.findOne({ email })
            .select('+passwordResetToken passwordResetExpires');

    if(!user) return res.status(400).send({ error: 'Token invalid'});

    const now = new Date();

    if(now > user.passwordResetExpires) res.status(400).send({ error: 'Token expired, generate a new one'});

    user.password = password;

    await user.save();

    res.send();

    } catch (error) {
        res.status(400).send({ error:'Cannot reset password' });
    }
})

module.exports = app => app.use('/', router);