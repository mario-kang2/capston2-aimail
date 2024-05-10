const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const url = require('url');
const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const { escape } = require('querystring');

const db = new sqlite3.Database("./mail.db");

function createWindow() {
    const win = new BrowserWindow({
        width:1024,
        height:768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    win.loadURL(startUrl);
    win.webContents.openDevTools();
}



app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 핸들러
// 계정 정보 테이블 생성
ipcMain.on('createAccountDatabase', (_) => {
    db.run('CREATE TABLE IF NOT EXISTS mail_account ([id] integer primary key autoincrement, [description] text, [mailHost] text, [mailPort] int, [mailSecurity] text, [mailUsername] text, [mailEmail] text, [mailPassword] text);', err => {});
})

// 계정 정보 테이블 일회성 조회
ipcMain.on('lookupAccountDatabase', (eve) => {
    db.all('SELECT * FROM mail_account', (err, rows) => {
        eve.sender.send('lookupAccountDatabaseReply', rows);
    });
})

// IMAP 유효성 검사
ipcMain.on('validateImap', (eve, args) => {
    const Imap = require('node-imap');
    const imap = new Imap({
        user: args.user,
        password: args.password,
        host: args.host,
        port: args.port,
        tls: args.tls,
    });

    imap.once('ready', () => {
        imap.end();
        eve.sender.send('validateImapReply', true);
    });

    imap.once('error', (err) => {
        imap.end();
        eve.sender.send('validateImapReply', false);
    });

    imap.connect();
})
// POP3 유효성 검사

// SMTP 유효성 검사

// 계정 정보 추가 
ipcMain.on('addAccount', (eve, args) => {
    db.run('INSERT INTO mail_account (description, mailHost, mailPort, mailSecurity, mailUsername, mailEmail, mailPassword) VALUES (?, ?, ?, ?, ?, ?, ?)', [args.description, args.host, args.port, args.security, args.username, args.emailAddress, args.password], err => {
        eve.sender.send('addAccountReply', err);
    });
});

// 메일 목록 조회 (IMAP)
ipcMain.on('getMailList', (eve, args) => {
    const log = require('electron-log');

    const Imap = require('node-imap');
    const inspect = require('util').inspect;
    const imap = new Imap({
        user: args.mailEmail,
        password: args.mailPassword,
        host: args.mailHost,
        port: args.mailPort,
        tls: args.mailSecurity === 'ssl' || args.mailSecurity === 'starttls'
    });

    function openInbox(cb) {
        imap.openBox('INBOX', true, cb);
    }

    // BASE64 to UTF-8 String
    function base64ToBytes(base64str) {
        return decodeURIComponent(atob(base64str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    var mailBox = [];

    imap.once('ready', function() { 
        openInbox(function(err, box) {
            if (err) throw err;
            var f = imap.seq.fetch('1:*', {
                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE BODY)', 'TEXT'],
                struct: true
            });
            f.on('message', function(msg, seqno) {
                var mails = {};
                msg.on('body', function(stream, info) {
                    var buffer = '';
                    stream.on('data', function(chunk) {
                        buffer += chunk.toString('utf8');
                    });
                    stream.once('end', function() {
                        if (info.which !== 'TEXT')
                            mails['header'] = inspect(Imap.parseHeader(buffer));
                        else {
                            var buff = buffer;
                            let regex1 = /\r\n/gi;
                            let regex2 = /\n/gi;
                            buff = buff.replace(regex1, '').replace(regex2, '');
                            //const stringDecoded = base64ToBytes(buff);
                            mails['text'] = buff;
                        }
                           
                    });
                });
                msg.once('attributes', function(attrs) {
                    mails['attributes'] = inspect(attrs, false, 8);
                });
                msg.once('end', function() {
                    mailBox.push(mails);
                });
            });
            f.once('error', function(err) {});
            f.once('end', function() {
                imap.end();
            });
        });
    });
    imap.once('end', function() {
        eve.sender.send('getMailListReply', mailBox);
    })
    imap.connect();
});

// 계정 정보 삭제

