const {app, BrowserWindow, ipcMain, shell} = require('electron');
const path = require('path');
const url = require('url');
const sqlite3 = require('sqlite3');
const management = require("./emailmanagement");

const db = new sqlite3.Database("./mail.db");

function createWindow() {
    const win = new BrowserWindow({
        width:1024,
        height:768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true
        }
    });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    win.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    })

    win.loadURL(startUrl);
    win.webContents.openDevTools();

    management.setupDatabase();
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
    db.run('CREATE TABLE IF NOT EXISTS mail_send_account ([id] integer primary key autoincrement, [description] text, [mailHost] text, [mailPort] int, [mailSecurity] text, [mailUsername] text, [mailEmail] text, [mailPassword] text);', err => {});
})

// 계정 정보 테이블 조회
ipcMain.on('lookupAccountDatabase', (eve) => {
    db.all('SELECT * FROM mail_account', (err, rows) => {
        eve.sender.send('lookupAccountDatabaseReply', rows);
    });
})
// 보내는 계정 정보 테이블 조회
ipcMain.on('lookupSendAddressDatabase', (eve) => {
    db.all('SELECT * FROM mail_send_account', (err, rows) => {
        eve.sender.send('lookupSendAccountDatabaseReply', rows);
    })
})
ipcMain.on('lookupContactsDatabase', (eve) => {
    db.all('SELECT * FROM contact', (err, rows) => {
        eve.sender.send('lookupContactsDatabaseReply', rows);
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

// SMTP 유효성 검사
ipcMain.on('validateSmtp', (eve, args) => {
    const Smtp = require('nodemailer');
    const smtp = Smtp.createTransport({
        host: args.host,
        port: args.port,
        secure: args.tls,
        auth: {
            user: args.user,
            pass: args.pass
        }
    });

    smtp.verify(function (err, success) {

        if (err) {
            eve.sender.send('validateSmtpReply', false);
        } else {
            eve.sender.send('validateSmtpReply', true);
        }
    });
})

// 계정 정보 추가 
ipcMain.on('addAccount', (eve, args) => {
    db.run('INSERT INTO mail_account (description, mailHost, mailPort, mailSecurity, mailUsername, mailEmail, mailPassword) VALUES (?, ?, ?, ?, ?, ?, ?)', [args.description, args.host, args.port, args.security, args.username, args.emailAddress, args.password], err => {
        eve.sender.send('addAccountReply', err);
    });
});

// 보내는 계정 정보 추가 
ipcMain.on('addSendAccount', (eve, args) => {
    db.run('INSERT INTO mail_send_account (description,mailHost,mailPort,mailSecurity,mailUsername,mailEmail,mailPassword) VALUES (?, ?, ?, ?, ?, ?, ?)', [args.description, args.host, args.port, args.security, args.username, args.emailAddress, args.password], err => {
        eve.sender.send('addSendAccountReply', err);
    });
});
//연락처 정보 추가
ipcMain.on('addContacts', (eve, args) => {
    console.log("hi")
    db.run('INSERT INTO contact (name, address,phoneNumber) VALUES (?, ?, ?)', [args.name, args.address, args.phoneNumber], err => {
        eve.sender.send('addContactsReply', err);
    });
});
//요약
ipcMain.on('summarizeMail', (eve, args) => {
    const body=args.body;
    const email_id=args.email_id;
    management.summarizebyopenai(body,email_id,eve);
});
// 메일 목록 조회 (IMAP)
ipcMain.on('getMailList', (eve, args) => {
    const Imap = require('node-imap');
    const imap = new Imap({
        user: args.mailEmail,
        password: args.mailPassword,
        host: args.mailHost,
        port: args.mailPort,
        tls: args.mailSecurity === 'ssl' || args.mailSecurity === 'starttls'
    });
    management.fetchNewEmails(imap,eve);
});

// 계정 정보 삭제
ipcMain.on('removeAccount', (eve, args) => {
    db.run('DELETE FROM mail_account WHERE description = ?', [args.description], err => {
        eve.sender.send('removeAccountReply', err);
    })
})

// 보내는 계정 정보 삭제
ipcMain.on('removeSendAccount', (eve, args) => {
    db.run('DELETE FROM mail_send_account WHERE description = ?', [args.description], err => {
        eve.sender.send('removeSendAccountReply', err);
    })
})
ipcMain.on('searchMaillist', (eve, args) => {
    const column=args.searchBy;
    const value=args.query;
    management.searchbytype(column,value, (err, rows) => {
        if (err) {
            console.error('이메일 검색 오류:', err);
        } else {
            const mail=rows.map(({sender,subject,body,times})=>({from:[sender],subject:[subject],body:[body],times:[times]}));
            eve.sender.send('searchMailListReply', mail);
        }
    })
})

// 메일 삭제
ipcMain.on('deleteMail', (eve, args) => {
    const Imap = require('node-imap');
    const imap = new Imap({
        user: args.auth.mailEmail,
        password: args.auth.mailPassword,
        host: args.auth.mailHost,
        port: args.auth.mailPort,
        tls: args.auth.mailSecurity === 'ssl' || args.auth.mailSecurity === 'starttls',
    });
    const uid = args.index[0].toString();
    imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                eve.sender.send('deleteMailReply', false);
            } else {
                imap.addFlags(uid, '\\Deleted', (err) => {
                    if (err) {
                        eve.sender.send('deleteMailReply', false);
                    } else {
                        imap.end();
                        eve.sender.send('deleteMailReply', true);
                    }
                });
            }
        });
    });
    imap.connect();
});

// 메일 전송
ipcMain.on('sendMail', (eve, args) => {

    const log = require('electron-log');
    // 인증 정보 불러오기
    let from = args.from;
    let to = args.to;
    let cc = args.cc;
    let bcc = args.bcc;
    let subject = args.subject;
    let content = args.content;

    db.get('SELECT * FROM mail_send_account WHERE mailEmail = ?', [from], (err, row) => {
        if (row) {
            const Smtp = require('nodemailer');
            const smtp = Smtp.createTransport({
                host: row.mailHost,
                port: row.mailPort,
                secure: row.mailSecurity === 'ssl',
                auth: {
                    user: row.mailEmail,
                    pass: row.mailPassword
                }
            });

            log.info(smtp);

            let mailOptions = {
                from: from,
                to: to,
                cc: cc,
                bcc: bcc,
                subject: subject,
                text: content
            };

            smtp.sendMail(mailOptions, (err, info) => {
                if (err) {
                    log.error(err);
                    eve.sender.send('sendMailReply', false);
                } else {
                    log.info(info);
                    eve.sender.send('sendMailReply', true);
                }
            });
        }
    });
})

ipcMain.on('searchMail', (eve, searchBy,query) => {
    const type=searchBy;
    const value=query;
    management.searchbytype(type,value, (err, rows) => {
        if (err) {
            console.error('이메일 가져오기 오류:', err);
        } else {
            const mail=rows.map(({sender,subject,body,times})=>({from:[sender],subject:[subject],body:[body],times:[times]}));
            eve.sender.send('searchMailReply', mail);
        }
    });
})
// 연락처 데이터 조회
ipcMain.on('lookupContactDatabase', (eve) => {
    db.all('SELECT * FROM contact', (err, rows) => {
        eve.sender.send('lookupContactDatabaseReply', rows);
    });
})

// 연락처 데이터 추가
ipcMain.on('addContact', (eve, args) => {
    db.run('INSERT INTO contact (Name, Address) VALUES (?, ?)', [args.name, args.address], err => {
    });
})

// 연락처 데이터 삭제
ipcMain.on('removeContact', (eve, args) => {
    db.run('DELETE FROM contact WHERE Address = ?', [args.address], err => {
    })
})