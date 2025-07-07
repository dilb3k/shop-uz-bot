require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT;
const PORT = process.env.PORT || 5000;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// In-memory storage for demo purposes (use a database in production)
const userData = new Map(); // chatId -> {phone, otp}
const phoneToChatId = new Map(); // phone -> chatId

// Generate random 4-digit OTP

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Set up Express server
app.use(bodyParser.json());

// Endpoint to request OTP
app.post('/request-otp', (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    // Check if we have a chatId for this phone
    const chatId = phoneToChatId.get(phone);

    if (!chatId) {
        return res.status(400).json({
            success: false,
            error: "Please start the bot and provide your phone number first"
        });
    }

    // Generate and store OTP
    const otp = generateOTP();
    userData.set(chatId, { phone, otp });

    // Send OTP via Telegram
    bot.sendMessage(chatId, `Your verification code is: ${otp}`);

    res.json({ success: true });
});

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }

    const chatId = phoneToChatId.get(phone);

    if (!chatId || !userData.has(chatId)) {
        return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    const user = userData.get(chatId);

    if (user.otp === otp) {
        userData.delete(chatId); // Clear OTP after successful verification
        return res.json({ success: true });
    } else {
        return res.json({ success: false, error: "Invalid OTP" });
    }
});

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        'Welcome! Please share your phone number using the button below to register.',
        {
            reply_markup: {
                keyboard: [[{
                    text: 'Share Phone Number',
                    request_contact: true
                }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        }
    );
});

// Handle phone number sharing
bot.on('contact', (msg) => {
    const chatId = msg.chat.id;
    const phone = msg.contact.phone_number;

    if (!phone) {
        return bot.sendMessage(chatId, 'Please share a valid phone number.');
    }

    // Store the phone number and chatId
    phoneToChatId.set(phone, chatId);
    userData.set(chatId, { phone });

    bot.sendMessage(
        chatId,
        `Thank you! Your phone number ${phone} has been registered. You can now proceed with OTP verification on the website.`,
        { reply_markup: { remove_keyboard: true } }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Bot is listening...`);
});
