require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(cors()); // ✅ CORS ochiq

// 🔹 Xotira uchun Map obyektlari
const userStore = new Map(); // phone => chatId
const otps = new Map();      // phone => otp

// 🔹 Telegram botni ishga tushurish
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN topilmadi');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// 🔸 /start komandasi
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            keyboard: [[{ text: "📲 Telefon raqamni yuborish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    };
    bot.sendMessage(chatId, "📱 Telefon raqamingizni yuboring:", opts);
});

// 🔸 Telefon raqamni qabul qilish
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.contact && msg.contact.phone_number) {
        let phone = msg.contact.phone_number;
        if (!phone.startsWith('+')) {
            phone = '+998' + phone.slice(-9); // Faqat O‘zbek raqamlar uchun
        }

        const digits = phone.replace(/\D/g, '');
        const formattedPhone = `+${digits}`;

        userStore.set(formattedPhone, chatId);

        bot.sendMessage(chatId, `✅ Raqamingiz (${formattedPhone}) saqlandi!`);
        console.log(`✔️ [${new Date().toLocaleTimeString()}] Saqlandi: ${formattedPhone} => ${chatId}`);
    } else if (msg.text) {
        console.log(`📩 [${new Date().toLocaleTimeString()}] Xabar: ${msg.text}`);
    }
});

// 🔹 OTP yuborish
app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    const chatId = userStore.get(phone);

    console.log(`🔔 OTP so‘rovi: ${phone}`);

    if (!chatId) {
        return res.json({ success: false, error: "❌ Bu raqam Telegram botda ro'yxatdan o'tmagan." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(phone, otp);

    // (Ixtiyoriy): Bu yerda timeout o‘rnatib, 5 daqiqada OTP ni o‘chirishni qilishingiz mumkin
    // setTimeout(() => otps.delete(phone), 5 * 60 * 1000);

    try {
        await bot.sendMessage(chatId, `🔐 Sizning OTP kodingiz: *${otp}*`, { parse_mode: "Markdown" });
        console.log(`✅ [${new Date().toLocaleTimeString()}] OTP yuborildi: ${phone} -> ${otp}`);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Telegramga yuborilmadi:", err.message);
        res.json({ success: false, error: "Telegramga yuborilmadi" });
    }
});

// 🔹 OTP tekshirish
app.post('/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    const storedOtp = otps.get(phone);

    console.log(`🔍 OTP tekshirilmoqda: ${phone} -> ${otp} (kutilmoqda: ${storedOtp})`);

    if (storedOtp && storedOtp === otp) {
        otps.delete(phone);
        return res.json({ success: true });
    }

    res.json({ success: false, error: "❌ Noto‘g‘ri OTP kod" });
});

// 🔹 Raqam mavjudligini tekshirish
app.post('/check-user', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Telefon raqam kerak" });

    const formattedPhone = "+" + phone.replace(/\D/g, '');
    console.log(`🔍 Foydalanuvchi tekshirilmoqda: ${formattedPhone}`);

    if (userStore.has(formattedPhone)) {
        return res.json({ exists: true });
    } else {
        return res.status(404).json({ success: false, error: "❌ Bu raqam Telegram botda ro'yxatdan o'tmagan." });
    }
});

// 🔸 Serverni ishga tushurish
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
});
